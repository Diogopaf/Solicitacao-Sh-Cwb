import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar as CalendarIcon, List, Plus, Clock, MapPin, User, History, X, Edit, Trash2, ChevronLeft, ChevronRight, Filter, Info } from 'lucide-react';

interface AgendaProps {
  onVoltar: () => void;
}

export default function AgendaLiturgia({ onVoltar }: AgendaProps) {
  const { userData } = useAuth();
  const [eventos, setEventos] = useState<any[]>([]);
  const [sacerdotes, setSacerdotes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // Controle de Abas
  const [abaAtiva, setAbaAtiva] = useState<'calendario' | 'lista'>('calendario');

  // Filtros da Lista
  const [filtroProximas, setFiltroProximas] = useState(true);
  const [filtroSemSacerdote, setFiltroSemSacerdote] = useState(false);

  // Navegação do Calendário
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());

  // Controle do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<any | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Campos do Formulário do Modal
  const [formData, setFormData] = useState({ data: '', horario: '', sacerdote: '', local: '' });

  const isGestor = userData?.nivel === 'admin' || userData?.nivel === 'super_admin';

  // Monitora em tempo real qual padre foi selecionado no formulário para exibir a escala dele
  const sacerdoteSelecionadoObj = sacerdotes.find(s => s.nome === formData.sacerdote);

  const carregarDadosIniciais = async () => {
    setLoading(true);
    try {
      // 1. Busca todas as missas da agenda
      const qEventos = query(collection(db, "agenda_liturgia"));
      const snapEventos = await getDocs(qEventos);
      const docsEventos = snapEventos.docs.map(d => ({ id: d.id, ...d.data() }));
      docsEventos.sort((a: any, b: any) => new Date(`${a.data}T${a.horario || '00:00'}`).getTime() - new Date(`${b.data}T${b.horario || '00:00'}`).getTime());
      setEventos(docsEventos);

      // 2. Puxa do banco todos os usuários aprovados do sistema
      const qUsers = query(collection(db, "usuarios"), where("aprovado", "==", true));
      const snapUsers = await getDocs(qUsers);
      
      // Filtra na memória quem possui a credencial 'Sacerdote' ou 'Padre' no perfil
      const listaPadres = snapUsers.docs
        .map(d => ({ uid: d.id, ...d.data() } as any))
        .filter(u => {
          const creds = u.credenciais || [];
          return creds.includes('Sacerdote') || creds.includes('Padre');
        });
        
      setSacerdotes(listaPadres);

    } catch (error) {
      console.error("Erro ao carregar dados da agenda litúrgica:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // ====== FUNÇÕES DO CRUD ======
  const salvarEvento = async () => {
    if (!isGestor) return alert("Sem permissão para edição.");
    if (!formData.data || !formData.horario || !formData.local) {
      return alert("Preencha Data, Horário e Local.");
    }

    try {
      const dataIsoAtual = new Date().toISOString();
      const novoLog = {
        acao: eventoSelecionado ? 'Editado' : 'Criado',
        porNome: userData?.nome,
        data: dataIsoAtual,
        detalhes: `Sacerdote: ${formData.sacerdote || 'Pendente'} | Horário: ${formData.horario} | Local: ${formData.local}`
      };

      if (eventoSelecionado) {
        const historicoAtualizado = [...(eventoSelecionado.historico || []), novoLog];
        await updateDoc(doc(db, "agenda_liturgia", eventoSelecionado.id), {
          ...formData,
          historico: historicoAtualizado
        });
      } else {
        await addDoc(collection(db, "agenda_liturgia"), {
          ...formData,
          criadoPor: userData?.nome,
          dataCriacao: dataIsoAtual,
          historico: [novoLog]
        });
      }
      
      fecharModal();
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o evento.");
    }
  };

  const excluirEvento = async (id: string) => {
    if (!isGestor) return alert("Sem permissão para exclusão.");
    if (!window.confirm("Deseja realmente excluir esta missa da agenda?")) return;
    try {
      await deleteDoc(doc(db, "agenda_liturgia", id));
      fecharModal();
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const abrirModalNovo = (dataPreSelecionada = '') => {
    if (!isGestor) return;
    setEventoSelecionado(null);
    setModoEdicao(true);
    setFormData({ data: dataPreSelecionada, horario: '', sacerdote: '', local: '' });
    setModalAberto(true);
  };

  const abrirModalDetalhes = (evento: any) => {
    setEventoSelecionado(evento);
    setModoEdicao(false);
    setFormData({ data: evento.data, horario: evento.horario, sacerdote: evento.sacerdote || '', local: evento.local });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEventoSelecionado(null);
  };

  // ====== LÓGICA DO CALENDÁRIO ======
  const diasDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const mudarMes = (direcao: number) => {
    let novoMes = mesAtual + direcao;
    let novoAno = anoAtual;
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    else if (novoMes < 0) { novoMes = 11; novoAno--; }
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  };

  // ====== LÓGICA DA LISTA ======
  const dataHojeStr = hoje.toISOString().split('T')[0];
  const eventosFiltrados = eventos.filter(ev => {
    if (filtroProximas && ev.data < dataHojeStr) return false;
    if (filtroSemSacerdote && ev.sacerdote && ev.sacerdote.trim() !== '') return false;
    return true;
  });

  const formatarDataBR = (dataIso: string) => dataIso.split('-').reverse().join('/');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative pb-10">
      
      {/* CABEÇALHO */}
      <div className="p-6 pb-4 shrink-0 max-w-5xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onVoltar} className="p-2 text-slate-400 hover:text-[#EA9248] bg-slate-50 hover:bg-[#EA9248]/10 rounded-full transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Agenda Litúrgica</h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                {isGestor ? 'Organize missas, locais e escalas sacerdotais.' : 'Acompanhe as escalas e datas de missas.'}
              </p>
            </div>
          </div>
          {isGestor && (
            <button onClick={() => abrirModalNovo()} className="w-full sm:w-auto px-5 py-3 bg-[#EA9248] hover:bg-[#d58440] text-white font-bold rounded-xl text-sm uppercase flex items-center justify-center gap-2 transition-all shadow-md">
              <Plus className="w-4 h-4" /> Nova Missa
            </button>
          )}
        </div>
      </div>

      {/* ABAS */}
      <div className="px-6 max-w-5xl w-full mx-auto mb-4">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit">
          <button onClick={() => setAbaAtiva('calendario')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${abaAtiva === 'calendario' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <CalendarIcon className="w-4 h-4" /> Calendário
          </button>
          <button onClick={() => setAbaAtiva('lista')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${abaAtiva === 'lista' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <List className="w-4 h-4" /> Visão em Lista
          </button>
        </div>
      </div>

      <div className="px-6 flex-1 max-w-5xl w-full mx-auto">
        {loading ? (
          <div className="text-center text-slate-500 mt-20 font-medium animate-pulse">Carregando agenda...</div>
        ) : abaAtiva === 'calendario' ? (
          
          /* VISÃO: CALENDÁRIO */
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">{nomesMeses[mesAtual]} {anoAtual}</h2>
              <div className="flex gap-2">
                <button onClick={() => mudarMes(-1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => mudarMes(1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-slate-200 border-t border-slate-200">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="bg-slate-50 py-2 text-center text-xs font-black uppercase text-slate-500">{d}</div>
              ))}
              
              {Array.from({ length: primeiroDiaSemana }).map((_, i) => <div key={`vazio-${i}`} className="bg-white min-h-[100px]" />)}
              
              {Array.from({ length: diasDoMes }).map((_, i) => {
                const dia = i + 1;
                const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const eventosDoDia = eventos.filter(e => e.data === dataFormatada);
                const isHoje = dataFormatada === dataHojeStr;

                return (
                  <div 
                    key={dia} 
                    onClick={() => { if (isGestor) abrirModalNovo(dataFormatada); }} 
                    className={`bg-white min-h-[100px] sm:min-h-[120px] p-2 border-t border-transparent ${isGestor ? 'hover:border-blue-200 cursor-pointer' : ''} transition-colors relative group`}
                  >
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isHoje ? 'bg-blue-500 text-white' : 'text-slate-700'}`}>{dia}</span>
                    <div className="space-y-1">
                      {eventosDoDia.map(ev => (
                        <div key={ev.id} onClick={(e) => { e.stopPropagation(); abrirModalDetalhes(ev); }} className={`p-1 sm:p-1.5 rounded text-[10px] sm:text-xs font-bold truncate border cursor-pointer hover:shadow-sm ${ev.sacerdote ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {ev.horario} - {ev.sacerdote || 'Sem Sacerdote'}
                        </div>
                      ))}
                    </div>
                    {isGestor && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hidden sm:block">
                        <Plus className="w-3 h-3 text-slate-300" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        ) : (

          /* VISÃO: LISTA */
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /> Filtros:</span>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={filtroProximas} onChange={e => setFiltroProximas(e.target.checked)} className="w-4 h-4 text-blue-500 rounded border-slate-300" /> Ocultar Passadas
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={filtroSemSacerdote} onChange={e => setFiltroSemSacerdote(e.target.checked)} className="w-4 h-4 text-red-500 rounded border-slate-300" /> Apenas Sem Sacerdote
              </label>
            </div>

            {eventosFiltrados.length === 0 ? (
              <p className="text-center text-slate-500 py-10">Nenhuma missa encontrada com os filtros atuais.</p>
            ) : (
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {eventosFiltrados.map(ev => (
                  <div key={ev.id} onClick={() => abrirModalDetalhes(ev)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{formatarDataBR(ev.data)}</span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{ev.horario}</span>
                      </div>
                      <h3 className="font-bold text-slate-800">{ev.local}</h3>
                      <p className={`text-xs mt-1 font-medium ${ev.sacerdote ? 'text-slate-500' : 'text-red-500'}`}>
                        {ev.sacerdote ? `Sacerdote: ${ev.sacerdote}` : '⚠️ Aguardando Sacerdote'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== MODAL DE CRIAÇÃO/EDIÇÃO/DETALHES ====== */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col my-auto border border-slate-100">
            
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between shrink-0 rounded-t-3xl">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {modoEdicao ? (eventoSelecionado ? 'Editar Missa' : 'Nova Missa') : 'Detalhes da Missa'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              {modoEdicao && isGestor ? (
                // MODO FORMULÁRIO (Apenas Gestor vê)
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data *</label>
                      <input type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horário *</label>
                      <input type="time" value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Local / Paróquia *</label>
                    <input type="text" placeholder="Santuário, Capela..." value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-blue-500" />
                  </div>
                  
                  {/* Select dinâmico puxando do banco */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sacerdote Designado</label>
                    <select 
                      value={formData.sacerdote} 
                      onChange={e => setFormData({...formData, sacerdote: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-blue-500 text-slate-700 font-medium"
                    >
                      <option value="">-- Deixar pendente / Aguardando --</option>
                      {sacerdotes.map(sac => (
                        <option key={sac.uid} value={sac.nome}>{sac.nome}</option>
                      ))}
                    </select>

                    {/* Exibe a escala e preferência do padre na hora da criação */}
                    {sacerdoteSelecionadoObj && sacerdoteSelecionadoObj.disponibilidade && (
                      <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-1.5 text-emerald-800 text-xs">
                        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Nota de Escala do Padre:</strong> {sacerdoteSelecionadoObj.disponibilidade}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button onClick={salvarEvento} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl uppercase text-xs">Salvar Agenda</button>
                    {eventoSelecionado && <button onClick={() => setModoEdicao(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl uppercase text-xs">Cancelar</button>}
                  </div>
                </div>
              ) : (
                // MODO VISUALIZAÇÃO COM HISTÓRICO RASTREÁVEL
                <div className="space-y-6 text-sm">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div><span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Data</span><strong className="text-slate-800">{formatarDataBR(eventoSelecionado.data)}</strong></div>
                    <div><span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Horário</span><strong className="text-slate-800">{eventoSelecionado.horario}</strong></div>
                    <div className="col-span-2"><span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Local</span><strong className="text-slate-800">{eventoSelecionado.local}</strong></div>
                    <div className="col-span-2">
                      <span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1"><User className="w-3 h-3"/> Sacerdote Escalado</span>
                      {eventoSelecionado.sacerdote ? <strong className="text-green-600">{eventoSelecionado.sacerdote}</strong> : <strong className="text-red-500 italic">Pendente de designação</strong>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-1"><History className="w-3.5 h-3.5"/> Histórico de Alterações</h4>
                    <div className="space-y-3 pl-2">
                      {eventoSelecionado.historico?.map((log: any, idx: number) => (
                        <div key={idx} className="relative pl-4 before:absolute before:left-[-4px] before:top-1.5 before:w-2 before:h-2 before:rounded-full before:bg-blue-300 before:border-2 before:border-white border-l-2 border-slate-100">
                          <p className="text-xs font-bold text-slate-700">{log.acao} por {log.porNome}</p>
                          <p className="text-[10px] text-slate-400">{new Date(log.data).toLocaleString('pt-BR')}</p>
                          {log.detalhes && <p className="text-[11px] text-slate-500 italic mt-0.5">{log.detalhes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isGestor && (
                    <div className="pt-4 flex gap-3 border-t border-slate-100">
                      <button onClick={() => setModoEdicao(true)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl uppercase text-xs flex items-center justify-center gap-2"><Edit className="w-4 h-4"/> Editar</button>
                      <button onClick={() => excluirEvento(eventoSelecionado.id)} className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl uppercase text-xs flex items-center justify-center"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}