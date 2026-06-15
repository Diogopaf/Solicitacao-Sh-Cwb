import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SolicitacaoLiturgiaForm from './components/SolicitacaoLiturgiaForm';
import MenuPrincipal from './components/MenuPrincipal';
import PainelSolicitacoes from './components/PainelSolicitacoes';
import GerenciarUsuarios from './components/GerenciarUsuarios';
import AgendaLiturgia from './components/AgendaLiturgia'; 
import PerfilSacerdote from './components/PerfilSacerdote';
import Login from './components/Login';
import { auth } from './firebase';

function Router() {
  const { user, userData, loading } = useAuth();
  
  const [telaAtual, setTelaAtual] = useState<'menu' | 'liturgia' | 'painel' | 'usuarios' | 'agenda' | 'perfil_padre'>('menu');
  const [cardAlvoId, setCardAlvoId] = useState<string | null>(null);
  
  // ESTADO: Guarda o ID do padre clicado na lista para abrir a ficha dele
  const [padreSelecionadoId, setPadreSelecionadoId] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  if (!user) return <Login />;

  if (userData && !userData.aprovado) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-slate-800">Aguardando Aprovação</h2>
          <p className="text-slate-500 mt-4">Olá, {user.displayName}! Seu acesso foi solicitado. Peça ao administrador para aprovar seu login.</p>
          <button onClick={() => auth.signOut()} className="mt-6 text-[#EA9248] font-bold underline hover:text-slate-800 transition-colors">Sair</button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = userData?.nivel === 'super_admin';
  const isAdmin = userData?.nivel === 'admin' || isSuperAdmin;

  const irParaPainelComCardFocado = (id: string) => {
    setCardAlvoId(id);
    setTelaAtual('painel');
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc]">
      {telaAtual === 'menu' && (
        <MenuPrincipal 
          onSelecionarLiturgia={() => setTelaAtual('liturgia')} 
          onSelecionarPainel={() => { setCardAlvoId(null); setTelaAtual('painel'); }}
          onSelecionarUsuarios={() => setTelaAtual('usuarios')} 
          onSelecionarAgenda={() => setTelaAtual('agenda')}
          onSelecionarPerfil={() => setTelaAtual('perfil_padre')}
          onClickNotificacao={irParaPainelComCardFocado} 
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      
      {telaAtual === 'liturgia' && (
        <SolicitacaoLiturgiaForm onVoltar={() => setTelaAtual('menu')} />
      )}
      
      {telaAtual === 'painel' && (
        <PainelSolicitacoes 
          onVoltar={() => setTelaAtual('menu')} 
          cardAlvoId={cardAlvoId} 
          limparCardAlvo={() => setCardAlvoId(null)} 
        />
      )}
      
      {telaAtual === 'usuarios' && (
        <GerenciarUsuarios 
          onVoltar={() => setTelaAtual('menu')} 
          onAbrirFichaPadre={(uid) => {
            setPadreSelecionadoId(uid); // Guarda qual padre você clicou
            setTelaAtual('perfil_padre'); // Muda para a tela da ficha
          }}
        />
      )}
      
      {telaAtual === 'agenda' && (
        <AgendaLiturgia onVoltar={() => setTelaAtual('menu')} />
      )}

      {telaAtual === 'perfil_padre' && (
        <PerfilSacerdote 
          sacerdoteUid={padreSelecionadoId || user.uid} 
          onVoltar={() => {
            setPadreSelecionadoId(null); // Limpa ao voltar
            setTelaAtual('menu'); 
          }} 
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}