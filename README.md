# Feed-Track

Gestão de feedbacks 1:1, PDI (plano de desenvolvimento individual), autoavaliações, 9-Box e trilha de auditoria para equipes de atendimento. React 19 + TypeScript + Vite, Firebase (Auth + Firestore) e PWA.

## Perfis
- **Supervisor**: equipe, feedbacks, PDIs, clima, exportações (PDF/CSV), compliance, 9-Box e insights.
- **Técnico**: seus feedbacks (leitura/assinatura), PDI, radar, badges, linha do tempo e autoavaliação.

O cadastro público (`/register`) **sempre** cria técnico. Supervisores são criados por outro supervisor (aba “Equipe”) ou promovidos direto no Firestore (veja “Primeiro supervisor”).

## Desenvolvimento

```bash
npm install
npm run dev          # modo mock (sem Firebase) se .env estiver vazio
```

### Modo mock (somente dev/demonstração)
Sem `VITE_FIREBASE_API_KEY`, o app usa `localStorage` como banco. Contas semeadas (senha `liberty123`):

| Papel | E-mail |
|---|---|
| Supervisor | rodrigo.supervisor@liberty.com |
| Técnico | ana.silva@liberty.com · bruno.souza@liberty.com · carlos.oliveira@liberty.com |

> **Em build de produção o modo mock é bloqueado** (o app mostra “Configuração ausente”). Só é liberado com `VITE_ALLOW_MOCK=true`, explicitamente.

### Firebase real
1. Copie `.env.example` para `.env` e preencha as credenciais.
2. `firebase deploy --only firestore:rules,firestore:indexes,hosting` (regras, índices e headers de segurança estão versionados).
3. Siga o checklist em [`docs/SECURITY.md`](docs/SECURITY.md) (App Check, política de senha, domínios autorizados).

### Primeiro supervisor
Crie a conta pelo `/register` e, no console do Firestore, altere `users/{uid}.role` para `supervisor` (as regras impedem que isso seja feito pelo próprio app).

## Qualidade

```bash
npm run typecheck    # tsc -b
npm run lint         # eslint
npm test             # testes unitários (vitest)
npm run test:rules   # testes das regras do Firestore (emulador; requer Java)
npm run test:functions # executa as Cloud Functions nos emuladores
npm run ci           # typecheck + lint + test + build
```

## Documentação
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — variáveis, deploy, offline, PWA, monitoramento e solução de problemas.
- [`docs/SECURITY.md`](docs/SECURITY.md) — modelo de ameaças, controles, riscos residuais e checklist de deploy.
- [`docs/PRIVACY.md`](docs/PRIVACY.md) — LGPD: dados tratados, retenção e direitos do titular.
- [`docs/subagent/`](docs/subagent) — especificações por funcionalidade.
