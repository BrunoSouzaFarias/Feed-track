import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where,
  runTransaction, writeBatch,
} from 'firebase/firestore';
import { db, Timestamp } from '../firebase';
import type { User, Badge, PDIGoal, SelfAssessment } from '../types';
import { auditService } from './auditService';
import { offlineSyncService } from './offlineSyncService';
import { hasMockCredential, setMockCredential } from './credentialUtils';
import { isFirebaseMock } from './env';
import { AppError } from './errors';

// Senha das contas de DEMONSTRAÇÃO (somente modo mock — bloqueado em produção
// por `isMockBlocked`). Documentada no README para testadores.
const DEMO_SEED_PASSWORD = 'liberty123';

const MOCK_USERS_KEY = 'feed_track_mock_users';
const MOCK_ASSESSMENTS_KEY = 'feed_track_mock_assessments';

const defaultTechnicians: User[] = [
  {
    uid: 'tech1',
    name: 'Ana Silva',
    email: 'ana.silva@liberty.com',
    role: 'technician',
    team: 'back-office',
    position: 'Agente N1',
    active: true,
    createdAt: Timestamp.now(),
    badges: [
      { id: 'b1', title: 'PDI Iniciado', description: 'Iniciou seu primeiro plano de desenvolvimento', icon: 'Star', earnedAt: Timestamp.now() }
    ],
    structuredPDI: [
      { id: 'pdi1', title: 'Certificação de Sistemas N1', description: 'Completar o treinamento básico dos sistemas de atendimento.', deadline: '2026-06-30', status: 'completed', createdAt: Timestamp.now() },
      { id: 'pdi2', title: 'Melhoria de SLA', description: 'Reduzir tempo médio de atendimento de 8 min para 5 min.', deadline: '2026-07-15', status: 'in_progress', createdAt: Timestamp.now() }
    ]
  },
  {
    uid: 'tech2',
    name: 'Bruno Souza',
    email: 'bruno.souza@liberty.com',
    role: 'technician',
    team: 'teleservice',
    position: 'Analista de Atendimento',
    active: true,
    createdAt: Timestamp.now(),
    badges: [],
    structuredPDI: [
      { id: 'pdi3', title: 'Feedback de Clientes', description: 'Atingir 90% de feedbacks positivos dos clientes.', deadline: '2026-06-25', status: 'completed', createdAt: Timestamp.now() }
    ]
  },
  {
    uid: 'tech3',
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@liberty.com',
    role: 'technician',
    team: 'teleservice',
    position: 'Agente N2',
    active: true,
    createdAt: Timestamp.now(),
    badges: [],
    structuredPDI: [
      { id: 'pdi4', title: 'Treinamento de Liderança', description: 'Realizar o curso introdutório de liderança situacional.', deadline: '2026-07-01', status: 'pending', createdAt: Timestamp.now() }
    ]
  }
];

const defaultSupervisor: User = {
  uid: 'sup1',
  name: 'Rodrigo Supervisor',
  email: 'rodrigo.supervisor@liberty.com',
  role: 'supervisor',
  team: 'back-office',
  position: 'Supervisor de Atendimento N1',
  active: true,
  createdAt: Timestamp.now(),
  badges: [],
  structuredPDI: []
};

const defaultSelfAssessments = [
  {
    id: 'sa1',
    technicianId: 'tech1',
    period: '2026-Q2',
    scores: {
      communication: 4,
      teamwork: 4,
      technical: 3,
      proactivity: 4,
      attendance: 5
    },
    comments: 'Tenho me esforçado bastante para cumprir os prazos e apoiar a equipe nas demandas mais complexas.',
    createdAt: Timestamp.now()
  },
  {
    id: 'sa2',
    technicianId: 'tech2',
    period: '2026-Q2',
    scores: {
      communication: 3,
      teamwork: 3,
      technical: 5,
      proactivity: 4,
      attendance: 3
    },
    comments: 'Foco técnico excelente, mas preciso aprimorar minha comunicação nas reuniões gerais.',
    createdAt: Timestamp.now()
  },
  {
    id: 'sa3',
    technicianId: 'tech3',
    period: '2026-Q2',
    scores: {
      communication: 5,
      teamwork: 5,
      technical: 4,
      proactivity: 5,
      attendance: 4
    },
    comments: 'Busco sempre liderar pelo exemplo e apoiar meus colegas de equipe.',
    createdAt: Timestamp.now()
  }
];

// Semeia o "banco" local APENAS em modo mock. Em modo Firebase nada é gravado
// no localStorage (evita vazar dados pessoais entre usuários do mesmo navegador).
if (isFirebaseMock) {
  if (!localStorage.getItem(MOCK_USERS_KEY)) {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([defaultSupervisor, ...defaultTechnicians]));
  }
  if (!localStorage.getItem(MOCK_ASSESSMENTS_KEY)) {
    localStorage.setItem(MOCK_ASSESSMENTS_KEY, JSON.stringify(defaultSelfAssessments));
  }
  void (async () => {
    for (const seedUser of [defaultSupervisor, ...defaultTechnicians]) {
      if (!hasMockCredential(seedUser.uid)) await setMockCredential(seedUser.uid, DEMO_SEED_PASSWORD);
    }
  })();
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
const getMockUsers = (): User[] => readJson<User>(MOCK_USERS_KEY);
const saveMockUsers = (users: User[]) => localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
const getMockAssessments = (): SelfAssessment[] => readJson<SelfAssessment>(MOCK_ASSESSMENTS_KEY);

/**
 * Lê-modifica-grava um usuário de forma ATÔMICA (transação) quando online,
 * evitando que duas abas / supervisor + técnico se sobrescrevam (arrays de
 * PDI e badges). Offline cai em leitura do cache + updateDoc enfileirado pelo SDK.
 */
async function mutateUser(uid: string, fn: (u: User) => Partial<User> | null): Promise<void> {
  if (isFirebaseMock) {
    const users = getMockUsers();
    const idx = users.findIndex((u) => u.uid === uid);
    if (idx === -1) throw new AppError('Usuário não encontrado.');
    const patch = fn(users[idx]);
    if (patch) {
      users[idx] = { ...users[idx], ...patch };
      saveMockUsers(users);
    }
    return;
  }
  const ref = doc(db, 'users', uid);
  if (offlineSyncService.isOnline()) {
    await offlineSyncService.run(() =>
      runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new AppError('Usuário não encontrado.');
        const patch = fn(snap.data() as User);
        if (patch) tx.update(ref, patch);
      }), 'atualização de perfil');
    return;
  }
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('Usuário não encontrado.');
  const patch = fn(snap.data() as User);
  if (patch) await offlineSyncService.run(() => updateDoc(ref, patch), 'atualização de perfil');
}

export const userService = {
  async getUser(uid: string): Promise<User | null> {
    if (isFirebaseMock) return getMockUsers().find((u) => u.uid === uid) ?? null;
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  async createUser(user: User): Promise<void> {
    if (isFirebaseMock) {
      const users = getMockUsers();
      if (!users.some((u) => u.uid === user.uid)) saveMockUsers([...users, user]);
      return;
    }
    await offlineSyncService.run(() => setDoc(doc(db, 'users', user.uid), user), 'cadastro');
  },

  async getAllTechnicians(): Promise<User[]> {
    if (isFirebaseMock) return getMockUsers().filter((u) => u.role === 'technician');
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'technician')));
    return snap.docs.map((d) => d.data() as User);
  },

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    if (isFirebaseMock) {
      await mutateUser(uid, () => data);
      return;
    }
    await offlineSyncService.run(() => updateDoc(doc(db, 'users', uid), data), 'atualização de perfil');
  },

  async toggleUserActive(uid: string, active: boolean): Promise<void> {
    return this.updateUser(uid, { active });
  },

  // --- PDI --------------------------------------------------------------
  async addPDIGoal(uid: string, goal: PDIGoal): Promise<void> {
    await mutateUser(uid, (u) => ({ structuredPDI: [...(u.structuredPDI ?? []), goal] }));
  },

  async updatePDIGoalStatus(uid: string, goalId: string, status: PDIGoal['status']): Promise<void> {
    let goalToLog: PDIGoal | undefined;
    let userName = '';
    await mutateUser(uid, (u) => {
      userName = u.name;
      goalToLog = (u.structuredPDI ?? []).find((g) => g.id === goalId);
      if (!goalToLog) throw new AppError('Meta do PDI não encontrada.');
      return {
        structuredPDI: u.structuredPDI.map((g) =>
          g.id !== goalId ? g
            : status === 'completed' ? { ...g, status, completedAt: Timestamp.now() } : { ...g, status }),
      };
    });

    if (status === 'completed' && goalToLog && (goalToLog as PDIGoal).status !== 'completed') {
      await auditService.registerLog('pdi_goal_completion', goalId, uid, userName, {
        goalId,
        goalTitle: (goalToLog as PDIGoal).title,
        technicianId: uid,
        completedAt: new Date().toISOString(),
      });
    }
  },

  // --- Badges -----------------------------------------------------------
  async addBadge(uid: string, badge: Badge): Promise<void> {
    await mutateUser(uid, (u) =>
      u.badges?.some((b) => b.id === badge.id) ? null : { badges: [...(u.badges ?? []), badge] });
  },

  // --- Autoavaliações ---------------------------------------------------
  async submitSelfAssessment(assessment: SelfAssessment): Promise<void> {
    if (isFirebaseMock) {
      localStorage.setItem(MOCK_ASSESSMENTS_KEY, JSON.stringify([...getMockAssessments(), assessment]));
      return;
    }
    await offlineSyncService.run(() => setDoc(doc(db, 'selfAssessments', assessment.id), assessment), 'autoavaliação');
  },

  async getSelfAssessments(technicianId?: string): Promise<SelfAssessment[]> {
    if (isFirebaseMock) {
      const all = getMockAssessments();
      return technicianId ? all.filter((a) => a.technicianId === technicianId) : all;
    }
    const col = collection(db, 'selfAssessments');
    const snap = await getDocs(technicianId ? query(col, where('technicianId', '==', technicianId)) : query(col));
    return snap.docs.map((d) => d.data() as SelfAssessment);
  },

  /**
   * Remove o perfil e os dados pessoais do colaborador (feedbacks e
   * autoavaliações). Os logs de auditoria são imutáveis e mantidos por
   * obrigação de conformidade. A conta do Firebase Auth NÃO pode ser apagada
   * pelo cliente — sem perfil, o login é recusado (ver useAuth); a remoção
   * definitiva da conta exige Admin SDK / Cloud Function.
   */
  async deleteUser(uid: string): Promise<void> {
    if (isFirebaseMock) {
      saveMockUsers(getMockUsers().filter((u) => u.uid !== uid));
      return;
    }
    await offlineSyncService.run(async () => {
      for (const name of ['feedbacks', 'selfAssessments'] as const) {
        const snap = await getDocs(query(collection(db, name), where('technicianId', '==', uid)));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      await deleteDoc(doc(db, 'users', uid));
    }, 'exclusão');
  },
};
