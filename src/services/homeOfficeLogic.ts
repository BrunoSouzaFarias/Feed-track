import type { HomeOfficeCategory, HomeOfficeConfig, HomeOfficePoint } from '../types';
import { parseLocalDate } from './dateUtils';

/** Regras puras da Avaliação de Home Office (sem Firebase): semana, saldo e validação. */

export const START_SCORE = 100;
export const NOTE_MIN = 10;
export const NOTE_MAX = 1000;
export const ACK_COMMENT_MAX = 1000;

const category = (id: string, label: string, requiresEvidence = true): HomeOfficeCategory =>
  ({ id, label, points: 10, requiresEvidence, active: true });

export const DEFAULT_HOME_OFFICE_CONFIG: HomeOfficeConfig = {
  threshold: 70,
  categories: [
    category('ticket_waiting_no_reply', 'Chamado movido para "aguardando cliente" sem resposta'),
    category('medical_certificate', 'Atestado médico', false),
    category('attendance_certificate', 'Atestado de comparecimento', false),
    category('sla', 'SLA de atendimento'),
    category('n2_return', 'Card devolvido pelo N2 por erro do N1'),
    category('whatsapp_arrival', 'WhatsApp: chegou e não ficou disponível'),
    category('whatsapp_leave', 'WhatsApp: saiu e não deixou indisponível'),
    category('whatsapp_lunch', 'WhatsApp: almoço com status disponível'),
  ],
};

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Semana = segunda a domingo; o id é a data LOCAL da segunda-feira. */
export function weekIdOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceMonday = (d.getDay() + 6) % 7; // dom=6, seg=0
  d.setDate(d.getDate() - sinceMonday);
  return toYmd(d);
}

export function weekIdOfDateString(ymd: string): string {
  return weekIdOf(parseLocalDate(ymd));
}

export function shiftWeek(weekId: string, delta: number): string {
  const d = parseLocalDate(weekId);
  d.setDate(d.getDate() + delta * 7);
  return toYmd(d);
}

/** "09/11 a 15/11" */
export function weekRangeLabel(weekId: string): string {
  const start = parseLocalDate(weekId);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return `${fmt(start)} a ${fmt(end)}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

export function computeScore(points: Pick<HomeOfficePoint, 'points' | 'status'>[]): number {
  const lost = points.filter((p) => p.status === 'active').reduce((sum, p) => sum + p.points, 0);
  return Math.max(0, START_SCORE - lost);
}

export function isEligible(score: number, threshold: number): boolean {
  return score >= threshold;
}

export function weekDocId(weekId: string, technicianId: string): string {
  return `${weekId}_${technicianId}`;
}

function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  return toYmd(parseLocalDate(ymd)) === ymd; // rejeita 2026-13-40
}

/** Mensagem de erro em pt-BR, ou null se o lançamento pode ser gravado. */
export function validatePointInput(input: {
  category?: HomeOfficeCategory;
  note: string;
  occurredOn: string;
  hasEvidence: boolean;
}): string | null {
  const { category: cat, occurredOn, hasEvidence } = input;
  const note = input.note.trim();
  if (!cat) return 'Selecione a categoria da ocorrência.';
  if (!isValidYmd(occurredOn)) return 'Informe uma data válida para a ocorrência.';
  if (note.length < NOTE_MIN) return `Explique o motivo na observação (mínimo de ${NOTE_MIN} caracteres).`;
  if (note.length > NOTE_MAX) return `A observação pode ter no máximo ${NOTE_MAX} caracteres.`;
  if (!cat.requiresEvidence && hasEvidence) return 'Ocorrências de atestado não recebem anexo de imagem.';
  if (cat.requiresEvidence && !hasEvidence) return 'Anexe o print que comprova a ocorrência.';
  return null;
}
