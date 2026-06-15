import React, { useEffect, useState } from 'react';
import { collection, query, where, or, getDocs, getDoc, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle2, XCircle, User, MessageSquareWarning, ShieldCheck, AlertCircle, PlayCircle, X, MapPin, Info, History, Bell } from 'lucide-react';

interface PainelProps {
  onVoltar: () => void;
  cardAlvoId?: string | null;      
  limparCardAlvo?: () => void;     
}

export default function PainelSolicitacoes({ onVoltar, cardAlvoId, limparCardAlvo }: PainelProps) {
  const { user, userData } = useAuth();
  
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardSelecionado, setCardSelecionado] = useState<any | null>(null);
  
  // Estado que controla qual Aba está ativa no momento
  const [abaAtiva, setAbaAtiva] = useState<string>('Pendente');

  const [usuariosAprovados, setUsuariosAprovados] = useState<any[]>([]);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  
  const [modalAcao, setModalAcao] = useState<{id: string, status: string} | null>(null);
  const [modalInput, setModalInput] = useState('');

  // NOVO ESTADO: Checkbox da integração automática com a Agenda
  const [salvarNaAgenda, setSalvarNaAgenda] = useState(true);

  const isGestor = userData?.nivel === 'admin' || userData?.nivel === 'super_admin';

  const abasStatus = [
    { id: 'Pendente', titulo: 'Pendentes', cor: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: <Clock className="w-4 h-4" /> },
    { id: 'Aprovado', titulo: 'Aprovadas', cor: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'Em Andamento', titulo: 'Em Andamento', cor: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'Concluido', titulo: 'Concluídas', cor: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'Indeferido', titulo: 'Indeferidas', cor: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: <XCircle className="w-4 h-4" /> }
  ];

  const verificarPermissaoMovimento = (solAtual: any, statusDestino: string) => {
    if (isGestor) return true;
    if (solAtual.responsavelUid === user?.uid) {
      if (solAtual.status === 'Aprovado' && statusDestino === 'Em Andamento') return true;
      if (solAtual.status === 'Em Andamento' && statusDestino === 'Concluido') return true;
    }
    return false;
  };

  const fetchData = async () => {
    if (!user || !userData) return;
    setLoading(true);

    try {
      let qSol;
      if (isGestor) {
        qSol = query(collection(db, "solicitacoes"));
        
        // Busca usuários e filtra apenas os que têm a credencial "Liturgia"
        const qUsers = query(collection(db, "usuarios"), where("aprovado", "==", true));
        const usersSnap = await getDocs(qUsers);
        
        const aprovados = usersSnap.docs
          .map(d => ({ uid: d.id, nome: d.data().nome, credenciais: d.data().credenciais || [] }))
          .filter(u => u.credenciais.includes('Liturgia') || u.uid === user.uid); // Filtro de Credencial
          
        setUsuariosAprovados(aprovados);
      } else {
        qSol = query(
          collection(db, "solicitacoes"), 
          or(
            where("userId", "==", user.uid),
            where("responsavelUid", "==", user.uid)
          )
        );
      }

      const querySnapshot = await getDocs(qSol);
      const docs = querySnapshot.docs.map(d => {
        const data = d.data();
        const statusCorrigido = data.status === 'Deferido' ? 'Aprovado' : data.status;
        return { id: d.id, ...data, status: statusCorrigido };
      });
      
      docs.sort((a: any, b: any) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
      setSolicitacoes(docs);

      if (cardSelecionado) {
        const cardAtualizado = docs.find(d => d.id === cardSelecionado.id);
        if (cardAtualizado) setCardSelecionado(cardAtualizado);
      }

      const qNotif = query(collection(db, "notificacoes"), where("userId", "==", user.uid));
      const notifSnap = await getDocs(qNotif);
      const notifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setNotificacoes(notifs);

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, userData, isGestor]);

  useEffect(() => {
    const processarCardAlvo = async () => {
      if (cardAlvoId && solicitacoes.length > 0) {
        let cardEncontrado = solicitacoes.find(s => s.id === cardAlvoId);
        if (!cardEncontrado) {
          try {
            const docSnap = await getDoc(doc(db, "solicitacoes", cardAlvoId));
            if (docSnap.exists()) {
              const data = docSnap.data();
              cardEncontrado = { id: docSnap.id, ...data, status: data.status === 'Deferido' ? 'Aprovado' : data.status };
            }
          } catch (e) {
            console.error("Erro ao buscar card alvo no banco:", e);
          }
        }
        if (cardEncontrado) {
          setCardSelecionado(cardEncontrado);
          setAbaAtiva(cardEncontrado.status);
        }
        if (limparCardAlvo) limparCardAlvo();
      }
    };
    processarCardAlvo();
  }, [cardAlvoId, solicitacoes]);

  const handleAcaoStart = (id: string, novoStatus: string) => {
    const solAtual = solicitacoes.find(s => s.id === id);
    if (!solAtual || solAtual.status === novoStatus) return;

    if (!verificarPermissaoMovimento(solAtual, novoStatus)) {
      alert("Você só tem permissão para avançar esta tarefa para a próxima etapa.");
      return;
    }

    if (novoStatus === 'Indeferido') {
      setModalInput(solAtual.motivoIndeferimento || '');
      setModalAcao({ id, status: novoStatus });
    } else if (novoStatus === 'Aprovado') {
      setModalInput(solAtual.responsavelUid || '');
      // NOVO: Reseta o checkbox sempre que for aprovar um novo cartão
      setSalvarNaAgenda(true);
      setModalAcao({ id, status: novoStatus });
    } else if (novoStatus === 'Em Andamento') {
      if (solAtual.responsavelUid || solAtual.responsavel) {
        executarAcao(id, novoStatus, '', solAtual.responsavel || '', solAtual.responsavelUid || '');
      } else {
        setModalInput('');
        setModalAcao({ id, status: novoStatus });
      }
    } else {
      executarAcao(id, novoStatus, '', solAtual.responsavel || '', solAtual.responsavelUid || '');
    }
  };

  const executarAcao = async (id: string, novoStatus: string, motivo: string, responsavelNome: string, responsavelUid: string) => {
    const solAtual = solicitacoes.find(s => s.id === id);
    if (!solAtual) return;

    try {
      const docRef = doc(db, "solicitacoes", id);
      const dataIsoAtual = new Date().toISOString();
      
      const novoLog = {
        acao: novoStatus,
        porNome: userData.nome,
        data: dataIsoAtual,
        responsavel: responsavelNome || null,
        motivo: motivo || null
      };

      const historicoAtualizado = [...(solAtual.historico || []), novoLog];

      const dadosAtualizacao: any = { 
        status: novoStatus === 'Aprovado' ? 'Deferido' : novoStatus,
        modificadoPorNome: userData.nome,
        dataModificacao: dataIsoAtual,
        historico: historicoAtualizado 
      };

      if (motivo) dadosAtualizacao.motivoIndeferimento = motivo;
      
      if (responsavelNome) {
        dadosAtualizacao.responsavel = responsavelNome;
        dadosAtualizacao.responsavelUid = responsavelUid;
      } else if (novoStatus === 'Pendente') {
        dadosAtualizacao.responsavel = '';
        dadosAtualizacao.responsavelUid = '';
      }

      await updateDoc(docRef, dadosAtualizacao);
      
      const servicoNome = solAtual.servicoExato || 'Material Litúrgico';
      const notifBase = { data: dataIsoAtual, lida: false, servico: servicoNome, solicitacaoId: id }; 

      if (solAtual.userId !== user?.uid) {
        await addDoc(collection(db, "notificacoes"), {
          ...notifBase,
          userId: solAtual.userId,
          mensagem: `A sua solicitação foi movimentada para: ${novoStatus.toUpperCase()}.`
        });
      }

      if (responsavelUid && responsavelUid !== solAtual.responsavelUid && responsavelUid !== user?.uid) {
        await addDoc(collection(db, "notificacoes"), {
          ...notifBase,
          userId: responsavelUid,
          mensagem: `Você foi designado pelo(a) coordenador(a) ${userData.nome} como responsável pela tarefa.`
        });
      }

      // =====================================================================
      // NOVO: INTEGRAÇÃO: Salvar automaticamente na Agenda Litúrgica
      // =====================================================================
      if (novoStatus === 'Aprovado' && salvarNaAgenda && solAtual.datas) {
        await addDoc(collection(db, "agenda_liturgia"), {
          data: solAtual.datas,
          horario: solAtual.horarios || '',
          local: solAtual.local || 'Paróquia',
          sacerdote: '', // Fica vazio para que a equipe preencha depois na tela da agenda
          criadoPor: userData.nome,
          dataCriacao: dataIsoAtual,
          historico: [{ 
            acao: 'Criado via Solicitação Aprovada', 
            porNome: userData.nome, 
            data: dataIsoAtual,
            detalhes: `Vindo do pedido de ${solAtual.nome}`
          }]
        });
      }
      // =====================================================================

      setSolicitacoes(prev => prev.map(sol => sol.id === id ? { ...sol, ...dadosAtualizacao, status: novoStatus } : sol));
      if (cardSelecionado && cardSelecionado.id === id) {
        setCardSelecionado(prev => ({ ...prev, ...dadosAtualizacao, status: novoStatus }));
      }
      setModalAcao(null);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao mover o cartão. Tente novamente.");
    }
  };

  const handleConfirmarModal = () => {
    if (!modalAcao) return;
    
    if (modalAcao.status === 'Indeferido') {
      if (!modalInput.trim()) return alert("O motivo é obrigatório.");
      executarAcao(modalAcao.id, modalAcao.status, modalInput.trim(), '', '');
      
    } else if (modalAcao.status === 'Aprovado') {
      let rNome = '';
      let rUid = '';
      if (modalInput) {
        const usuarioEscolhido = usuariosAprovados.find(u => u.uid === modalInput);
        if (usuarioEscolhido) {
          rNome = usuarioEscolhido.nome;
          rUid = usuarioEscolhido.uid;
        }
      }
      executarAcao(modalAcao.id, modalAcao.status, '', rNome, rUid);

    } else if (modalAcao.status === 'Em Andamento') {
      if (!modalInput) return alert("Selecione um responsável na lista para iniciar a execução.");
      const usuarioEscolhido = usuariosAprovados.find(u => u.uid === modalInput);
      if (usuarioEscolhido) {
        executarAcao(modalAcao.id, modalAcao.status, '', usuarioEscolhido.nome, usuarioEscolhido.uid);
      }
    }
  };

  const marcarNotificacaoLida = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notificacoes", notifId), { lida: true });
      setNotificacoes(prev => prev.map(n => n.id === notifId ? { ...n, lida: true } : n));
    } catch (e) {
      console.error("Erro ao ler notificação:", e);
    }
  };

  const handleCliqueNotificacaoInterna = async (n: any) => {
    await marcarNotificacaoLida(n.id);
    setMostrarNotificacoes(false);
    
    if (n.solicitacaoId) {
      let card = solicitacoes.find(s => s.id === n.solicitacaoId);
      if (!card) {
        try {
          const docSnap = await getDoc(doc(db, "solicitacoes", n.solicitacaoId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            card = { id: docSnap.id, ...data, status: data.status === 'Deferido' ? 'Aprovado' : data.status };
          }
        } catch (err) {
          console.error("Erro ao puxar o card da notificação:", err);
        }
      }

      if (card) {
        setCardSelecionado(card);
        setAbaAtiva(card.status); 
      } else {
        alert("A solicitação vinculada não foi encontrada no banco de dados.");
      }
    }
  };

  const formatarData = (dataIso: string) => dataIso ? dataIso.split('-').reverse().join('/') : '';
  const formatarDataHoraCompleta = (isoString: string) => {
    if (!isoString) return '';
    const dataObjeto = new Date(isoString);
    return `${dataObjeto.toLocaleDateString('pt-BR')} às ${dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;
  
  // Filtra solicitações da aba ativa
  const solicitacoesFiltradas = solicitacoes.filter(sol => sol.status === abaAtiva);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative pb-10">
      
      {/* Cabeçalho */}
      <div className="p-6 pb-4 shrink-0 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={onVoltar} className="p-2 text-slate-400 hover:text-[#EA9248] bg-slate-50 hover:bg-[#EA9248]/10 rounded-full transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{isGestor ? 'Gestão de Solicitações' : 'Meus Pedidos / Tarefas'}</h1>
              <p className="text-slate-500 text-xs sm:text-sm">{isGestor ? 'Navegue pelas abas para gerir os pedidos.' : 'Acompanhe e execute suas tarefas.'}</p>
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)} className="p-3 text-slate-500 hover:text-[#EA9248] bg-slate-50 hover:bg-[#EA9248]/10 rounded-xl transition-all relative">
              <Bell className="w-5 h-5" />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{notificacoesNaoLidas}</span>
              )}
            </button>

            {mostrarNotificacoes && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 overflow-hidden flex flex-col max-h-[400px]">
                <div className="p-4 bg-slate-900 text-white font-bold text-sm flex justify-between items-center">
                  Notificações
                  <button onClick={() => setMostrarNotificacoes(false)}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                  {notificacoes.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs p-6">Nenhuma notificação.</p>
                  ) : (
                    notificacoes.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleCliqueNotificacaoInterna(n)} 
                        className={`p-3 rounded-xl mb-1 cursor-pointer transition-all border border-transparent ${n.lida ? 'opacity-60 hover:bg-slate-50' : 'bg-[#EA9248]/5 border-[#EA9248]/20 hover:border-[#EA9248]/40'}`}
                      >
                        <p className="text-[10px] text-[#EA9248] font-bold uppercase mb-1">{n.servico}</p>
                        <p className="text-xs text-slate-700 leading-tight">{n.mensagem}</p>
                        <p className="text-[9px] text-slate-400 mt-2">{formatarDataHoraCompleta(n.data)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DE NAVEGAÇÃO (ABAS / TABS) */}
      <div className="px-6 max-w-5xl w-full mx-auto">
        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 custom-scrollbar snap-x">
          {abasStatus.map(aba => {
            const isAtiva = abaAtiva === aba.id;
            const countCards = solicitacoes.filter(s => s.status === aba.id).length;

            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`snap-start flex items-center gap-2 px-5 py-3.5 rounded-2xl whitespace-nowrap transition-all border text-sm font-bold shadow-sm ${
                  isAtiva 
                  ? `${aba.cor} ${aba.text} border-transparent ring-2 ring-offset-2 ring-transparent ring-offset-[#f8fafc]` 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {aba.icon}
                {aba.titulo}
                <span className={`text-[10px] px-2 py-0.5 rounded-lg ${isAtiva ? 'bg-white/60' : 'bg-slate-100 text-slate-400'}`}>
                  {countCards}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ÁREA DA LISTA DE CARTÕES */}
      <div className="px-6 flex-1 max-w-5xl w-full mx-auto">
        {loading ? (
          <div className="text-center text-slate-500 mt-20 font-medium animate-pulse">Carregando informações...</div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl shadow-sm border border-slate-200 mt-6 max-w-lg mx-auto">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Nenhum pedido nesta aba</h3>
            <p className="text-slate-500 mt-2">Os cartões com status '{abasStatus.find(a => a.id === abaAtiva)?.titulo}' aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid gap-4 mt-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {solicitacoesFiltradas.map((sol) => {
              const permiteMovimentar = isGestor || sol.responsavelUid === user?.uid;
              const infoAbaAtual = abasStatus.find(a => a.id === sol.status);
              
              return (
                <div 
                  key={sol.id} 
                  onClick={() => setCardSelecionado(sol)} 
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-[#EA9248] hover:shadow-md transition-all relative cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{formatarData(sol.datas)}</span>
                      <h3 className="text-sm font-bold text-slate-800 leading-tight pr-2">{sol.servicoExato || 'Material Litúrgico'}</h3>
                      <p className="text-[10px] text-[#EA9248] font-black uppercase tracking-wider mt-1">{sol.servicoTipo}</p>
                    </div>
                    {infoAbaAtual && (
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 shrink-0 ${infoAbaAtual.cor} ${infoAbaAtual.text}`}>
                        {infoAbaAtual.titulo}
                      </span>
                    )}
                  </div>
                  
                  {sol.responsavelUid === user?.uid && (
                    <div className="mb-3 bg-purple-50 p-2 rounded-lg flex items-center gap-1.5 border border-purple-100 w-fit">
                      <PlayCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Sua Tarefa</span>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate pr-2">👤 {sol.nome}</span>
                      <span className="shrink-0">🕒 {sol.horarios}</span>
                    </div>

                    {permiteMovimentar && (
                      <div className="mt-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={sol.status}
                          onChange={(e) => {
                            if (verificarPermissaoMovimento(sol, e.target.value)) {
                              handleAcaoStart(sol.id, e.target.value);
                            } else {
                              alert("Você só pode avançar a etapa.");
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg p-2.5 outline-none focus:border-[#EA9248] transition-colors"
                        >
                          {abasStatus.map(c => {
                            const temPermissao = verificarPermissaoMovimento(sol, c.id) || sol.status === c.id;
                            if (!temPermissao && !isGestor) return null; 
                            return <option key={c.id} value={c.id}>Mover para: {c.titulo}</option>;
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE DELEGAÇÃO / INDEFERIMENTO */}
      {modalAcao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {modalAcao.status === 'Em Andamento' ? 'Delegar Responsável' : 
               modalAcao.status === 'Aprovado' ? 'Aprovar e Delegar (Opcional)' : 'Motivo do Indeferimento'}
            </h3>
            
            <p className="text-sm text-slate-500 mb-4">
              {modalAcao.status === 'Em Andamento' ? 'Selecione um membro cadastrado da plataforma para executar esta tarefa.' : 
               modalAcao.status === 'Aprovado' ? 'Deseja já atribuir um responsável para esta solicitação?' : 'Explique ao solicitante por que o pedido não pôde ser atendido.'}
            </p>
            
            {modalAcao.status === 'Em Andamento' || modalAcao.status === 'Aprovado' ? (
              <>
                <select value={modalInput} onChange={(e) => setModalInput(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-[#EA9248] outline-none text-slate-700 bg-white">
                  {modalAcao.status === 'Aprovado' ? (
                    <option value="">Nenhum responsável no momento</option>
                  ) : (
                    <option value="" disabled>Selecione o membro...</option>
                  )}
                  {usuariosAprovados.map(u => <option key={u.uid} value={u.uid}>{u.nome}</option>)}
                </select>

                {/* NOVO: CHECKBOX DA AGENDA LITÚRGICA */}
                {modalAcao.status === 'Aprovado' && (
                  <label className="flex items-center gap-2 mt-4 text-sm text-slate-700 cursor-pointer bg-blue-50 p-3 rounded-xl border border-blue-100 transition-colors hover:bg-blue-100/50">
                    <input 
                      type="checkbox" 
                      checked={salvarNaAgenda} 
                      onChange={(e) => setSalvarNaAgenda(e.target.checked)} 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                    />
                    <span className="leading-tight">Salvar automaticamente a data e local na <strong>Agenda Litúrgica</strong></span>
                  </label>
                )}
              </>
            ) : (
              <textarea value={modalInput} onChange={(e) => setModalInput(e.target.value)} rows={3} placeholder="Digite a justificativa detalhada..." className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-red-500 outline-none resize-none" />
            )}
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalAcao(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase">Cancelar</button>
              <button onClick={handleConfirmarModal} className={`flex-1 py-3 text-white font-bold rounded-xl text-xs uppercase shadow-md ${modalAcao.status === 'Em Andamento' ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20' : modalAcao.status === 'Aprovado' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES COMPLETO */}
      {cardSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-[#EA9248]/30"><Info className="w-5 h-5 text-[#EA9248]" /></div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">{cardSelecionado.servicoExato || 'Detalhes do Pedido'}</h2>
                  <p className="text-xs text-[#EA9248] font-bold uppercase tracking-widest mt-0.5">{cardSelecionado.servicoTipo}</p>
                </div>
              </div>
              <button onClick={() => setCardSelecionado(null)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-sm">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1"><User className="w-3.5 h-3.5"/> Dados da Solicitação</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div><span className="text-slate-400 text-xs block">Solicitante:</span><strong>{cardSelecionado.nome}</strong></div>
                  <div><span className="text-slate-400 text-xs block">Ministério/Célula:</span><strong>{cardSelecionado.ministerio}</strong></div>
                  <div className="sm:col-span-2"><span className="text-slate-400 text-xs block">Contatos fornecidos:</span><strong>{cardSelecionado.contatos}</strong></div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Agenda e Localização</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div><span className="text-slate-400 text-xs block">Data do Evento:</span><strong>{formatarData(cardSelecionado.datas)}</strong></div>
                  <div><span className="text-slate-400 text-xs block">Horário:</span><strong>{cardSelecionado.horarios}</strong></div>
                  <div className="sm:col-span-2"><span className="text-slate-400 text-xs block">Local definido:</span><strong>{cardSelecionado.local} {cardSelecionado.endereco && `(${cardSelecionado.endereco})`}</strong></div>
                </div>
              </div>

              {(cardSelecionado.esportulaPrevista || cardSelecionado.tituloIcone || cardSelecionado.outrasNecessidades) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1"><Info className="w-3.5 h-3.5"/> Especificações</h4>
                  <div className="bg-[#EA9248]/5 p-4 rounded-xl border border-[#EA9248]/20 space-y-2 text-slate-700">
                    {cardSelecionado.esportulaPrevista && <p>• <strong>Espórtula:</strong> {cardSelecionado.esportulaPrevista} | <strong>Pagamento:</strong> {cardSelecionado.quemPagamento}</p>}
                    {cardSelecionado.tituloIcone && <p>• <strong>Ícone:</strong> {cardSelecionado.tituloIcone} {cardSelecionado.corTecido && `| Tecido: ${cardSelecionado.corTecido}`}</p>}
                    {cardSelecionado.outrasNecessidades && <p>• <strong>Obs:</strong> {cardSelecionado.outrasNecessidades}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1"><History className="w-3.5 h-3.5"/> Histórico Detalhado de Rastreamento</h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <div className="relative before:absolute before:left-[-22px] before:top-1.5 before:w-3 before:h-3 before:rounded-full before:bg-slate-400 before:border-2 before:border-white">
                    <p className="text-xs font-bold text-slate-800">Inclusão da Solicitação</p>
                    <p className="text-xs text-slate-500 mt-0.5">Incluído por <strong>{cardSelecionado.nome}</strong> em {formatarDataHoraCompleta(cardSelecionado.dataCriacao)}</p>
                  </div>

                  {cardSelecionado.historico && cardSelecionado.historico.map((log: any, index: number) => {
                    let corBg = 'bg-slate-500'; let corTexto = 'text-slate-900'; let corBgFundo = 'bg-slate-50'; let corBorda = 'border-slate-100';
                    if (log.acao === 'Aprovado' || log.acao === 'Deferido') { corBg = 'bg-blue-500'; corTexto = 'text-blue-900'; }
                    else if (log.acao === 'Em Andamento') { corBg = 'bg-purple-500'; corTexto = 'text-purple-900'; corBgFundo = 'bg-purple-50'; corBorda = 'border-purple-100'; }
                    else if (log.acao === 'Concluido') { corBg = 'bg-green-500'; corTexto = 'text-green-900'; }
                    else if (log.acao === 'Indeferido') { corBg = 'bg-red-500'; corTexto = 'text-red-900'; corBgFundo = 'bg-red-50'; corBorda = 'border-red-100'; }
                    else if (log.acao === 'Pendente') { corBg = 'bg-amber-500'; corTexto = 'text-amber-900'; }

                    return (
                      <div key={index} className={`relative before:absolute before:left-[-22px] before:top-1.5 before:w-3 before:h-3 before:rounded-full before:${corBg} before:border-2 before:border-white`}>
                        <p className={`text-xs font-bold ${corTexto}`}>Movimentado para: {log.acao.toUpperCase()}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Ação executada por <strong>{log.porNome}</strong> em {formatarDataHoraCompleta(log.data)}</p>
                        {log.responsavel && <div className={`mt-1.5 ${corBgFundo} p-2 rounded-lg border ${corBorda} w-fit`}><p className={`text-[11px] ${corTexto} leading-snug`}>Responsável atribuído: <strong>{log.responsavel}</strong></p></div>}
                        {log.motivo && <div className={`mt-1.5 ${corBgFundo} p-2 rounded-lg border ${corBorda} w-fit`}><p className={`text-[11px] ${corTexto} leading-snug italic`}>Motivo: "{log.motivo}"</p></div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {(isGestor || cardSelecionado.responsavelUid === user?.uid) && (
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Alterar Status por Atalho Rápido</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {abasStatus.map((c) => {
                      const temPermissao = verificarPermissaoMovimento(cardSelecionado, c.id);
                      return (
                        <button 
                          key={c.id} 
                          disabled={cardSelecionado.status === c.id || !temPermissao} 
                          onClick={() => {
                            handleAcaoStart(cardSelecionado.id, c.id);
                            setCardSelecionado(null);
                          }} 
                          className={`p-2 rounded-xl text-[10px] font-bold uppercase transition-all border text-center ${
                            cardSelecionado.status === c.id || !temPermissao 
                            ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#EA9248]'
                          }`}
                        >
                          {c.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.2s ease-out; }`}} />
    </div>
  );
}