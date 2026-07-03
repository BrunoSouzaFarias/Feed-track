import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db, Timestamp } from '../firebase';
import type { AuditLog } from '../types';

const isFirebaseMock = !import.meta.env.VITE_FIREBASE_API_KEY || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('mock') || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('dummy');

const MOCK_AUDIT_LOGS_KEY = 'feed_track_mock_audit_logs';

// Helper to generate SHA-256 using Web Crypto API
export async function generateSHA256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    // Fallback simple hash string if Web Crypto is unavailable
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return 'fallback_sha256_' + Math.abs(hash).toString(16) + '00000000';
  }
}

// Helper to simulate a digital signature (private/public key signature)
export function simulateSignature(messageHash: string, userId: string): { signature: string; publicKey: string } {
  const mockPrivateKey = `PRIV_KEY_${userId.toUpperCase()}_SECURE_KEY`;
  const mockPublicKey = `MOCK_RSA_PUB_KEY_${userId.toUpperCase()}_FEED_TRACK_AUDIT_TRAIL_VALID`;
  
  // Create a simulated signature hex based on hash and private key
  let hashVal = 0;
  const input = `${messageHash}:${mockPrivateKey}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hashVal = (hashVal << 5) - hashVal + char;
    hashVal = hashVal & hashVal;
  }
  const signature = `SIG_RSA_SHA256_${Math.abs(hashVal).toString(16).toUpperCase()}_${messageHash.slice(0, 12)}`;
  
  return { signature, publicKey: mockPublicKey };
}

export const auditService = {
  getMockLogs(): AuditLog[] {
    const logs = localStorage.getItem(MOCK_AUDIT_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  },

  saveMockLogs(logs: AuditLog[]) {
    localStorage.setItem(MOCK_AUDIT_LOGS_KEY, JSON.stringify(logs));
  },

  async registerLog(
    eventType: 'feedback_signature' | 'pdi_goal_completion',
    entityId: string,
    technicianId: string,
    technicianName: string,
    payload: Record<string, any>
  ): Promise<AuditLog> {
    const timestamp = new Date().toISOString();
    const payloadString = JSON.stringify(payload);
    
    // 1. Generate SHA-256 hash of the payload and event details
    const hash = await generateSHA256(`${eventType}:${entityId}:${technicianId}:${timestamp}:${payloadString}`);
    
    // 2. Simulate Digital Signature with Private/Public Key pair
    const { signature, publicKey } = simulateSignature(hash, technicianId);
    
    // Create Audit Log
    const logEntry: AuditLog = {
      id: `audit_${Math.random().toString(36).substring(2, 11)}`,
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
      publicKey
    };

    if (isFirebaseMock) {
      const logs = this.getMockLogs();
      logs.unshift(logEntry); // Add newest first
      this.saveMockLogs(logs);
      return logEntry;
    }

    try {
      await setDoc(doc(db, 'auditLogs', logEntry.id), {
        ...logEntry,
        createdAt: Timestamp.now()
      });
      return logEntry;
    } catch (error) {
      console.error("Firebase error registering audit log, falling back to mock:", error);
      const logs = this.getMockLogs();
      logs.unshift(logEntry);
      this.saveMockLogs(logs);
      return logEntry;
    }
  },

  async getLogs(): Promise<AuditLog[]> {
    if (isFirebaseMock) {
      return this.getMockLogs();
    }
    try {
      const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: AuditLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: data.id,
          timestamp: data.timestamp,
          eventType: data.eventType,
          entityId: data.entityId,
          technicianId: data.technicianId,
          technicianName: data.technicianName,
          details: data.details,
          hash: data.hash,
          signature: data.signature,
          publicKey: data.publicKey
        });
      });
      return list;
    } catch (error) {
      console.error("Firebase error listing audit logs, falling back to mock:", error);
      return this.getMockLogs();
    }
  }
};
