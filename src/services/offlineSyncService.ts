import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Feedback, User, SelfAssessment } from '../types';

export interface SyncAction {
  id: string;
  timestamp: number;
  type: 'addFeedback' | 'updateFeedbackStatus' | 'createUser' | 'updateUser' | 'submitSelfAssessment' | 'deleteUser';
  payload: any;
}

const SYNC_QUEUE_KEY = 'feed_track_sync_queue';

const isFirebaseMock = !import.meta.env.VITE_FIREBASE_API_KEY || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('mock') || 
  import.meta.env.VITE_FIREBASE_API_KEY.includes('dummy');

type StatusListener = (status: { online: boolean; pendingCount: number; syncing: boolean }) => void;

class OfflineSyncService {
  private listeners: Set<StatusListener> = new Set();
  private isSyncing = false;
  private onlineStatus = navigator.onLine;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectionChange(true));
      window.addEventListener('offline', () => this.handleConnectionChange(false));
      
      // Listen for background sync messages from Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SYNC_QUEUE') {
            this.processQueue();
          }
        });
      }

      // Periodically check connection status and process queue
      setInterval(() => {
        if (this.isOnline() && this.getQueue().length > 0 && !this.isSyncing) {
          this.processQueue();
        }
      }, 10000);
    }
  }

  public addListener(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener({
      online: this.isOnline(),
      pendingCount: this.getQueue().length,
      syncing: this.isSyncing
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const status = {
      online: this.isOnline(),
      pendingCount: this.getQueue().length,
      syncing: this.isSyncing
    };
    this.listeners.forEach(listener => listener(status));
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  private async handleConnectionChange(online: boolean) {
    this.onlineStatus = online;
    this.notifyListeners();
    if (online) {
      await this.processQueue();
    }
  }

  // Force checking if connection is active
  public async checkConnection(): Promise<boolean> {
    try {
      // Try to fetch a small resources or API to confirm actual internet connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch('/index.html', { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!this.onlineStatus) {
        this.onlineStatus = true;
        this.notifyListeners();
      }
      return true;
    } catch (e) {
      if (this.onlineStatus) {
        this.onlineStatus = false;
        this.notifyListeners();
      }
      return false;
    }
  }

  public getQueue(): SyncAction[] {
    const queueRaw = localStorage.getItem(SYNC_QUEUE_KEY);
    return queueRaw ? JSON.parse(queueRaw) : [];
  }

  private saveQueue(queue: SyncAction[]) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    this.notifyListeners();
  }

  public enqueue(type: SyncAction['type'], payload: any) {
    const queue = this.getQueue();
    const action: SyncAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      payload
    };
    queue.push(action);
    this.saveQueue(queue);

    // Register PWA Background Sync if supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        // @ts-ignore - sync is not standard in generic TS types but supported by PWAs
        return reg.sync.register('sync-feed-track');
      }).catch(err => console.warn('Background sync registration failed:', err));
    }

    // If online, try to trigger sync immediately
    if (this.isOnline() && !this.isSyncing) {
      this.processQueue();
    }
  }

  public async processQueue() {
    if (this.isSyncing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    this.notifyListeners();

    // Verify if we actually have connection
    const hasConnection = await this.checkConnection();
    if (!hasConnection) {
      this.isSyncing = false;
      this.notifyListeners();
      return;
    }

    const failedActions: SyncAction[] = [];

    for (const action of queue) {
      try {
        if (isFirebaseMock) {
          // If we are in mock mode, just simulate syncing
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Process based on action type
        switch (action.type) {
          case 'addFeedback': {
            const feedback: Feedback = action.payload;
            await setDoc(doc(db, 'feedbacks', feedback.id), feedback);
            break;
          }
          case 'updateFeedbackStatus': {
            const { feedbackId, updateData } = action.payload;
            await updateDoc(doc(db, 'feedbacks', feedbackId), updateData);
            break;
          }
          case 'createUser': {
            const user: User = action.payload;
            await setDoc(doc(db, 'users', user.uid), user);
            break;
          }
          case 'updateUser': {
            const { uid, data } = action.payload;
            await updateDoc(doc(db, 'users', uid), data);
            break;
          }
          case 'submitSelfAssessment': {
            const assessment: SelfAssessment = action.payload;
            await setDoc(doc(db, 'selfAssessments', assessment.id), assessment);
            break;
          }
          case 'deleteUser': {
            const uid: string = action.payload;
            await deleteDoc(doc(db, 'users', uid));
            break;
          }
        }
      } catch (error) {
        console.error(`Error syncing action ${action.id} of type ${action.type}:`, error);
        failedActions.push(action);
        // If it's a network error, stop processing the rest of the queue
        const isNetworkError = !navigator.onLine || (error instanceof Error && error.message.includes('network'));
        if (isNetworkError) {
          this.onlineStatus = false;
          break;
        }
      }
    }

    // Keep failed actions in the queue to retry later
    const currentQueue = this.getQueue();
    const processedIds = queue.filter(q => !failedActions.some(f => f.id === q.id)).map(q => q.id);
    const newQueue = currentQueue.filter(q => !processedIds.includes(q.id));
    this.saveQueue(newQueue);

    this.isSyncing = false;
    this.notifyListeners();
  }
}

export const offlineSyncService = new OfflineSyncService();
