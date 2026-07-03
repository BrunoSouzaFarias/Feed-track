import { useState, useEffect } from 'react';
import { offlineSyncService } from '../services/offlineSyncService';

export function useOfflineSync() {
  const [status, setStatus] = useState({
    online: offlineSyncService.isOnline(),
    pendingCount: offlineSyncService.getQueue().length,
    syncing: false
  });

  useEffect(() => {
    const unsubscribe = offlineSyncService.addListener((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return {
    ...status,
    checkConnection: () => offlineSyncService.checkConnection(),
    processQueue: () => offlineSyncService.processQueue()
  };
}
