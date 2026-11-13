import { useState, useEffect } from 'react';
import { offlineSyncService, type SyncStatus } from '../services/offlineSyncService';

export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>(() => offlineSyncService.getStatus());

  useEffect(() => offlineSyncService.addListener(setStatus), []);

  return {
    ...status,
    checkConnection: () => offlineSyncService.checkConnection(),
    processQueue: () => offlineSyncService.processQueue(),
  };
}
