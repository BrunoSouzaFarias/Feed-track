import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, Timestamp } from '../firebase';
import type { User, Badge, PDIGoal, SelfAssessment } from '../types';
import { auditService } from './auditService';
import { offlineSyncService } from './offlineSyncService';
import { hasMockCredential, setMockCredential } from './credentialUtils';

// Demo password for the seeded mock accounts below — shown here (not on the
// User object) so it never appears in exports/PDFs; documented for testers
// in README.md.
const DEMO_SEED_PASSWORD = 'liberty123';

const isFirebaseMock = !import.meta.env.VITE_FIREBASE_API_KEY || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('mock') || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('dummy');

// --- LOCAL STORAGE MOCK DB INITIALIZATION ---
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

// Initialize localStorage mock data if empty
if (!localStorage.getItem(MOCK_USERS_KEY)) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([defaultSupervisor, ...defaultTechnicians]));
}
if (!localStorage.getItem(MOCK_ASSESSMENTS_KEY)) {
  localStorage.setItem(MOCK_ASSESSMENTS_KEY, JSON.stringify(defaultSelfAssessments));
}

// Seed a known demo password for the seeded accounts above so mock-mode login
// (which now verifies passwords) still works for testers. Fire-and-forget:
// this only fills in credentials that don't exist yet.
void (async () => {
  for (const seedUser of [defaultSupervisor, ...defaultTechnicians]) {
    if (!hasMockCredential(seedUser.uid)) {
      await setMockCredential(seedUser.uid, DEMO_SEED_PASSWORD);
    }
  }
})();

const getMockUsers = (): User[] => {
  const users = localStorage.getItem(MOCK_USERS_KEY);
  return users ? JSON.parse(users) : [];
};

const saveMockUsers = (users: User[]) => {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

// --- SERVICE IMPLEMENTATION ---

export const userService = {
  async getUser(uid: string): Promise<User | null> {
    if (offlineSyncService.isOnline() && !isFirebaseMock) {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedUser = docSnap.data() as User;
          // Cache user locally
          const users = getMockUsers();
          const idx = users.findIndex(u => u.uid === uid);
          if (idx !== -1) {
            users[idx] = fetchedUser;
          } else {
            users.push(fetchedUser);
          }
          saveMockUsers(users);
          return fetchedUser;
        }
      } catch (error) {
        console.error("Firebase error getting user, falling back to cache:", error);
      }
    }
    
    // Offline, mock or firebase failed: return local cache
    const users = getMockUsers();
    return users.find(u => u.uid === uid) || null;
  },

  async createUser(user: User): Promise<void> {
    // 1. Save to local cache first
    const users = getMockUsers();
    if (!users.some(u => u.uid === user.uid)) {
      users.push(user);
      saveMockUsers(users);
    }

    // 2. Write to Firestore if online and not mock, otherwise enqueue
    if (!isFirebaseMock && offlineSyncService.isOnline()) {
      try {
        await setDoc(doc(db, 'users', user.uid), user);
      } catch (error) {
        console.error("Firebase error creating user, enqueueing for sync:", error);
        offlineSyncService.enqueue('createUser', user);
      }
    } else if (!offlineSyncService.isOnline()) {
      offlineSyncService.enqueue('createUser', user);
    }
  },

  async getAllTechnicians(): Promise<User[]> {
    if (offlineSyncService.isOnline() && !isFirebaseMock) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'technician'));
        const querySnapshot = await getDocs(q);
        const list: User[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as User);
        });

        // Sync local cache with Firestore technicians
        const cachedUsers = getMockUsers();
        const updatedUsers = [...cachedUsers];
        list.forEach(tech => {
          const idx = updatedUsers.findIndex(u => u.uid === tech.uid);
          if (idx !== -1) {
            updatedUsers[idx] = tech;
          } else {
            updatedUsers.push(tech);
          }
        });
        saveMockUsers(updatedUsers);

        return list;
      } catch (error) {
        console.error("Firebase error getting technicians, falling back to cache:", error);
      }
    }

    // Offline or mock or firebase failed: return cache
    return getMockUsers().filter(u => u.role === 'technician');
  },

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    // 1. Update local cache first
    const users = getMockUsers();
    const idx = users.findIndex(u => u.uid === uid);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...data } as User;
      saveMockUsers(users);
    }

    // 2. Update Firestore if online and not mock, otherwise enqueue
    if (!isFirebaseMock && offlineSyncService.isOnline()) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
      } catch (error) {
        console.error("Firebase error updating user, enqueueing for sync:", error);
        offlineSyncService.enqueue('updateUser', { uid, data });
      }
    } else if (!offlineSyncService.isOnline()) {
      offlineSyncService.enqueue('updateUser', { uid, data });
    }
  },

  async toggleUserActive(uid: string, active: boolean): Promise<void> {
    return this.updateUser(uid, { active });
  },

  // PDI objectives management
  async addPDIGoal(uid: string, goal: PDIGoal): Promise<void> {
    const user = await this.getUser(uid);
    if (!user) return;
    const structuredPDI = [...(user.structuredPDI || []), goal];
    await this.updateUser(uid, { structuredPDI });
  },

  async updatePDIGoalStatus(uid: string, goalId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    const user = await this.getUser(uid);
    if (!user) return;
    
    const goalToLog = (user.structuredPDI || []).find(g => g.id === goalId);

    const structuredPDI = (user.structuredPDI || []).map(g => {
      if (g.id === goalId) {
        return status === 'completed' ? { ...g, status, completedAt: Timestamp.now() } : { ...g, status };
      }
      return g;
    });
    
    await this.updateUser(uid, { structuredPDI });

    if (status === 'completed' && goalToLog) {
      try {
        await auditService.registerLog(
          'pdi_goal_completion',
          goalId,
          user.uid,
          user.name,
          {
            goalId,
            goalTitle: goalToLog.title,
            technicianId: user.uid,
            completedAt: new Date().toISOString()
          }
        );
      } catch (err) {
        console.error("Error creating audit log for PDI goal completion:", err);
      }
    }
  },

  // Badges Management
  async addBadge(uid: string, badge: Badge): Promise<void> {
    const user = await this.getUser(uid);
    if (!user) return;
    // Evitar duplicar badges pelo ID
    if (user.badges?.some(b => b.id === badge.id)) return;
    const badges = [...(user.badges || []), badge];
    await this.updateUser(uid, { badges });
  },

  // Self assessment Management
  async submitSelfAssessment(assessment: SelfAssessment): Promise<void> {
    // 1. Update local cache first
    const assessmentsRaw = localStorage.getItem(MOCK_ASSESSMENTS_KEY);
    const assessments: SelfAssessment[] = assessmentsRaw ? JSON.parse(assessmentsRaw) : [];
    assessments.push(assessment);
    localStorage.setItem(MOCK_ASSESSMENTS_KEY, JSON.stringify(assessments));

    // 2. Write to Firestore if online and not mock, otherwise enqueue
    if (!isFirebaseMock && offlineSyncService.isOnline()) {
      try {
        await setDoc(doc(db, 'selfAssessments', assessment.id), assessment);
      } catch (error) {
        console.error("Firebase error submitting assessment, enqueueing for sync:", error);
        offlineSyncService.enqueue('submitSelfAssessment', assessment);
      }
    } else if (!offlineSyncService.isOnline()) {
      offlineSyncService.enqueue('submitSelfAssessment', assessment);
    }
  },

  async getSelfAssessments(technicianId?: string): Promise<SelfAssessment[]> {
    if (offlineSyncService.isOnline() && !isFirebaseMock) {
      try {
        let q = query(collection(db, 'selfAssessments'));
        if (technicianId) {
          q = query(collection(db, 'selfAssessments'), where('technicianId', '==', technicianId));
        }
        const querySnapshot = await getDocs(q);
        const list: SelfAssessment[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as SelfAssessment);
        });

        // Sync local cache
        const assessmentsRaw = localStorage.getItem(MOCK_ASSESSMENTS_KEY);
        const cachedAssessments: SelfAssessment[] = assessmentsRaw ? JSON.parse(assessmentsRaw) : [];
        const updatedAssessments = [...cachedAssessments];
        list.forEach(assessment => {
          const idx = updatedAssessments.findIndex(a => a.id === assessment.id);
          if (idx !== -1) {
            updatedAssessments[idx] = assessment;
          } else {
            updatedAssessments.push(assessment);
          }
        });
        localStorage.setItem(MOCK_ASSESSMENTS_KEY, JSON.stringify(updatedAssessments));

        return list;
      } catch (error) {
        console.error("Firebase error getting self assessments, falling back to cache:", error);
      }
    }

    // Offline or mock or firebase failed: return cache
    const assessmentsRaw = localStorage.getItem(MOCK_ASSESSMENTS_KEY);
    const assessments: SelfAssessment[] = assessmentsRaw ? JSON.parse(assessmentsRaw) : [];
    if (technicianId) {
      return assessments.filter(a => a.technicianId === technicianId);
    }
    return assessments;
  },

  async deleteUser(uid: string): Promise<void> {
    // 1. Delete from local cache
    const users = getMockUsers();
    const filtered = users.filter(u => u.uid !== uid);
    saveMockUsers(filtered);

    // 2. Delete from Firestore if online and not mock
    if (!isFirebaseMock && offlineSyncService.isOnline()) {
      try {
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
      } catch (error) {
        console.error("Firebase error deleting user, enqueueing for sync:", error);
        offlineSyncService.enqueue('deleteUser', uid);
      }
    } else if (!offlineSyncService.isOnline()) {
      offlineSyncService.enqueue('deleteUser', uid);
    }
  }
};
