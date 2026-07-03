import { createContext, useContext, useEffect, useState, createElement } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  getAuth
} from 'firebase/auth';
import { auth, db, firebaseConfig } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '../types';
import { userService } from '../services/userService';
import { Timestamp } from 'firebase/firestore';
import { nowTimestamp } from '../services/dateUtils';
import { setMockCredential, verifyMockCredential } from '../services/credentialUtils';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string, team: 'back-office' | 'teleservice', position: string, role?: 'technician' | 'supervisor') => Promise<User>;
  logout: () => Promise<void>;
  createTechnicianBySupervisor: (name: string, email: string, pass: string, team: 'back-office' | 'teleservice', position: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isFirebaseMock = !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY.includes('mock') ||
  import.meta.env.VITE_FIREBASE_API_KEY.includes('dummy');

// Session storage helpers — preferem sessionStorage para não expor UID entre abas/sessões
const session = {
  get: (key: string) => sessionStorage.getItem(key),
  set: (key: string, val: string) => sessionStorage.setItem(key, val),
  remove: (key: string) => { sessionStorage.removeItem(key); localStorage.removeItem(key); },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseMock) {
      const activeUid = session.get('feed_track_active_uid') ?? localStorage.getItem('feed_track_active_uid');
      if (activeUid) {
        userService.getUser(activeUid).then(dbUser => {
          if (dbUser) {
            setUser(dbUser);
            session.set('feed_track_logged_in', 'true');
          } else {
            session.remove('feed_track_active_uid');
            session.remove('feed_track_logged_in');
          }
          setLoading(false);
        }).catch(err => {
          console.error("Error restoring mock session, logging out:", err);
          session.remove('feed_track_active_uid');
          session.remove('feed_track_logged_in');
          setLoading(false);
        });
      } else {
        session.remove('feed_track_logged_in');
        setLoading(false);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        session.remove('feed_track_logged_in');
        setLoading(false);
        return;
      }

      try {
        // Read the Firestore doc directly (not via userService.getUser) so a
        // transient network/rules error THROWS instead of silently resolving
        // to null from an empty local cache — that distinction matters: only
        // a genuinely missing doc should trigger fallback-user creation.
        const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (docSnap.exists()) {
          const dbUser = docSnap.data() as User;
          setUser(dbUser);
          session.set('feed_track_logged_in', 'true');
        } else {
          // Firebase Auth user exists but has no Firestore profile yet — safe to create one.
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Novo Técnico',
            email: firebaseUser.email || '',
            role: 'technician',
            team: 'back-office',
            position: 'Agente N1',
            active: true,
            createdAt: Timestamp.now(),
            badges: [],
            structuredPDI: []
          };
          await userService.createUser(fallbackUser);
          setUser(fallbackUser);
          session.set('feed_track_logged_in', 'true');
        }
      } catch (err) {
        // Do NOT fabricate/overwrite a user doc on a transient failure — that
        // would clobber an existing profile (e.g. a supervisor's role/PDI data).
        console.error("Could not verify user profile, logging out safely:", err);
        setUser(null);
        toast.error('Não foi possível verificar sua sessão. Tente novamente.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      if (isFirebaseMock) {
        // Mock authentication check
        const usersRaw = localStorage.getItem('feed_track_mock_users');
        const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
        // Support standard mock accounts
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!found) {
          throw new Error("Usuário não encontrado.");
        }
        const passwordValid = await verifyMockCredential(found.uid, pass);
        if (!passwordValid) {
          throw new Error("E-mail ou senha inválidos.");
        }
        if (found.active === false) {
          throw new Error("Esta conta foi desativada pelo supervisor.");
        }
        session.set('feed_track_active_uid', found.uid);
        session.set('feed_track_logged_in', 'true');
        setUser(found);
        return found;
      }

      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const dbUser = await userService.getUser(credential.user.uid);
      if (!dbUser) {
        throw new Error("Usuário não encontrado nos registros.");
      }
      if (dbUser.active === false) {
        await signOut(auth);
        throw new Error("Esta conta foi desativada pelo supervisor.");
      }
      localStorage.setItem('feed_track_logged_in', 'true');
      setUser(dbUser);
      return dbUser;
    } catch (error: any) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string, 
    email: string, 
    pass: string, 
    team: 'back-office' | 'teleservice', 
    position: string,
    role: 'technician' | 'supervisor' = 'technician'
  ): Promise<User> => {
    setLoading(true);
    try {
      const uid = isFirebaseMock ? 'mock_user_' + Date.now() : '';
      const newUser: User = {
        uid: uid,
        name,
        email,
        role,
        team,
        position,
        active: true,
        createdAt: (isFirebaseMock ? nowTimestamp() : Timestamp.now()) as any,
        badges: [],
        structuredPDI: []
      };

      if (isFirebaseMock) {
        const usersRaw = localStorage.getItem('feed_track_mock_users');
        const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error("Este e-mail já está cadastrado.");
        }
        users.push(newUser);
        localStorage.setItem('feed_track_mock_users', JSON.stringify(users));
        await setMockCredential(uid, pass);
        session.set('feed_track_active_uid', uid);
        session.set('feed_track_logged_in', 'true');
        setUser(newUser);
        return newUser;
      }

      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      newUser.uid = credential.user.uid;
      await userService.createUser(newUser);
      localStorage.setItem('feed_track_logged_in', 'true');
      setUser(newUser);
      return newUser;
    } catch (error: any) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isFirebaseMock) {
        session.remove('feed_track_active_uid');
      } else {
        await signOut(auth);
      }
      localStorage.removeItem('feed_track_logged_in');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const createTechnicianBySupervisor = async (
    name: string,
    email: string,
    pass: string,
    team: 'back-office' | 'teleservice',
    position: string
  ): Promise<void> => {
    if (isFirebaseMock) {
      const usersRaw = localStorage.getItem('feed_track_mock_users');
      const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      const uid = 'mock_user_' + Date.now();
      const newTech: User = {
        uid,
        name,
        email,
        role: 'technician',
        team,
        position,
        active: true,
        createdAt: nowTimestamp() as any,
        badges: [],
        structuredPDI: []
      };
      users.push(newTech);
      localStorage.setItem('feed_track_mock_users', JSON.stringify(users));
      await setMockCredential(uid, pass);
      return;
    }

    // Create the Firebase Auth account on a SECONDARY app instance so the
    // supervisor's own session (on the default `auth` instance) is never
    // signed out or replaced by the new technician's session.
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
      const newTech: User = {
        uid: credential.user.uid,
        name,
        email,
        role: 'technician',
        team,
        position,
        active: true,
        createdAt: Timestamp.now(),
        badges: [],
        structuredPDI: []
      };
      await userService.createUser(newTech);
    } finally {
      await signOut(secondaryAuth).catch(() => {});
      await deleteApp(secondaryApp).catch(() => {});
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    if (isFirebaseMock) {
      const usersRaw = localStorage.getItem('feed_track_mock_users');
      const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
      const found = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (!found) {
        throw new Error("E-mail não cadastrado no sistema.");
      }
      return;
    }
    await sendPasswordResetEmail(auth, email);
  };

  return createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout, createTechnicianBySupervisor, sendPasswordReset } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
