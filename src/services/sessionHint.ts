/**
 * "Dica" de UI (pula o preloader / mostra spinner de sessão). NÃO é credencial
 * nem prova de login — a autenticação real é do Firebase Auth. Fica só em
 * sessionStorage, em um único lugar.
 */
const KEY = 'feed_track_logged_in';

export const sessionHint = {
  get(): boolean {
    try { return sessionStorage.getItem(KEY) === 'true'; } catch { return false; }
  },
  set(): void {
    try { sessionStorage.setItem(KEY, 'true'); } catch { /* storage indisponível */ }
  },
  clear(): void {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* storage indisponível */ }
  },
};
