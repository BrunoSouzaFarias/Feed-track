# Segurança

## Modelo
A autorização **real** está em `firestore.rules` (o cliente é público e não confiável). `ProtectedRoute` e a UI são apenas conveniência.

| Controle | Onde |
|---|---|
| Técnico não altera `role/active/team/position/email` | `firestore.rules` (`users.update` por `affectedKeys`) |
| Conta desativada perde acesso mesmo com token válido | `isActiveUser()` / `isSupervisor()` exigem `active == true` |
| Conteúdo do feedback imutável para o técnico (só `status/readAt/signedAt`) | `feedbacks.update` |
| Esquema/limites validados no servidor (tipos, tamanhos, notas 1–5, período) | regras de `create` |
| Supervisor com escopo de equipe (`managedTeam`) só acessa a própria equipe | `firestore.rules` (`supervisorOf`), `functions/` |
| Auditoria imutável, com `createdAt` do servidor e evidência (feedback existente e assinado) | `auditLogs` |
| Assinatura ECDSA P-256 real, chave privada não-exportável, chave pública ancorada no servidor | `signatureService.ts`, `signingKeys` nas regras |
| Nenhum dado pessoal em `localStorage` com Firebase real; limpeza no boot/logout | `legacyCleanup.ts`, serviços |
| Modo mock bloqueado em produção | `services/env.ts`, `main.tsx` |
| Headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy) | `firebase.json` |
| Anti força bruta no cliente, mensagens de erro genéricas (sem enumeração) | `useAuth.ts` |
| Senha ≥ 10 caracteres com letras e números | `passwordPolicy.ts` |
| Service worker: rede primeiro para HTML; cache só de `/assets/*` com hash | `public/sw.js` |

Testes: `npm run test:rules` (21 casos de regras; contra as regras antigas, 8 dos primeiros 15 falham — as brechas corrigidas) e `npm run test:functions` (9 casos executando as Cloud Functions reais nos emuladores de Auth, Firestore e Functions).

## Checklist de deploy (itens que NÃO estão no código)
> **Automatizado:** `scripts/firebase-console-setup.mjs` aplica via API oficial a política de senha (servidor), domínios autorizados, restrição da API key, App Check e, opcionalmente, o bloqueio do auto-cadastro. Roda em *dry-run* por padrão:
> ```bash
> npm run setup:console -- --project SEU_PROJETO --domains app.empresa.com --referrers "https://app.empresa.com/*" --api-key AIza... --enforce-appcheck
> GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)" npm run setup:console -- --project SEU_PROJETO ... --apply
> ```
> Precisa de uma conta com permissão no projeto; registre antes o app web no App Check (reCAPTCHA v3) e defina `VITE_FIREBASE_APPCHECK_SITE_KEY`.

- [ ] **App Check** com reCAPTCHA v3: defina `VITE_FIREBASE_APPCHECK_SITE_KEY` e ative a imposição para Firestore e Auth no console.
- [ ] **Firebase Auth → Política de senha**: exigir 10+ caracteres e complexidade (o cliente valida, o servidor deve impor).
- [ ] **Domínios autorizados** do Auth: somente o(s) domínio(s) de produção.
- [ ] **Restrições da API key** (HTTP referrers) no Google Cloud Console.
- [ ] **Cadastro público**: se o sistema é interno, restrinja por domínio (`VITE_ALLOWED_EMAIL_DOMAIN`, defesa em profundidade) **e** desative o auto-cadastro ou use uma *blocking function* / convites.
- [ ] **E-mail verificado**: o app envia o e-mail de verificação, mas não bloqueia o acesso sem ele (evita travar contas existentes). Para exigir, adicione `request.auth.token.email_verified == true` às regras.
- [ ] Backups/exportação agendada do Firestore e alertas de uso.
- [ ] Monitoramento: defina `VITE_ERROR_REPORT_URL` (ver `docs/DEPLOY.md`); sem ela, erros só vão para o console.

## Riscos residuais (conhecidos)
1. **Badges e progresso do PDI**: no modo padrão são gravados pelo cliente do técnico (as regras impedem remover itens). **Fechado pelo modo estrito**: implante `/functions` + `firestore.strict.rules` (ver `docs/DEPLOY.md`); aí só o servidor concede badges e valida transições.
2. **Assinatura digital**: a chave pública de cada usuário é **ancorada no servidor** (`signingKeys/{uid}`, imutável, a 1ª vence) e as regras só aceitam log assinado com a chave ancorada de quem está logado. Resta o limite de que a posse da chave é por dispositivo (troca de dispositivo exige reset por supervisor) e de que isto não substitui certificado ICP-Brasil se houver exigência legal específica.
3. **Exclusão de usuário**: com `VITE_USE_CLOUD_FUNCTIONS=true`, `deleteUserAccount` remove também a conta do Auth. Sem as functions, só perfil/feedbacks/autoavaliações são apagados e o login é recusado por falta de perfil. Logs de auditoria são mantidos por serem imutáveis (base legal: obrigação de conformidade).
4. **Escopo de supervisor por equipe (opt-in)**: por padrão o supervisor gerencia todas as equipes. Para limitar, defina `users/{uid}.managedTeam` (`back-office` ou `teleservice`) no Firestore; as regras e as Cloud Functions passam a restringir leitura/escrita a essa equipe, e um supervisor com escopo não pode promover ninguém nem alterar o próprio escopo. Documentos antigos precisam do campo `team` (`npm run backfill:team`). Isolamento entre *empresas* (multi-organização) continua fora de escopo.
5. **Primeiro supervisor** é promovido manualmente no console (não há como se auto-promover pelo app — é intencional).
6. O histórico do Git ainda contém `drive_folder.html` e demais arquivos removidos do repositório. Reescrever histórico compartilhado exige decisão do dono do repositório; se necessário: `git filter-repo --path drive_folder.html --invert-paths` seguido de force-push coordenado com todos os colaboradores.

## Dependências
`npm audit` aponta 4 achados “high” em `firebase → @firebase/firestore → @grpc/grpc-js@1.9.x`. São vulnerabilidades do **servidor** gRPC (Node) e esse caminho não é empacotado no navegador (o SDK web usa fetch/WebChannel); o “fix” sugerido (`firebase@9.14`) seria um downgrade. Acompanhe atualizações do SDK; o CI bloqueia apenas severidade `critical`.
