import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'supervisor' | 'technician';
  team: 'back-office' | 'teleservice';
  position: string; // cargo: "Agente N1", "Analista", etc.
  /** Só para supervisores: se definido, gerencia APENAS esta equipe (ausente/null = todas). */
  managedTeam?: 'back-office' | 'teleservice' | null;
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
  /** Equipe do colaborador (denormalizada no momento da criação; usada pelo escopo de supervisor). */
  team: 'back-office' | 'teleservice';
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
  team: 'back-office' | 'teleservice';
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
  eventType: 'feedback_signature' | 'pdi_goal_completion' | 'home_office_ack';
  entityId: string;
  technicianId: string;
  technicianName: string;
  team: 'back-office' | 'teleservice';
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

// ---------------------------------------------------------------------------
// Avaliação de Home Office
// ---------------------------------------------------------------------------
export type Team = 'back-office' | 'teleservice';

export interface HomeOfficeCategory {
  id: string;
  label: string;
  points: number;
  /** false nas categorias de atestado: nunca recebem imagem (dado de saúde). */
  requiresEvidence: boolean;
  active: boolean;
}

export interface HomeOfficeConfig {
  categories: HomeOfficeCategory[];
  threshold: number;
}

export interface HomeOfficePoint {
  id: string;
  technicianId: string;
  technicianName: string;
  team: Team;
  weekId: string; // segunda-feira da semana, YYYY-MM-DD
  categoryId: string;
  categoryLabel: string;
  points: number; // copiado da categoria no momento do lançamento
  note: string;
  occurredOn: string; // YYYY-MM-DD
  hasEvidence: boolean;
  status: 'active' | 'cancelled';
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}

export interface HomeOfficeEvidence {
  pointId: string;
  technicianId: string;
  team: Team;
  weekId: string;
  dataUrl: string;
  createdBy: string;
  createdAt: Timestamp;
}

/** Existir = semana fechada para aquela pessoa. */
export interface HomeOfficeWeek {
  id: string; // `${weekId}_${technicianId}`
  technicianId: string;
  technicianName: string;
  team: Team;
  weekId: string;
  score: number;
  threshold: number;
  eligible: boolean;
  closedBy: string;
  closedAt: Timestamp;
  ackAt?: Timestamp;
  ackComment?: string;
}
