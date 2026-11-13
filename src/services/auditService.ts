import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditLog } from '../types';
import { isFirebaseMock } from './env';
import { newId } from './ids';
import { sha256Hex, signHash } from './signatureService';
import { offlineSyncService } from './offlineSyncService';
import { getActorId } from './actor';
import { AppError } from './errors';

const MOCK_AUDIT_LOGS_KEY = 'feed_track_mock_audit_logs';

export { sha256Hex as generateSHA256 };

function readMockLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(MOCK_AUDIT_LOGS_KEY);
    return raw ? (JSON.parse(raw) as AuditLog[]) : [];
  } catch {
    return [];
  }
}

/**
 * Âncora de chaves: a PRIMEIRA chave pública usada por um usuário é registrada
 * em signingKeys/{uid} (imutável; as regras só deixam criar uma vez). Depois,
 * qualquer assinatura com outra chave é recusada — impede forjar assinatura
 * "em nome" de alguém com um par de chaves novo. Troca de dispositivo exige
 * que um supervisor apague o registro (reset).
 */
async function ensureKeyAnchored(signerId: string, publicKey: string): Promise<void> {
  const ref = doc(db, 'signingKeys', signerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid: signerId, publicKey, createdAt: serverTimestamp() });
    return;
  }
  if (snap.data().publicKey !== publicKey) {
    throw new AppError('Este dispositivo não possui a chave de assinatura registrada para sua conta. Peça ao supervisor para redefinir sua chave.');
  }
}

export const auditService = {
  async registerLog(
    eventType: AuditLog['eventType'],
    entityId: string,
    technicianId: string,
    technicianName: string,
    payload: Record<string, unknown>
  ): Promise<AuditLog> {
    const timestamp = new Date().toISOString();
    const hash = await sha256Hex(
      `${eventType}:${entityId}:${technicianId}:${timestamp}:${JSON.stringify(payload)}`
    );
    // Quem assina é QUEM ESTÁ LOGADO (técnico na assinatura de feedback; técnico ou
    // supervisor na conclusão de meta) — não necessariamente o titular do evento.
    const signerId = getActorId() ?? technicianId;
    // Assinatura ECDSA real; falha (em vez de "fingir") se não for possível assinar.
    const { signature, publicKey } = await signHash(hash, signerId);

    const logEntry: AuditLog = {
      id: newId('audit'),
      timestamp,
      eventType,
      entityId,
      technicianId,
      technicianName,
      details: eventType === 'feedback_signature'
        ? `Feedback assinado digitalmente por ${technicianName}.`
        : `Meta do PDI concluída por ${technicianName}.`,
      hash,
      signature,
      publicKey,
      signerId,
    };

    if (isFirebaseMock) {
      const logs = readMockLogs();
      logs.unshift(logEntry);
      localStorage.setItem(MOCK_AUDIT_LOGS_KEY, JSON.stringify(logs));
      return logEntry;
    }

    // Sem fallback silencioso para localStorage: se o servidor rejeitar, a
    // falha PROPAGA — um log de auditoria que só existe no navegador não
    // serve de evidência. `createdAt` vem do SERVIDOR (as regras exigem
    // `createdAt == request.time`).
    await ensureKeyAnchored(signerId, publicKey);
    await offlineSyncService.run(
      () => setDoc(doc(db, 'auditLogs', logEntry.id), { ...logEntry, createdAt: serverTimestamp() }),
      'assinatura'
    );
    return logEntry;
  },

  /** Chaves públicas ancoradas (uid → JWK). Supervisor lê todas. Vazio em modo mock. */
  async getAnchoredKeys(): Promise<Record<string, string>> {
    if (isFirebaseMock) return {};
    const snap = await getDocs(collection(db, 'signingKeys'));
    return Object.fromEntries(snap.docs.map((d) => [d.id, d.data().publicKey as string]));
  },

  /** Supervisor: todos os logs. Técnico: informe `technicianId` (as regras exigem o filtro). */
  async getLogs(technicianId?: string): Promise<AuditLog[]> {
    if (isFirebaseMock) {
      const logs = readMockLogs();
      return technicianId ? logs.filter((l) => l.technicianId === technicianId) : logs;
    }
    const base = collection(db, 'auditLogs');
    const q = technicianId
      ? query(base, where('technicianId', '==', technicianId), orderBy('createdAt', 'desc'))
      : query(base, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id, timestamp: data.timestamp, eventType: data.eventType,
        entityId: data.entityId, technicianId: data.technicianId,
        technicianName: data.technicianName, details: data.details,
        hash: data.hash, signature: data.signature, publicKey: data.publicKey,
        signerId: data.signerId ?? data.technicianId,
      } satisfies AuditLog;
    });
  },
};
