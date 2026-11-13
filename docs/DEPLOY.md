# Deploy e operação

## Variáveis de ambiente (`.env`, veja `.env.example`)
| Variável | Obrigatória | Uso |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` (+ `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`) | sim em produção | Firebase real. Sem elas, o build de produção **não sobe** (tela “Configuração ausente”). |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | recomendada | Ativa o App Check (reCAPTCHA v3). |
| `VITE_ALLOWED_EMAIL_DOMAIN` | opcional | Restringe o cadastro público a `@dominio` (defesa em profundidade). |
| `VITE_ERROR_REPORT_URL` | opcional | Recebe erros não tratados (JSON, sem dados pessoais). **Adicione o host em `connect-src` da CSP** em `firebase.json`. |
| `VITE_ALLOW_MOCK` | não | `true` libera o modo mock em produção (apenas demonstrações). |

## Passo a passo
```bash
npm ci
npm run ci                 # typecheck + lint + testes + build
npm run test:rules         # regras do Firestore no emulador (requer Java)
npm run test:functions     # executa as Cloud Functions nos emuladores (Auth+Firestore+Functions)
firebase deploy --only firestore:rules,firestore:indexes,hosting
```
O `firebase.json` já publica CSP, HSTS, `X-Frame-Options`, cache imutável para `/assets/**` e `no-cache` para `index.html` e `sw.js`.

## Cloud Functions (opcional, recomendado)
`/functions` contém o backend que fecha as brechas que o navegador sozinho não consegue fechar:

| Função | O que faz |
|---|---|
| `setPdiGoalStatus` | Valida dono e transição (técnico só avança) e carimba `completedAt` no servidor. |
| `claimBadges` | O **servidor** avalia as condições e concede os badges (o técnico não escolhe). |
| `deleteUserAccount` | Supervisor exclui colaborador **inclusive a conta do Firebase Auth**, perfil, feedbacks e autoavaliações (logs de auditoria são mantidos). |

Requer o plano Blaze. Passo a passo:
```bash
npm --prefix functions install
firebase deploy --only functions
# no .env de produção:  VITE_USE_CLOUD_FUNCTIONS=true  (e rebuild do front)
npm run rules:strict && cp firestore.strict.rules firestore.rules   # opcional: ver abaixo
firebase deploy --only firestore:rules,hosting
```
**Regras estritas** (`firestore.strict.rules`, gerado por `npm run rules:strict`): o técnico deixa de poder gravar `structuredPDI` e `badges` direto no Firestore — só o servidor (Admin SDK) ou um supervisor. Faça o deploy das regras estritas **somente depois** de implantar as functions e ativar `VITE_USE_CLOUD_FUNCTIONS=true`, senão técnicos não conseguirão atualizar metas. Ambos os conjuntos de regras têm testes (`npm run test:rules`).

## Primeiro supervisor
1. Crie a conta em `/register` (nasce como técnico).
2. No console do Firestore, altere `users/{uid}.role` para `supervisor`.

## Offline
O cache offline é o do Firestore (IndexedDB, isolado por usuário). Escritas feitas offline são reenviadas ao reconectar; se o servidor as rejeitar (ex.: permissão), o usuário é avisado por toast. O cabeçalho mostra online/offline e quantas escritas estão pendentes.

## Atualizações do app (PWA)
HTML é buscado primeiro na rede, então um deploy novo chega na próxima navegação. Para forçar a limpeza de caches antigos, incremente `CACHE_VERSION` em `public/sw.js`.

## Monitoramento
Erros de renderização (`ErrorBoundary`), `window.onerror` e `unhandledrejection` passam por `src/services/monitoring.ts` (deduplicados, no máximo 10 por sessão). Sem `VITE_ERROR_REPORT_URL`, ficam só no console.

## Solução de problemas
- **“Configuração ausente” ao abrir o site**: faltam as variáveis `VITE_FIREBASE_*` no build.
- **`permission-denied` ao salvar**: a regra negou (conta desativada, perfil inexistente ou campo não permitido). Rode `npm run test:rules` para ver o contrato esperado.
- **Consulta de auditoria falha pedindo índice**: faça deploy de `firestore.indexes.json`.
