import { doc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db, Timestamp } from '../firebase';
import type { Feedback } from '../types';
import { auditService } from './auditService';
import { offlineSyncService } from './offlineSyncService';

const isFirebaseMock = !import.meta.env.VITE_FIREBASE_API_KEY || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('mock') || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('dummy');

const MOCK_FEEDBACKS_KEY = 'feed_track_mock_feedbacks';

const defaultFeedbacks: Feedback[] = [
  {
    id: 'fb1',
    technicianId: 'tech1',
    technicianName: 'Ana Silva',
    supervisorId: 'sup1',
    type: 'positive',
    axis: 'Comunicação',
    description: 'Excelente postura na última reunião de alinhamento com a diretoria do Back-office. Conseguiu explicar as métricas com muita clareza.',
    status: 'pending',
    createdAt: Timestamp.now()
  },
  {
    id: 'fb2',
    technicianId: 'tech1',
    technicianName: 'Ana Silva',
    supervisorId: 'sup1',
    type: 'development',
    axis: 'Gestão do tempo',
    description: 'Atenção especial aos prazos de fechamento dos chamados de N1. Tivemos alguns atrasos pontuais nesta semana que impactaram o SLA.',
    status: 'read',
    readAt: Timestamp.now(),
    signedAt: Timestamp.now(),
    createdAt: Timestamp.now()
  }
];

if (!localStorage.getItem(MOCK_FEEDBACKS_KEY)) {
  localStorage.setItem(MOCK_FEEDBACKS_KEY, JSON.stringify(defaultFeedbacks));
}

const getMockFeedbacks = (): Feedback[] => {
  const fbs = localStorage.getItem(MOCK_FEEDBACKS_KEY);
  return fbs ? JSON.parse(fbs) : [];
};

const saveMockFeedbacks = (fbs: Feedback[]) => {
  localStorage.setItem(MOCK_FEEDBACKS_KEY, JSON.stringify(fbs));
};

export const feedbackService = {
  async addFeedback(feedback: Feedback): Promise<void> {
    // 1. Save to local storage mock cache first (cache/local storage fallback)
    const fbs = getMockFeedbacks();
    fbs.push(feedback);
    saveMockFeedbacks(fbs);

    // 2. If online and not mock, write to Firestore, otherwise enqueue for sync
    if (!isFirebaseMock && offlineSyncService.isOnline()) {
      try {
        await setDoc(doc(db, 'feedbacks', feedback.id), feedback);
      } catch (error) {
        console.error("Firebase error adding feedback, enqueueing for sync:", error);
        offlineSyncService.enqueue('addFeedback', feedback);
      }
    } else if (!offlineSyncService.isOnline()) {
      offlineSyncService.enqueue('addFeedback', feedback);
    }
  },

  async getFeedbacks(technicianId?: string): Promise<Feedback[]> {
    if (offlineSyncService.isOnline() && !isFirebaseMock) {
      try {
        let q = query(collection(db, 'feedbacks'));
        if (technicianId) {
          q = query(collection(db, 'feedbacks'), where('technicianId', '==', technicianId));
        }
        const querySnapshot = await getDocs(q);
        const list: Feedback[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Feedback);
        });

        // Sync local cache with Firestore data
        const cached = getMockFeedbacks();
        const updatedCache = [...cached];
        list.forEach(fb => {
          const idx = updatedCache.findIndex(c => c.id === fb.id);
          if (idx !== -1) {
            updatedCache[idx] = fb;
          } else {
            updatedCache.push(fb);
          }
        });
        saveMockFeedbacks(updatedCache);

        return list;
      } catch (error) {
        console.error("Firebase error getting feedbacks, falling back to cache:", error);
      }
    }

    // Offline or mock mode or Firebase failed: return cache
    const fbs = getMockFeedbacks();
    if (technicianId) {
      return fbs.filter(f => f.technicianId === technicianId);
    }
    return fbs;
  },

  async updateFeedbackStatus(feedbackId: string, status: 'pending' | 'read', signed = false): Promise<void> {
    const timestamp = Timestamp.now();
    const updateData: Partial<Feedback> = { status };
    if (status === 'read') {
      updateData.readAt = timestamp;
    }
    if (signed) {
      updateData.signedAt = timestamp;
    }

    // Capture the current feedback data for audit trail before updating
    let fbToLog: Feedback | undefined;
    const cachedFbs = getMockFeedbacks();
    fbToLog = cachedFbs.find(f => f.id === feedbackId);

    // 1. Update local cache first
    const idx = cachedFbs.findIndex(f => f.id === feedbackId);
    if (idx !== -1) {
      cachedFbs[idx] = { ...cachedFbs[idx], ...updateData } as Feedback;
      saveMockFeedbacks(cachedFbs);
    }

    // 2. Update Firestore if online and not mock, otherwise enqueue for sync
    if (!isFirebaseMock && offlineSyncService.isOnline()) {
      try {
        const docRef = doc(db, 'feedbacks', feedbackId);
        await updateDoc(docRef, updateData);
      } catch (error) {
        console.error("Firebase error updating feedback status, enqueueing for sync:", error);
        offlineSyncService.enqueue('updateFeedbackStatus', { feedbackId, updateData });
      }
    } else if (!offlineSyncService.isOnline()) {
      offlineSyncService.enqueue('updateFeedbackStatus', { feedbackId, updateData });
    }

    // Register log if signed and we have the feedback data
    if (signed && fbToLog) {
      try {
        await auditService.registerLog(
          'feedback_signature',
          feedbackId,
          fbToLog.technicianId,
          fbToLog.technicianName,
          {
            feedbackId,
            technicianId: fbToLog.technicianId,
            axis: fbToLog.axis,
            type: fbToLog.type,
            signedAt: new Date().toISOString()
          }
        );
      } catch (err) {
        console.error("Error creating audit log for feedback signature:", err);
      }
    }
  }
};
