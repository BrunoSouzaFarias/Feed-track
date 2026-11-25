import { createContext, useContext, useEffect, useRef, useState, createElement } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  getAuth,
} from 'firebase/auth';
import { auth, db, firebaseConfig } from '../firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { User } from '../types';
import { userService } from '../services/userService';
import { setMockCredential, verifyMockCredential } from '../services/credentialUtils';
import { isFirebaseMock } from '../services/env';
import { AppError, friendlyError } from '../services/errors';
import { newId } from '../services/ids';
import { sessionHint } from '../services/sessionHint';
import { purgeLegacyLocalData } from '../services/legacyCleanup';
import { scope } from '../services/scope';
import { validatePassword } from '../services/passwordPolicy';
import { signupService } from '../services/signupService';
import toast from 'react-hot-toast';

type Team = 'back-office' | 'teleservice';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  login: (email: string, pass: string) => Promise<User>;
  /** Cadastro público: SEMPRE cria técnico. */
  register: (name: string, email: string, pass: string, team: Team, position: string) => Promise<User>;
  logout: () => Promise<void>;
  createTechnicianBySupervisor: (name: string, email: string, pass: string, team: Team, position: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USERS_KEY = 'feed_track_mock_users';
const MOCK_SESSION_KEY = 'feed_track_active_uid';

const readMockUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Proteção básica contra força bruta no cliente (o Firebase também limita no
// servidor; isto reduz ruído e dá feedback imediato).
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
const attempts = { count: 0, lockedUntil: 0 };

function assertNotLockedOut() {
  const remaining = attempts.lockedUntil - Date.now();
  if (remaining > 0) {
    throw new AppError(`Muitas tentativas. Aguarde ${Math.ceil(remaining / 1000)}s e tente novamente.`);
  }
}
function registerFailure() {
  attempts.count += 1;
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_MS;
    attempts.count = 0;
  }
}

function newProfile(uid: string, name: string, email: string, team: Team, position: string): User {
  return {
    uid, name: name.trim(), email: email.trim(), role: 'technician', team,
    position: position.trim(), active: true, createdAt: Timestamp.now(), badges: [], structuredPDI: [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  // O escopo é definido SÍNCRONO junto com o usuário: effects dos filhos (que já buscam dados) rodam antes dos do pai.
  const setUser = (u: User | null) => { scope.set(u); setUserState(u); };
  // Em modo mock sem sessão não há nada a restaurar: já nasce "carregado" (sem setState síncrono no effect).
  const [loading, setLoading] = useState(() => !(isFirebaseMock && !sessionStorage.getItem(MOCK_SESSION_KEY)));
  const [emailVerified, setEmailVerified] = useState(true);
  // Evita a corrida "conta criada no Auth → listener roda antes do perfil existir".
  const registeringRef = useRef(false);

  useEffect(() => {
    if (isFirebaseMock) {
      const activeUid = sessionStorage.getItem(MOCK_SESSION_KEY);
      if (!activeUid) {
        sessionHint.clear();
        return;
      }
      userService.getUser(activeUid).then((dbUser) => {
        if (dbUser && dbUser.active !== false) {
          setUser(dbUser);
          sessionHint.set();
        } else {
          sessionStorage.removeItem(MOCK_SESSION_KEY);
          sessionHint.clear();
        }
      }).catch((err) => {
        console.error('Error restoring mock session:', err);
        sessionStorage.removeItem(MOCK_SESSION_KEY);
        sessionHint.clear();
      }).finally(() => setLoading(false));
      return;
    }

    purgeLegacyLocalData();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (registeringRef.current) return; // register() assume o controle do estado
      if (!firebaseUser) {
        setUser(null);
        sessionHint.clear();
        setLoading(false);
        return;
      }
      try {
        // getDoc direto: erro transitório LANÇA (não vira "perfil inexistente").
        const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!docSnap.exists()) {
          // Conta sem perfil (ex.: excluída pelo supervisor): NÃO ressuscitar.
          await signOut(auth);
          setUser(null);
          sessionHint.clear();
          toast.error('Perfil não encontrado. Procure seu supervisor.');
          return;
        }
        const dbUser = docSnap.data() as User;
        if (dbUser.active === false) {
          await signOut(auth);
          setUser(null);
          sessionHint.clear();
          toast.error('Esta conta foi desativada pelo supervisor.');
          return;
        }
        setEmailVerified(firebaseUser.emailVerified);
        setUser(dbUser);
        sessionHint.set();
      } catch (err) {
        console.error('Could not verify user profile:', err);
        setUser(null);
        toast.error('Não foi possível verificar sua sessão. Tente novamente.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    assertNotLockedOut();
    setLoading(true);
    try {
      if (isFirebaseMock) {
        const found = readMockUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        // Mensagem única: não revela se o e-mail existe (evita enumeração).
        if (!found || !(await verifyMockCredential(found.uid, pass))) {
          registerFailure();
          throw new AppError('E-mail ou senha inválidos.');
        }
        if (found.active === false) throw new AppError('Esta conta foi desativada pelo supervisor.');
        attempts.count = 0;
        sessionStorage.setItem(MOCK_SESSION_KEY, found.uid);
        sessionHint.set();
        setUser(found);
        return found;
      }

      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      } catch (err) {
        registerFailure();
        throw new AppError(friendlyError(err, 'Falha ao autenticar.'));
      }
      const dbUser = await userService.getUser(credential.user.uid);
      if (!dbUser) {
        await signOut(auth);
        throw new AppError('Perfil não encontrado. Procure seu supervisor.');
      }
      if (dbUser.active === false) {
        await signOut(auth);
        throw new AppError('Esta conta foi desativada pelo supervisor.');
      }
      attempts.count = 0;
      setEmailVerified(credential.user.emailVerified);
      sessionHint.set();
      setUser(dbUser);
      return dbUser;
    } finally {
      setLoading(false);
    }
  };

  const register: AuthContextType['register'] = async (name, email, pass, team, position) => {
    const policyError = validatePassword(pass);
    if (policyError) throw new AppError(policyError);
    // Restrição opcional do cadastro público a um domínio corporativo
    // (VITE_ALLOWED_EMAIL_DOMAIN=empresa.com). Defesa em profundidade: o
    // controle forte deve ser feito no servidor (ver docs/SECURITY.md).
    const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
    if (allowedDomain && !email.trim().toLowerCase().endsWith(`@${allowedDomain}`)) {
      throw new AppError(`Use seu e-mail corporativo (@${allowedDomain}).`);
    }
    setLoading(true);
    try {
      if (isFirebaseMock) {
        if (!(await signupService.isOpen())) throw new AppError('O cadastro público está desativado. Peça a um supervisor para criar sua conta.');
        const users = readMockUsers();
        if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new AppError('Este e-mail já está cadastrado.');
        }
        const created = newProfile(newId('mock_user'), name, email, team, position);
        localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([...users, created]));
        await setMockCredential(created.uid, pass);
        sessionStorage.setItem(MOCK_SESSION_KEY, created.uid);
        sessionHint.set();
        setUser(created);
        return created;
      }

      registeringRef.current = true;
      try {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        const created = newProfile(credential.user.uid, name, email, team, position);
        try {
          await userService.createUser(created);
        } catch (err) {
          // Não deixar conta órfã (Auth sem perfil): desfaz o cadastro.
          await credential.user.delete().catch(() => signOut(auth));
          throw err;
        }
        sendEmailVerification(credential.user).catch((e) => console.warn('Verification e-mail failed:', e));
        setEmailVerified(false);
        sessionHint.set();
        setUser(created);
        return created;
      } catch (err) {
        throw err instanceof AppError ? err : new AppError(friendlyError(err, 'Não foi possível concluir o cadastro.'));
      } finally {
        registeringRef.current = false;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isFirebaseMock) {
        sessionStorage.removeItem(MOCK_SESSION_KEY);
      } else {
        await signOut(auth);
        purgeLegacyLocalData();
      }
      sessionHint.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const createTechnicianBySupervisor: AuthContextType['createTechnicianBySupervisor'] = async (name, email, pass, team, position) => {
    if (user?.role !== 'supervisor') throw new AppError('Apenas supervisores podem criar colaboradores.');
    const policyError = validatePassword(pass);
    if (policyError) throw new AppError(policyError);

    if (isFirebaseMock) {
      const users = readMockUsers();
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw new AppError('Este e-mail já está cadastrado.');
      }
      const tech = newProfile(newId('mock_user'), name, email, team, position);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([...users, tech]));
      await setMockCredential(tech.uid, pass);
      return;
    }

    // Conta criada em uma instância SECUNDÁRIA para não derrubar a sessão do supervisor.
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${newId('app')}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), pass);
      try {
        await userService.createUser(newProfile(credential.user.uid, name, email, team, position));
      } catch (err) {
        await credential.user.delete().catch(() => undefined);
        throw err;
      }
      sendEmailVerification(credential.user).catch(() => undefined);
    } catch (err) {
      throw err instanceof AppError ? err : new AppError(friendlyError(err, 'Não foi possível criar o colaborador.'));
    } finally {
      await signOut(secondaryAuth).catch(() => undefined);
      await deleteApp(secondaryApp).catch(() => undefined);
    }
    // O colaborador define a própria senha no primeiro acesso (a do supervisor é provisória).
    await sendPasswordResetEmail(auth, email.trim()).catch(() => undefined);
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    // Resposta sempre igual: não revela se o e-mail está cadastrado.
    if (isFirebaseMock) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found') return;
      throw new AppError(friendlyError(err, 'Erro ao enviar e-mail de recuperação.'));
    }
  };

  return createElement(
    AuthContext.Provider,
    { value: { user, loading, emailVerified, login, register, logout, createTechnicianBySupervisor, sendPasswordReset } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
