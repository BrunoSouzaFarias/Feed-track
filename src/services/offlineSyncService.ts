import { waitForPendingWrites, enableNetwork } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { isFirebaseMock } from './env';
import { friendlyError, isPermanentFirestoreError } from './errors';

export interface SyncStatus {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
}
type StatusListener = (status: SyncStatus) => void;

/**
 * Offline sync.
 *
 * O Firestore (persistentLocalCache + IndexedDB) já mantém uma fila de escritas
 * PERSISTENTE, ORDENADA e ISOLADA POR USUÁRIO, e reenvia ao reconectar. Antes
 * existia uma segunda fila em localStorage (sem vínculo com usuário, sem ordem
 * garantida, com retry infinito de erros permanentes). Ela foi removida; este
 * serviço agora só:
 *   - acompanha online/offline e quantas escritas estão pendentes;
 *   - decide se a UI deve esperar a confirmação do servidor (online) ou
 *     retornar imediatamente (offline — o SDK sincroniza depois);
 *   - avisa o usuário quando uma escrita feita offline é rejeitada depois.
 */
class OfflineSyncService {
  private listeners = new Set<StatusListener>();
  private pending = 0;
  private onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  private snapshot(): SyncStatus {
    return { online: this.onlineStatus, pendingCount: this.pending, syncing: this.onlineStatus && this.pending > 0 };
  }

  private notify() {
    const s = this.snapshot();
    this.listeners.forEach((l) => l(s));
  }

  private setOnline(online: boolean) {
    if (this.onlineStatus === online) return;
    this.onlineStatus = online;
    this.notify();
  }

  public addListener(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => { this.listeners.delete(listener); };
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  public getStatus(): SyncStatus {
    return this.snapshot();
  }

  /**
   * Executa uma escrita no Firestore.
   * Online  → aguarda o servidor; erros (ex.: permission-denied) PROPAGAM para a UI.
   * Offline → não bloqueia a UI (o SDK enfileira em IndexedDB); falha posterior
   *           gera um aviso ao usuário.
   */
  public run(op: () => Promise<unknown>, label = 'alteração'): Promise<void> {
    if (isFirebaseMock) return op().then(() => undefined);

    this.pending++;
    this.notify();
    const p = op().finally(() => {
      this.pending = Math.max(0, this.pending - 1);
      this.notify();
    });

    if (this.onlineStatus) {
      return p.then(() => undefined);
    }
    p.catch((err) => {
      console.error(`[sync] Falha ao sincronizar ${label}:`, err);
      toast.error(
        isPermanentFirestoreError(err)
          ? `Não foi possível sincronizar sua ${label}: ${friendlyError(err)}`
          : `Falha ao sincronizar sua ${label}. Ela será tentada novamente.`
      );
    });
    return Promise.resolve();
  }

  /** Verifica conectividade real (sem passar pelo cache do service worker). */
  public async checkConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      await fetch(`/manifest.json?_=${Date.now()}`, {
        method: 'HEAD', cache: 'no-store', signal: controller.signal,
      });
      this.setOnline(true);
      return true;
    } catch {
      this.setOnline(false);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Força nova tentativa e espera o servidor confirmar as escritas pendentes. */
  public async processQueue(): Promise<void> {
    if (isFirebaseMock) return;
    if (!(await this.checkConnection())) return;
    try {
      await enableNetwork(db);
      await waitForPendingWrites(db);
    } catch (err) {
      console.error('[sync] processQueue falhou:', err);
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
