// Importação das funções principais do Firebase
import { initializeApp } from "firebase/app";
// Importação das funções de Autenticação (Login com Google)
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// Importação do Banco de Dados (Firestore)
import { getFirestore } from "firebase/firestore";

// Configuração do seu projeto Firebase (solicitacao-sh-curitiba)
const firebaseConfig = {
  apiKey: "AIzaSyBF-b2nV6KIYdmVZL2y5Gzy4Mp1ZsomF98",
  authDomain: "solicitacao-sh-curitiba.firebaseapp.com",
  projectId: "solicitacao-sh-curitiba",
  storageBucket: "solicitacao-sh-curitiba.firebasestorage.app",
  messagingSenderId: "283676767754",
  appId: "1:283676767754:web:557f4c4ee91e65cff6d1f3",
  measurementId: "G-J5ZMSZ2KNH"
};

// Inicializa o Firebase com as credenciais acima
const app = initializeApp(firebaseConfig);

// Exportamos as instâncias para podermos usá-las em outras partes do nosso código
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Força o pop-up do Google a sempre perguntar com qual conta deseja logar.
// Isso é ótimo para você conseguir testar entrando como Admin e depois como membro comum.
googleProvider.setCustomParameters({ prompt: 'select_account' });