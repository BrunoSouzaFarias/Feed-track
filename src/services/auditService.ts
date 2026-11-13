import { collection, doc, setDoc, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditLog } from '../types';
import { isFirebaseMock } from './env';
import { newId } from './ids';
import { sha256Hex, signHash } from './signatureService';
import { offlineSyncService } from './offlineSyncService';

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
    // Assinatura ECDSA real; falha (em vez de "fingir") se não for possível assinar.
    const { signature, publicKey } = await signHash(hash, technicianId);

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
    await offlineSyncService.run(
      () => setDoc(doc(db, 'auditLogs', logEntry.id), { ...logEntry, createdAt: serverTimestamp() }),
      'assinatura'
    );
    return logEntry;
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
      } satisfies AuditLog;
    });
  },
};
