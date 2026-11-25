import { auth } from '../firebase';
import { isFirebaseMock } from './env';

/** uid de quem está logado agora (quem de fato assina/executa a ação). */
export function getActorId(): string | undefined {
  if (isFirebaseMock) return sessionStorage.getItem('feed_track_active_uid') ?? undefined;
  return auth.currentUser?.uid;
}
