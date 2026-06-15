import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, User, Calendar, MapPin, Phone, Mail, Clock, Save, CheckCircle, MessageCircle } from 'lucide-react';

interface PerfilSacerdoteProps {
  sacerdoteUid: string; // ID do usuário sacerdote no Firestore
  onVoltar: () => void;
  readOnly?: boolean; // Se for apenas para visualização de membros
}

export default function PerfilSacerdote({ sacerdoteUid, onVoltar, readOnly = false }: PerfilSacerdoteProps) {
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState(false);
  const [enviandoZap, setEnviandoZap] = useState(false);
  
  // Dados cadastrais específicos solicitados
  const [dados, setDados] = useState({
    nome: '',
    email: '',
    telefone: '',
    paroquia: '',
    cidade: '',
    aniversarioNascimento: '',
    aniversarioOrdenacao: '',
    disponibilidade: '', 
  });

  useEffect(() => {
    const carregarDadosSacerdote = async () => {
      try {
        const docSnap = await getDoc(doc(db, "usuarios", sacerdoteUid));
        if (docSnap.exists()) {
          const uData = docSnap.data();
          setDados({
            nome: uData.nome || '',
            email: uData.email || '',
            telefone: uData.telefone || '',
            paroquia: uData.paroquia || '',
            cidade: uData.cidade || '',
            aniversarioNascimento: uData.aniversarioNascimento || '',
            aniversarioOrdenacao: uData.aniversarioOrdenacao || '',
            disponibilidade: uData.disponibilidade || '',
          });
        }
      } catch (error) {
        console.error("Erro ao carregar ficha do sacerdote:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDadosSacerdote();
  }, [sacerdoteUid]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "usuarios", sacerdoteUid), dados);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 4000);
    } catch (error) {
      console.error("Erro ao salvar dados do sacerdote:", error);
      alert("Erro ao salvar as alterações.");
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Função para buscar missas sem sacerdote e enviar via WhatsApp
  const handleEnviarWhatsAppMissas = async () => {
    if (!dados.telefone) {
      alert("Por favor, preencha e salve o telefone do sacerdote antes de enviar a mensagem.");
      return;
    }

    setEnviandoZap(true);
    try {
      const q = query(collection(db, "agenda_liturgia"));
      const snap = await getDocs(q);
      
      const dataHojeIso = new Date().toISOString().split('T')[0]; // Pega a data de hoje no formato YYYY-MM-DD
      
      // Filtra as missas futuras que não têm sacerdote preenchido
      const missasPendentes = snap.docs
        .map(d => d.data())
        .filter(m => m.data >= dataHojeIso && (!m.sacerdote || m.sacerdote.trim() === ''))
        .sort((a, b) => new Date(`${a.data}T${a.horario || '00:00'}`).getTime() - new Date(`${b.data}T${b.horario || '00:00'}`).getTime());

      if (missasPendentes.length === 0) {
        alert("Ótima notícia! Todas as missas futuras já possuem um sacerdote designado.");
        setEnviandoZap(false);
        return;
      }

      // Constrói o texto da mensagem
      let textoMensagem = `Olá, ${dados.nome}! A Paz!\n\nTemos algumas celebrações que ainda estão sem sacerdote definido na nossa agenda. Teria disponibilidade para nos ajudar em alguma destas datas?\n\n`;

      missasPendentes.forEach(m => {
        // Separa a data para formatar direitinho sem erro de fuso horário
        const [ano, mes, dia] = m.data.split('-');
        const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
        
        // Formata o dia da semana (ex: 'domingo', 'segunda-feira') e capitaliza a primeira letra
        let diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        diaSemana = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

        // Adiciona a linha no formato solicitado: 00/00 - dia da semana - horário - local
        textoMensagem += ` *${dia}/${mes}* - ${diaSemana} - ${m.horario} - ${m.local}\n`;
      });

      textoMensagem += `\nQualquer dúvida, estou à disposição!`;

      // Limpa o número de telefone (tira traços, parênteses e espaços)
      const numeroLimpo = dados.telefone.replace(/\D/g, '');
      // Garante que tem o código do Brasil (55) na frente
      const numeroFinal = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;

      // Abre a URL do WhatsApp com o texto codificado
      const urlWhatsApp = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(textoMensagem)}`;
      window.open(urlWhatsApp, '_blank');

    } catch (error) {
      console.error("Erro ao gerar relatório de missas pendentes:", error);
      alert("Houve um erro ao buscar a agenda.");
    } finally {
      setEnviandoZap(false);
    }
  };

  if (loading && !dados.nome) {
    return <div className="text-center py-20 text-slate-500 animate-pulse font-medium">Carregando ficha clerical...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 pb-20">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
        
        {/* Topo / Voltar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onVoltar} className="p-2 text-slate-400 hover:text-[#EA9248] bg-slate-50 hover:bg-[#EA9248]/10 rounded-full transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Ficha do Sacerdote</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Dados ministeriais, aniversários e disponibilidades de escala.</p>
            </div>
          </div>
          
          {/* NOVO: Botão de Enviar Relatório de Escala pelo WhatsApp */}
          {!readOnly && (
            <button 
              type="button"
              onClick={handleEnviarWhatsAppMissas}
              disabled={enviandoZap}
              className="w-full sm:w-auto px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
              title="Envia as missas sem padre para o WhatsApp deste sacerdote"
            >
              <MessageCircle className="w-4 h-4" /> 
              {enviandoZap ? 'Gerando...' : 'Enviar Missas Vazias'}
            </button>
          )}
        </div>

        {sucesso && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-2 text-sm font-medium animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-green-500" /> Alterações salvas com sucesso no cadastro!
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-6 text-sm">
          
          {/* Seção 1: Identificação Básica */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1">Informações de Contato</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> Nome Completo</label>
                <input type="text" value={dados.nome} disabled className="w-full border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-500 outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail</label>
                <input type="email" value={dados.email} disabled className="w-full border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-500 outline-none cursor-not-allowed" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> Telefone de Contato</label>
                <input type="text" placeholder="(00) 00000-0000" value={dados.telefone} onChange={e => setDados({...dados, telefone: e.target.value})} disabled={readOnly} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 outline-none focus:border-[#EA9248] disabled:bg-slate-50" />
              </div>
            </div>
          </div>

          {/* Seção 2: Localização de Atuação */}
          <div className="space-y-4 pt-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1">Atuação Eclesiástica</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Paróquia / Vínculo</label>
                <input type="text" placeholder="Ex: Paróquia São José" value={dados.paroquia} onChange={e => setDados({...dados, paroquia: e.target.value})} disabled={readOnly} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 outline-none focus:border-[#EA9248] disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Cidade</label>
                <input type="text" placeholder="Ex: Curitiba" value={dados.cidade} onChange={e => setDados({...dados, cidade: e.target.value})} disabled={readOnly} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 outline-none focus:border-[#EA9248] disabled:bg-slate-50" />
              </div>
            </div>
          </div>

          {/* Seção 3: Datas Comemorativas */}
          <div className="space-y-4 pt-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1">Datas Importantes</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Aniversário de Nascimento</label>
                <input type="date" value={dados.aniversarioNascimento} onChange={e => setDados({...dados, aniversarioNascimento: e.target.value})} disabled={readOnly} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 outline-none focus:border-[#EA9248] text-slate-700 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Aniversário de Ordenação Sacerdotal</label>
                <input type="date" value={dados.aniversarioOrdenacao} onChange={e => setDados({...dados, aniversarioOrdenacao: e.target.value})} disabled={readOnly} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 outline-none focus:border-[#EA9248] text-slate-700 disabled:bg-slate-50" />
              </div>
            </div>
          </div>

          {/* Seção 4: Disponibilidade de Horários */}
          <div className="space-y-4 pt-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1">Disponibilidade de Escala</span>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Dias da semana e horários preferenciais</label>
              <textarea rows={3} placeholder="Ex: Disponível quartas à noite, sábados tarde/noite e domingos o dia todo. Restrição: Quintas-feiras indisponível." value={dados.disponibilidade} onChange={e => setDados({...dados, disponibilidade: e.target.value})} disabled={readOnly} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50/50 outline-none focus:border-[#EA9248] resize-none disabled:bg-slate-50" />
            </div>
          </div>

          {/* Botão de Gravação */}
          {!readOnly && (
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#EA9248] hover:bg-[#d58440] text-white font-bold rounded-xl uppercase tracking-wider transition-colors shadow-md shadow-[#EA9248]/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
              <Save className="w-4 h-4" /> {loading ? 'Gravando dados...' : 'Salvar Ficha Clerical'}
            </button>
          )}

        </form>
      </div>
    </div>
  );
}