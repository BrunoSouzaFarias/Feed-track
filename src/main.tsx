import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Validação de variáveis de ambiente — falha cedo com mensagem clara
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isMock = !apiKey || apiKey.includes('mock') || apiKey.includes('dummy');
if (!isMock) {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
  ] as const;
  const missing = required.filter(k => !import.meta.env[k]);
  if (missing.length > 0) {
    console.error(
      `[Feed-Track] Variáveis de ambiente ausentes: ${missing.join(', ')}.\n` +
      'Copie .env.example para .env e preencha as credenciais do Firebase.'
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
