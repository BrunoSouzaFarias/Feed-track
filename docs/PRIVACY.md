# Privacidade e LGPD

## Dados tratados
Nome, e-mail corporativo, cargo/equipe, feedbacks de desempenho, metas de PDI, autoavaliações, badges e logs de auditoria (assinaturas). São dados pessoais de empregados; feedbacks de desempenho exigem especial cautela.

## Princípios aplicados
- **Minimização / necessidade**: nenhum dado é copiado para `localStorage` com Firebase real; o cache offline é o do SDK (IndexedDB, isolado por usuário) e é limpo no logout (legado removido em `legacyCleanup.ts`).
- **Acesso restrito**: técnico só lê os próprios dados; supervisor lê a equipe (regras do Firestore).
- **Eliminação**: `userService.deleteUser` remove perfil, feedbacks e autoavaliações. Logs de auditoria são imutáveis e permanecem por obrigação de conformidade/defesa em processo; informe isso na política de privacidade.
- **Transparência**: os “insights” são regras automáticas de apoio à decisão (não IA), exibidos com aviso de que não substituem a avaliação do gestor — evite usá-los como única base de decisões automatizadas sobre pessoas (LGPD art. 20).

## Home Office (prints de evidência)
- Os prints ficam no Firestore (`homeOfficeEvidence`), comprimidos, e só o supervisor da equipe e o próprio colaborador (depois de a semana fechar) conseguem lê-los.
- Um print pode mostrar dados de **clientes** (nomes, protocolos): oriente a recortar só a área necessária.
- **Atestados** (médico e de comparecimento) são registrados **sem imagem**: documento de saúde é dado sensível. Descontar pontos por atestado pode ser questionado na esfera trabalhista; a categoria pode ser desativada em ⚙ e vale validar a regra com o RH.
- Lançamentos não são editados nem apagados (só cancelados com motivo) e a ciência do colaborador gera log de auditoria assinado.

## Pendências organizacionais (fora do código)
- [ ] Publicar política de privacidade e base legal do tratamento (execução de contrato / legítimo interesse).
- [ ] Definir prazo de retenção de feedbacks e rotina de expurgo.
- [ ] Canal para direitos do titular (acesso, correção, eliminação, portabilidade) e responsável (DPO/encarregado).
- [ ] Registrar exportações em massa (PDF/CSV) em um log de acesso, se exigido pela política interna.
