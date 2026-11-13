/**
 * Remove dados que versões anteriores gravavam em localStorage mesmo com
 * Firebase real (cache de usuários/feedbacks/auditoria, fila offline,
 * credenciais mock). Chamado no boot e no logout em modo Firebase.
 */
const LEGACY_KEYS = [
  'feed_track_mock_users',
  'feed_track_mock_feedbacks',
  'feed_track_mock_assessments',
  'feed_track_mock_audit_logs',
  'feed_track_mock_credentials',
  'feed_track_sync_queue',
  'feed_track_active_uid',
];

export function purgeLegacyLocalData(): void {
  try {
    LEGACY_KEYS.forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  } catch { /* storage indisponível */ }
}
