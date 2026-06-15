import React from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
// Importando a logo da comunidade (ajustado para .jpg conforme você mencionou)
import logoComunidade from '../assets/logo.jpg';

export default function Login() {
  const loginComGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao logar:", error);
      alert("Falha no login. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-200">
        
        {/* Espaço da Logo Atualizado para usar a mesma da área logada */}
        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg mb-6 border-4 border-[#EA9248] overflow-hidden">
           <img 
             src={logoComunidade} 
             alt="Logo da Comunidade" 
             className="w-full h-full object-cover" 
           />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Bem-vindo</h1>
        
        {/* Texto atualizado conforme solicitado */}
        <p className="text-slate-500 mb-8">
          Acesse a Central de Solicitações da Comunidade Católica Shalom Curitiba
        </p>
        
        <button 
          onClick={loginComGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-[#EA9248] py-3 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>
        
        <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest">
          Acesso restrito a membros autorizados
        </p>
      </div>
    </div>
  );
}