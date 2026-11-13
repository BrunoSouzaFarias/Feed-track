import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'supervisor' | 'technician';
  team: 'back-office' | 'teleservice';
  position: string; // cargo: "Agente N1", "Analista", etc.
  photoURL?: string;
  phone?: string;
  active: boolean;
  createdAt: Timestamp;
  badges: Badge[];
  structuredPDI: PDIGoal[];
}

export interface Feedback {
  id: string;
  technicianId: string;
  technicianName: string;
  supervisorId: string;
  type: 'positive' | 'development';
  axis: string; // eixo/categoria
  description: string;
  status: 'pending' | 'read';
  readAt?: Timestamp;
  signedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface SelfAssessment {
  id: string;
  technicianId: string;
  period: string; // ex: "2026-Q2"
  scores: {
    communication: number; // 1-5
    teamwork: number;
    technical: number;
    proactivity: number;
    attendance: number;
  };
  comments: string;
  createdAt: Timestamp;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Timestamp; // usar Timestamp.now() — NUNCA serverTimestamp() em arrays
}

export interface PDIGoal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Timestamp; // usar Timestamp.now() — NUNCA serverTimestamp() em arrays
  completedAt?: Timestamp; // definido quando status vira 'completed' — NUNCA serverTimestamp() em arrays
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: 'feedback_signature' | 'pdi_goal_completion';
  entityId: string;
  technicianId: string;
  technicianName: string;
  details: string;
  hash: string;
  signature: string;
  publicKey: string;
  /** uid de quem assinou (técnico ou supervisor). A chave pública é ancorada em signingKeys/{signerId}. */
  signerId: string;
}

export const FEEDBACK_AXES = [
  // Comportamentais
  'Comunicação',
  'Trabalho em equipe',
  'Proatividade',
  'Comprometimento',
  'Gestão do tempo',
  'Relacionamento com o cliente',
  // Técnicos
  'Conhecimento técnico',
  'Resolução de problemas',
  'Uso de sistemas',
  'Qualidade no atendimento',
  'Conformidade com processos',
  'Metas e indicadores'
];
