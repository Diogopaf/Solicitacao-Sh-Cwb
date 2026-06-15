import React, { useEffect, useState } from 'react';
import { Church, ClipboardList, LogOut, Settings, Users, ShieldAlert, Bell, X, CalendarDays, User } from 'lucide-react';
import { auth, db } from '../firebase';
import logoComunidade from '../assets/logo.jpg'; 
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface MenuPrincipalProps {
  onSelecionarLiturgia: () => void;
  onSelecionarPainel: () => void;
  onSelecionarUsuarios: () => void; 
  onSelecionarAgenda: () => void; 
  onSelecionarPerfil: () => void; // NOVO: Propriedade para abrir o perfil do sacerdote
  onClickNotificacao: (solicitacaoId: string) => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export default function MenuPrincipal({ onSelecionarLiturgia, onSelecionarPainel, onSelecionarUsuarios, onSelecionarAgenda, onSelecionarPerfil, onClickNotificacao, isAdmin, isSuperAdmin }: MenuPrincipalProps) {
  const { user, userData } = useAuth();
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  const fetchNotificacoes = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "notificacoes"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setNotificacoes(docs);
    } catch (error) {
      console.error("Erro ao buscar notificações na página inicial:", error);
    }
  };

  useEffect(() => {
    fetchNotificacoes();
  }, [user]);

  const marcarNotificacaoLida = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notificacoes", notifId), { lida: true });
      setNotificacoes(prev => prev.map(n => n.id === notifId ? { ...n, lida: true } : n));
    } catch (e) {
      console.error("Erro ao atualizar status da notificação:", e);
    }
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  const formatarDataHoraCompleta = (isoString: string) => {
    if (!isoString) return '';
    const dataObjeto = new Date(isoString);
    return `${dataObjeto.toLocaleDateString('pt-BR')} às ${dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const isQualquerAdmin = isAdmin || isSuperAdmin;
  
  // Verifica se o usuário tem a credencial de liturgia ou se é master admin
  const temAcessoAgenda = isSuperAdmin || (userData?.credenciais || []).includes('Liturgia');
  
  // NOVO: Verifica se o usuário tem credencial de Sacerdote ou Padre
  const isSacerdote = (userData?.credenciais || []).some((c: string) => c === 'Sacerdote' || c === 'Padre');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative">
      
      {/* ========================================================= */}
      {/* CABEÇALHO FLUIDO E RESPONSIVO (HEADER)                    */}
      {/* ========================================================= */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
        
        {/* LADO ESQUERDO: Logo e Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-[#EA9248] overflow-hidden shrink-0">
            <img src={logoComunidade} alt="Logo da Comunidade" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">Central Shalom</h1>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-500">
                <ShieldAlert className="w-2.5 h-2.5" /> Master Admin
              </span>
            ) : isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#EA9248]">
                <Settings className="w-2.5 h-2.5" /> Coordenador
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                Membro
              </span>
            )}
          </div>
        </div>

        {/* LADO DIREITO: Notificações e Botão Sair */}
        <div className="flex items-center gap-2 sm:gap-3 relative">
          
          {/* Componente do Sino */}
          <div className="relative">
            <button 
              onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
              className="p-2.5 text-slate-500 hover:text-[#EA9248] bg-slate-50 hover:bg-[#EA9248]/10 border border-slate-100 rounded-xl transition-all relative"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 sm:w-5 h-4 sm:h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {notificacoesNaoLidas}
                </span>
              )}
            </button>

            {/* JANELA DE NOTIFICAÇÕES */}
            {mostrarNotificacoes && (
              <div className="fixed inset-x-4 mx-auto sm:mx-0 top-20 sm:top-auto sm:absolute sm:right-0 mt-2 w-auto max-w-[calc(100vw-32px)] sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[400px] z-[100] animate-fadeIn">
                <div className="p-4 bg-slate-900 text-white font-bold text-sm flex justify-between items-center shrink-0">
                  <span>Notificações ({notificacoesNaoLidas} novas)</span>
                  <button onClick={() => setMostrarNotificacoes(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1 p-2 custom-scrollbar bg-slate-50/50">
                  {notificacoes.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-10 font-medium">Nenhuma notificação por aqui.</p>
                  ) : (
                    notificacoes.map(n => (
                      <div 
                        key={n.id} 
                        onClick={async () => {
                          await marcarNotificacaoLida(n.id);
                          setMostrarNotificacoes(false);
                          if (n.solicitacaoId) {
                            onClickNotificacao(n.solicitacaoId); 
                          } else {
                            onSelecionarPainel(); 
                          }
                        }}
                        className={`p-3 rounded-xl mb-1 cursor-pointer transition-all border ${
                          n.lida 
                          ? 'opacity-60 bg-white border-slate-100 hover:bg-slate-50' 
                          : 'bg-white border-[#EA9248]/20 shadow-sm hover:border-[#EA9248]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-[#EA9248] font-black uppercase tracking-wider bg-[#EA9248]/5 px-1.5 py-0.5 rounded">
                            {n.servico}
                          </span>
                          {!n.lida && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                        </div>
                        <p className="text-xs text-slate-700 leading-tight font-medium">{n.mensagem}</p>
                        <p className="text-[9px] text-slate-400 mt-2 font-semibold">🕒 {formatarDataHoraCompleta(n.data)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 border border-slate-100 px-3 py-2.5 rounded-xl transition-all text-xs font-bold uppercase"
          >
            <span className="hidden sm:inline">Sair</span>
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex items-center justify-center p-6 w-full max-w-6xl mx-auto">
        <div className="w-full">
          
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">O que deseja fazer hoje?</h2>
            <p className="text-sm text-slate-400 mt-1">Selecione uma das opções operacionais abaixo para gerenciar ou solicitar.</p>
          </div>

          {/* Grade de Ferramentas / Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto justify-center">
            
            {/* Card Liturgia */}
            <button 
              onClick={onSelecionarLiturgia}
              className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-[#EA9248] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#EA9248]/10 flex items-center justify-center mb-5 group-hover:bg-[#EA9248] transition-colors duration-300">
                <Church className="w-8 h-8 sm:w-10 sm:h-10 text-[#EA9248] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Liturgia</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Solicitar Padres, Ministros ou Materiais Litúrgicos.</p>
            </button>

            {/* Card Painel / Requerimentos */}
            <button 
              onClick={onSelecionarPainel}
              className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-500 transition-colors duration-300">
                <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {isQualquerAdmin ? 'Painel de Aprovação' : 'Meus Pedidos'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {isQualquerAdmin ? 'Gerencie, delegue e acompanhe as solicitações recebidas.' : 'Acompanhe o andamento dos pedidos que enviou.'}
              </p>
            </button>

            {/* Card Agenda Litúrgica (Apenas com Credencial de Liturgia) */}
            {temAcessoAgenda && (
              <button 
                onClick={onSelecionarAgenda}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 group-hover:bg-emerald-500 transition-colors duration-300">
                  <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Agenda Litúrgica</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Organize e acompanhe as escalas e datas de missas.</p>
              </button>
            )}

            {/* Card Usuários / Credenciais */}
            {isQualquerAdmin && (
              <button 
                onClick={onSelecionarUsuarios}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5 group-hover:bg-slate-900 transition-colors duration-300">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600 group-hover:text-[#EA9248] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Equipe</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {isSuperAdmin ? 'Aprove acessos e gerencie cargos da equipe.' : 'Atribua as credenciais do seu ministério.'}
                </p>
              </button>
            )}

            {/* NOVO: Card Meu Perfil (Visível apenas para Sacerdote/Padre) */}
            {isSacerdote && (
              <button 
                onClick={onSelecionarPerfil}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 group-hover:bg-indigo-500 transition-colors duration-300">
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Meu Perfil</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Atualize seus dados ministeriais e disponibilidade.</p>
              </button>
            )}

          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}