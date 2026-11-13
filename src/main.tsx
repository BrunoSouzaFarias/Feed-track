import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getMissingFirebaseEnv, isMockBlocked } from './services/env'

const rootEl = document.getElementById('root')!;

function renderFatal(title: string, detail: string) {
  rootEl.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px;text-align:center;background:#111316;color:#fafafa';
  const inner = document.createElement('div');
  const h = document.createElement('h1');
  h.textContent = title;
  h.style.cssText = 'font-size:20px;margin:0 0 8px';
  const p = document.createElement('p');
  p.textContent = detail;
  p.style.cssText = 'font-size:14px;color:#a1a1aa;margin:0;max-width:420px';
  inner.append(h, p);
  box.append(inner);
  rootEl.append(box);
}

const missing = getMissingFirebaseEnv();

if (isMockBlocked) {
  // Build de produção sem Firebase configurado: NÃO subir com contas de demonstração.
  renderFatal(
    'Configuração ausente',
    'O sistema não está configurado para produção (credenciais do Firebase ausentes). Contate o administrador.'
  );
} else if (missing.length > 0) {
  console.error(`[Feed-Track] Variáveis de ambiente ausentes: ${missing.join(', ')}.`);
  renderFatal('Configuração incompleta', 'Faltam variáveis de ambiente do Firebase. Contate o administrador.');
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Service worker só em produção (em dev ele cacheia o HMR e atrapalha).
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW registration failed:', err));
    });
  }
}
