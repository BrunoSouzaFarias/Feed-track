# Segurança

## Modelo
A autorização **real** está em `firestore.rules` (o cliente é público e não confiável). `ProtectedRoute` e a UI são apenas conveniência.

| Controle | Onde |
|---|---|
| Técnico não altera `role/active/team/position/email` | `firestore.rules` (`users.update` por `affectedKeys`) |
| Conta desativada perde acesso mesmo com token válido | `isActiveUser()` / `isSupervisor()` exigem `active == true` |
| Conteúdo do feedback imutável para o técnico (só `status/readAt/signedAt`) | `feedbacks.update` |
| Esquema/limites validados no servidor (tipos, tamanhos, notas 1–5, período) | regras de `create` |
| Auditoria imutável, com `createdAt` do servidor e evidência (feedback existente e assinado) | `auditLogs` |
| Assinatura ECDSA P-256 real, chave privada não-exportável | `signatureService.ts` |
| Nenhum dado pessoal em `localStorage` com Firebase real; limpeza no boot/logout | `legacyCleanup.ts`, serviços |
| Modo mock bloqueado em produção | `services/env.ts`, `main.tsx` |
| Headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy) | `firebase.json` |
| Anti força bruta no cliente, mensagens de erro genéricas (sem enumeração) | `useAuth.ts` |
| Senha ≥ 10 caracteres com letras e números | `passwordPolicy.ts` |
| Service worker: rede primeiro para HTML; cache só de `/assets/*` com hash | `public/sw.js` |

Testes das regras: `npm run test:rules` (15 casos; contra as regras antigas, 8 falham — os mesmos que provam as brechas corrigidas).

## Checklist de deploy (itens que NÃO estão no código)
- [ ] **App Check** com reCAPTCHA v3: defina `VITE_FIREBASE_APPCHECK_SITE_KEY` e ative a imposição para Firestore e Auth no console.
- [ ] **Firebase Auth → Política de senha**: exigir 10+ caracteres e complexidade (o cliente valida, o servidor deve impor).
- [ ] **Domínios autorizados** do Auth: somente o(s) domínio(s) de produção.
- [ ] **Restrições da API key** (HTTP referrers) no Google Cloud Console.
- [ ] **Cadastro público**: se o sistema é interno, restrinja por domínio (`VITE_ALLOWED_EMAIL_DOMAIN`, defesa em profundidade) **e** desative o auto-cadastro ou use uma *blocking function* / convites.
- [ ] **E-mail verificado**: o app envia o e-mail de verificação, mas não bloqueia o acesso sem ele (evita travar contas existentes). Para exigir, adicione `request.auth.token.email_verified == true` às regras.
- [ ] Backups/exportação agendada do Firestore e alertas de uso.
- [ ] Monitoramento: defina `VITE_ERROR_REPORT_URL` (ver `docs/DEPLOY.md`); sem ela, erros só vão para o console.

## Riscos residuais (conhecidos)
1. **Badges e progresso do PDI** são gravados pelo cliente do técnico (as regras impedem remover itens, mas um técnico mal-intencionado pode marcar a própria meta como concluída ou se conceder badge). Para rigor total, mover essas escritas para Cloud Functions.
2. **Assinatura digital**: sem âncora central de chaves públicas não há não-repúdio jurídico forte (ver `docs/subagent/audit_trail_compliance.md`).
3. **Exclusão de usuário** apaga perfil, feedbacks e autoavaliações, mas **não a conta do Firebase Auth** (exige Admin SDK/Cloud Function). Sem perfil, o login é recusado. Logs de auditoria são mantidos por serem imutáveis (base legal: obrigação de conformidade).
4. **Multi-tenant**: todo supervisor vê todos os colaboradores. Se houver várias equipes/empresas, é preciso modelar `teamId`/`orgId` nas regras.
5. **Primeiro supervisor** é promovido manualmente no console (não há como se auto-promover pelo app — é intencional).
6. O histórico do Git ainda contém `drive_folder.html` e demais arquivos removidos do repositório; reescreva o histórico (`git filter-repo`) se isso for sensível.

## Dependências
`npm audit` aponta 4 achados “high” em `firebase → @firebase/firestore → @grpc/grpc-js@1.9.x`. São vulnerabilidades do **servidor** gRPC (Node) e esse caminho não é empacotado no navegador (o SDK web usa fetch/WebChannel); o “fix” sugerido (`firebase@9.14`) seria um downgrade. Acompanhe atualizações do SDK; o CI bloqueia apenas severidade `critical`.
