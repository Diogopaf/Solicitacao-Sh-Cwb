import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, XCircle, Shield, User as UserIcon, ShieldAlert, Tag, UserPlus, FileText, X, Users, Church } from 'lucide-react';

interface GerenciarUsuariosProps {
  onVoltar: () => void;
  onAbrirFichaPadre?: (uid: string) => void;
}

const LISTA_MINISTERIOS = ['Liturgia', 'Música', 'Comunicação', 'Acolhimento', 'Intercessão', 'Eventos', 'Padre'];

export default function GerenciarUsuarios({ onVoltar, onAbrirFichaPadre }: GerenciarUsuariosProps) {
  const { userData } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Controle de Abas
  const [abaAtiva, setAbaAtiva] = useState<'membros' | 'sacerdotes'>('membros');

  const [modalSacerdoteAberto, setModalSacerdoteAberto] = useState(false);
  const [nomeNovoSacerdote, setNomeNovoSacerdote] = useState('');
  const [loadingCadastro, setLoadingCadastro] = useState(false);

  // Variáveis de controle de permissão
  const isSuperAdmin = userData?.nivel === 'super_admin';
  const isAdmin = userData?.nivel === 'admin';
  const credenciaisAdminLogado = userData?.credenciais || [];
  
  // NOVO: Regra estrita para visualizar a aba de Sacerdotes
  const temAcessoSacerdotes = isSuperAdmin || (isAdmin && credenciaisAdminLogado.includes('Liturgia'));

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      let docs = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        credenciais: [], 
        ...doc.data() 
      }));
      
      if (!isSuperAdmin) {
        docs = docs.filter(u => u.nivel !== 'super_admin');
      }

      docs.sort((a: any, b: any) => Number(a.aprovado) - Number(b.aprovado));
      setUsuarios(docs);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleAprovar = async (id: string, statusAtual: boolean, nivel: string) => {
    if (!isSuperAdmin) return alert("Apenas o Master Admin pode aprovar ou revogar acessos.");
    if (nivel === 'super_admin') return alert("Acesso negado: Você não pode revogar o acesso de um Super Administrador.");

    try {
      await updateDoc(doc(db, "usuarios", id), { aprovado: !statusAtual });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, aprovado: !statusAtual } : u));
    } catch (error) {
      console.error("Erro ao aprovar usuário:", error);
    }
  };

  const handleNivel = async (id: string, nivelAtual: string) => {
    if (!isSuperAdmin) return alert("Apenas o Master Admin pode promover ou rebaixar membros.");
    if (nivelAtual === 'super_admin') return alert("Acesso negado.");

    const novoNivel = nivelAtual === 'admin' ? 'membro' : 'admin';
    const confirmacao = window.confirm(`Tem certeza que deseja alterar este usuário para ${novoNivel.toUpperCase()}?`);
    if (!confirmacao) return;

    try {
      await updateDoc(doc(db, "usuarios", id), { nivel: novoNivel });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, nivel: novoNivel } : u));
    } catch (error) {
      console.error("Erro ao alterar nível:", error);
    }
  };

  const toggleCredencial = async (userId: string, credencial: string, credenciaisAtuais: string[]) => {
    if (!isSuperAdmin && !credenciaisAdminLogado.includes(credencial)) {
      return alert(`Você não é coordenador de ${credencial}, portanto não pode atribuir ou remover esta credencial.`);
    }

    const possuiSelo = credenciaisAtuais.includes(credencial);
    const novasCredenciais = possuiSelo 
      ? credenciaisAtuais.filter(c => c !== credencial) 
      : [...credenciaisAtuais, credencial]; 

    try {
      await updateDoc(doc(db, "usuarios", userId), { credenciais: novasCredenciais });
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, credenciais: novasCredenciais } : u));
    } catch (error) {
      console.error("Erro ao alterar credenciais:", error);
    }
  };

  const handleCadastrarSacerdoteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeNovoSacerdote.trim()) return;
    setLoadingCadastro(true);

    try {
      await addDoc(collection(db, "usuarios"), {
        nome: nomeNovoSacerdote,
        email: 'Cadastro Manual (Sem E-mail)',
        telefone: '',
        aprovado: true,
        nivel: 'membro',
        credenciais: ['Padre', 'Sacerdote'],
        dataCriacao: new Date().toISOString()
      });

      setNomeNovoSacerdote('');
      setModalSacerdoteAberto(false);
      fetchUsuarios(); 
    } catch (error) {
      console.error("Erro ao cadastrar sacerdote manual:", error);
      alert("Houve um erro ao cadastrar.");
    } finally {
      setLoadingCadastro(false);
    }
  };

  const getCargoInfo = (nivel: string) => {
    if (nivel === 'super_admin') return { label: 'Master Admin', bg: 'bg-red-900', text: 'text-red-400', icon: <ShieldAlert className="w-5 h-5" /> };
    if (nivel === 'admin') return { label: 'Coordenador', bg: 'bg-slate-900', text: 'text-slate-400', icon: <Shield className="w-5 h-5" /> };
    return { label: 'Membro', bg: 'bg-slate-100', text: 'text-slate-400', icon: <UserIcon className="w-5 h-5" /> };
  };

  // Separação das listas
  const listaSacerdotes = usuarios.filter(u => (u.credenciais || []).includes('Padre') || (u.credenciais || []).includes('Sacerdote'));
  const listaMembros = usuarios.filter(u => !(u.credenciais || []).includes('Padre') && !(u.credenciais || []).includes('Sacerdote'));

  // Define qual lista será desenhada na tela
  const listaExibida = abaAtiva === 'membros' ? listaMembros : listaSacerdotes;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 pb-20 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onVoltar} className="p-2 text-slate-400 hover:text-[#EA9248] bg-slate-50 hover:bg-[#EA9248]/10 rounded-full transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Equipe {temAcessoSacerdotes && 'e Sacerdotes'}</h1>
              <p className="text-slate-500 text-sm">
                {isSuperAdmin ? 'Gerencie membros, credenciais e a lista clerical.' : 'Atribua as credenciais do seu ministério aos membros da equipe.'}
              </p>
            </div>
          </div>
          
          {/* Botão de Adicionar Sacerdote aparece apenas na aba Sacerdotes e para o Super Admin */}
          {isSuperAdmin && abaAtiva === 'sacerdotes' && (
            <button 
              onClick={() => setModalSacerdoteAberto(true)} 
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-2 transition-all shadow-md shrink-0 w-full sm:w-auto justify-center"
            >
              <UserPlus className="w-4 h-4" /> Adicionar Sacerdote
            </button>
          )}
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-2 custom-scrollbar">
          <button 
            onClick={() => setAbaAtiva('membros')} 
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm border ${
              abaAtiva === 'membros' 
              ? 'bg-slate-800 text-white border-transparent' 
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" /> Equipe Geral 
            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${abaAtiva === 'membros' ? 'bg-white/20' : 'bg-slate-100'}`}>{listaMembros.length}</span>
          </button>
          
          {/* Aba de Sacerdotes protegida pela variável temAcessoSacerdotes */}
          {temAcessoSacerdotes && (
            <button 
              onClick={() => setAbaAtiva('sacerdotes')} 
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm border ${
                abaAtiva === 'sacerdotes' 
                ? 'bg-indigo-600 text-white border-transparent' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Church className="w-4 h-4" /> Sacerdotes 
              <span className={`text-[10px] px-2 py-0.5 rounded-lg ${abaAtiva === 'sacerdotes' ? 'bg-white/20' : 'bg-slate-100'}`}>{listaSacerdotes.length}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-20 font-medium animate-pulse">Carregando lista...</div>
        ) : (
          <div className="grid gap-4">
            {listaExibida.length === 0 ? (
              <div className="text-center bg-white border border-slate-200 rounded-3xl p-10 text-slate-500">
                Nenhum registro encontrado nesta aba.
              </div>
            ) : listaExibida.map((user) => {
              const cargo = getCargoInfo(user.nivel);
              const creds = user.credenciais || [];
              const ehSacerdote = creds.includes('Padre') || creds.includes('Sacerdote');
              
              return (
                <div key={user.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${!user.aprovado ? 'border-[#EA9248]' : 'border-slate-200'} flex flex-col gap-4 animate-fadeIn`}>
                  
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${cargo.bg} ${cargo.text}`}>
                        {cargo.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          {user.nome} 
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">({cargo.label})</span>
                        </h3>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                        {!user.aprovado && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-widest text-[#EA9248] bg-[#EA9248]/10 px-2 py-0.5 rounded-full">
                            Aguardando Aprovação
                          </span>
                        )}
                      </div>
                    </div>

                    {isSuperAdmin && user.nivel !== 'super_admin' && (
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button 
                          onClick={() => handleAprovar(user.id, user.aprovado, user.nivel)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                            user.aprovado ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600' : 'bg-[#EA9248] text-white shadow-md hover:bg-[#d58440]'
                          }`}
                        >
                          {user.aprovado ? <><XCircle className="w-4 h-4" /> Revogar</> : <><CheckCircle2 className="w-4 h-4" /> Aprovar</>}
                        </button>
                        
                        {user.aprovado && !ehSacerdote && (
                          <button 
                            onClick={() => handleNivel(user.id, user.nivel)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                              user.nivel === 'admin' ? 'border-slate-800 text-slate-800 hover:bg-slate-100' : 'border-slate-200 text-slate-500 hover:border-[#EA9248]'
                            }`}
                          >
                            {user.nivel === 'admin' ? 'Rebaixar' : 'Promover Coordenador'}
                          </button>
                        )}

                        {user.aprovado && ehSacerdote && onAbrirFichaPadre && (
                          <button 
                            onClick={() => onAbrirFichaPadre(user.id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white flex items-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" /> Ficha Cadastral
                          </button>
                        )}

                      </div>
                    )}
                  </div>

                  {user.aprovado && abaAtiva === 'membros' && (
                    <div className="mt-2 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Credenciais e Nomenclaturas</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {LISTA_MINISTERIOS.map(min => {
                          const temCredencial = creds.includes(min);
                          const bloqueadoParaAdmin = !isSuperAdmin && !credenciaisAdminLogado.includes(min);

                          return (
                            <button
                              key={min}
                              onClick={() => toggleCredencial(user.id, min, creds)}
                              disabled={bloqueadoParaAdmin}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                temCredencial 
                                ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20 hover:bg-blue-600' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-500'
                              } ${bloqueadoParaAdmin ? 'opacity-50 cursor-not-allowed hover:border-slate-200 hover:text-slate-400' : ''}`}
                            >
                              {min}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO MANUAL DE SACERDOTE */}
      {modalSacerdoteAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Cadastrar Sacerdote</h3>
              <button onClick={() => setModalSacerdoteAberto(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Crie um perfil manual para que este sacerdote apareça na Agenda Litúrgica.</p>
            
            <form onSubmit={handleCadastrarSacerdoteManual}>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome de Tratamento</label>
              <input 
                type="text" 
                placeholder="Ex: Pe. João Silva" 
                required
                value={nomeNovoSacerdote} 
                onChange={(e) => setNomeNovoSacerdote(e.target.value)} 
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none mb-6" 
              />
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalSacerdoteAberto(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={loadingCadastro} className="flex-1 py-3 text-white font-bold rounded-xl text-xs uppercase shadow-md bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loadingCadastro ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }`}} />
    </div>
  );
}