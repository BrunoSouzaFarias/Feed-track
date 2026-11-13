import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { isFirebaseMock } from './env';
import { getActorId } from './actor';
import { AppError } from './errors';

const MOCK_KEY = 'feed_track_mock_signup_open';

/**
 * Interruptor do cadastro público (config/signup { open }). Aplicado pelas
 * REGRAS do Firestore: com `open=false` o auto-cadastro é negado no servidor
 * (e o app desfaz a conta criada no Auth). Ausente = aberto.
 */
export const signupService = {
  async isOpen(): Promise<boolean> {
    if (isFirebaseMock) return localStorage.getItem(MOCK_KEY) !== 'false';
    const snap = await getDoc(doc(db, 'config', 'signup'));
    return !snap.exists() || snap.data().open !== false;
  },

  /** Somente supervisor sem escopo de equipe (as regras também exigem). */
  async setOpen(open: boolean): Promise<void> {
    if (isFirebaseMock) {
      localStorage.setItem(MOCK_KEY, String(open));
      return;
    }
    const uid = getActorId();
    if (!uid) throw new AppError('Faça login novamente.');
    await setDoc(doc(db, 'config', 'signup'), { open, updatedAt: serverTimestamp(), updatedBy: uid });
  },
};
