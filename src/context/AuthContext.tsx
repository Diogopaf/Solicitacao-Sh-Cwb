import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any; // Dados extras do Firestore (nível de acesso, etc)
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, userData: null });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Busca os dados de permissão no Firestore
        const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
        
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          // Se for o primeiro login, cria o registro como pendente
          const novoUsuario = {
            nome: currentUser.displayName,
            email: currentUser.email,
            nivel: 'membro', // Níveis: admin, membro
            aprovado: false,
            dataCriacao: new Date().toISOString()
          };
          await setDoc(doc(db, "usuarios", currentUser.uid), novoUsuario);
          setUserData(novoUsuario);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);