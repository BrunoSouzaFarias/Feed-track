# Avaliação de Home Office — desenho

## Intenção
Hoje a equipe de teleatendimento ganha (ou não) o home office da semana seguinte com base em
ocorrências que os supervisores observam durante a semana. Falta um lugar único para registrar
cada ocorrência **com evidência (print) e o motivo**, e para mostrar isso à pessoa na sexta,
de forma que ela veja por que não conseguiu, **assine que está ciente** e, se quiser, deixe uma
observação (ex.: compromisso de melhora).

## Objetivos
- Supervisor escolhe uma pessoa e lança pontuações da semana com categoria, print e observação.
- Cada pessoa começa a semana com **100 pontos**; cada lançamento desconta pontos.
- Na sexta o supervisor fecha a semana e vê quem atingiu a nota de corte.
- A pessoa acessa as próprias pontuações (com print), assina ciência e pode comentar.
- Evidência fica dentro do sistema, sem custo extra (plano gratuito do Firebase).

## Fora do escopo
- Integração automática com o sistema de chamados, SLA ou WhatsApp (lançamento é manual).
- Montar a escala de home office (o sistema só mostra quem está elegível).
- Envio automático de e-mail/WhatsApp (o supervisor copia um link e envia como quiser).

## O que seria um fracasso mesmo "funcionando"
- A pessoa ver uma pontuação sem evidência ou sem motivo.
- Pontuação poder ser alterada ou apagada em silêncio depois que a pessoa viu.
- Um colaborador conseguir ver pontuações de outro.
- Guardar imagem de atestado médico (dado de saúde, LGPD).

## Regras de negócio
- **Semana**: segunda a domingo, identificada pela data da segunda-feira (`2026-11-09`).
  Saldo = `max(0, 100 − soma dos pontos ativos da semana)`.
- **Categorias** (configuráveis; padrão abaixo, 10 pontos cada — *valor inicial proposto,
  o supervisor ajusta*):
  1. Chamado movido para "aguardando cliente" sem resposta
  2. Atestado médico *(sem anexo de imagem)*
  3. Atestado de comparecimento *(sem anexo de imagem)*
  4. SLA de atendimento
  5. Card devolvido pelo N2 por erro do N1
  6. WhatsApp: chegou e não ficou disponível
  7. WhatsApp: saiu e não deixou indisponível
  8. WhatsApp: almoço com status disponível
- **Nota de corte**: configurável, padrão **70** (*proposto*). Saldo ≥ corte = elegível.
- **Lançamento**: categoria, data da ocorrência, observação obrigatória (mín. 10 caracteres),
  print obrigatório exceto nas categorias de atestado. Os pontos da categoria são **copiados**
  para o lançamento (mudar o peso depois não altera lançamentos antigos).
- **Correção**: lançamento não é editado nem apagado. O supervisor pode **cancelar** com motivo
  enquanto a semana está aberta; o cancelado continua visível (riscado) e não desconta.
- **Fechamento**: o supervisor fecha a semana da pessoa (ou de toda a equipe). Fechada, a semana
  fica travada: sem novos lançamentos nem cancelamentos. Reabrir só é possível enquanto a pessoa
  ainda não assinou.
- **Visibilidade para o colaborador**: só vê a semana **depois de fechada** (é o processo
  descrito: análise durante a semana, conversa na sexta). *Decisão minha; fácil de inverter.*
- **Ciência**: o colaborador assina uma vez por semana fechada, com comentário opcional
  (até 1000 caracteres). Usa a assinatura digital já existente e gera log de auditoria.
  Todos podem assinar, inclusive quem ficou elegível.

## Abordagens consideradas (onde guardar o print)
- **A. Comprimir no navegador e guardar no Firestore — escolhida pelo usuário.** Gratuito, sem
  serviço novo, evidência dentro do sistema. Limite: 1 print por lançamento, qualidade de tela.
- B. Firebase Storage: qualidade original, mas exige plano Blaze e mais configuração.
- C. Só link externo (Drive/SharePoint): simples, mas a evidência pode sumir ou ficar sem permissão.

## Como (decisões técnicas — minhas, seguindo o que o projeto já usa)
### Dados (Firestore)
- `config/homeOffice` — `{ categories: [{ id, label, points, requiresEvidence, active }], threshold, updatedAt, updatedBy }`.
  Sem documento = padrões acima.
- `homeOfficePoints/{id}` — `{ id, technicianId, technicianName, team, weekId, categoryId,
  categoryLabel, points, note, occurredOn, hasEvidence, status: 'active'|'cancelled',
  cancelReason?, cancelledBy?, cancelledAt?, createdBy, createdAt }`.
- `homeOfficeEvidence/{pointId}` — `{ pointId, technicianId, team, weekId, dataUrl, createdBy, createdAt }`.
  Separado do lançamento para as listas não baixarem imagens.
- `homeOfficeWeeks/{weekId}_{technicianId}` — `{ technicianId, technicianName, team, weekId, score,
  threshold, eligible, closedBy, closedAt, ackAt?, ackComment? }`. Existir = semana fechada.

### Print
- Entrada por **colar (Ctrl+V)**, arrastar ou escolher arquivo; só imagens.
- Compressão no navegador (canvas): lado maior até 1600 px, JPEG, reduzindo a qualidade até
  ficar ≤ 600 KB em base64 (limite do documento Firestore: 1 MiB). Se não couber, recusa com aviso.
- A CSP atual já permite `img-src data:`.

### Regras de acesso (`firestore.rules`, espelhadas em `firestore.strict.rules`)
- Supervisor (respeitando `managedTeam`): lê/cria lançamentos e evidências da equipe; cancela
  lançamento ativo; cria/apaga (reabre) semana sem assinatura; edita `config/homeOffice`
  (supervisor sem escopo).
- Lançamento/evidência/semana novos são recusados se a semana já está fechada.
- Colaborador: lê os próprios lançamentos, evidências e semana **somente se a semana está
  fechada**; atualiza apenas `ackAt`/`ackComment`, uma única vez.
- Validação de esquema e tamanho (nota ≤ 1000, dataUrl ≤ 900 000 caracteres, pontos 1–100).
- `auditLogs`: novo `eventType` `home_office_ack`, aceito só se a semana existir, for do próprio
  usuário e já tiver `ackAt`.

### Telas
- **Supervisor → aba "Home Office"**: seletor de semana; lista da equipe com saldo, barra e
  selo "elegível / não elegível / fechada / ciente"; ao escolher a pessoa, formulário de
  lançamento + histórico da semana (com miniatura que amplia); botões "Fechar semana",
  "Fechar equipe", "Copiar link"; engrenagem para pesos e nota de corte.
- **Colaborador → aba "Home Office"**: semanas fechadas, saldo e resultado, cada pontuação com
  categoria, data, observação e print; campo de comentário e botão "Estou ciente".
  Link direto: `/technician?tab=home-office`.

```
Home Office — semana de 09/11            [< semana >]  [⚙]
Ana Silva        ████████░░  80   elegível
Bruno Souza      █████░░░░░  50   não elegível   [Fechar semana]
---------------------------------------------------------------
Bruno Souza · saldo 50
[Categoria ▾] [Data] [Observação.............] [Colar print]  (+ Lançar)
−10  Card devolvido pelo N2    11/11  "Card 4821 sem evidência"   [print]
−10  WhatsApp: almoço dispon.  12/11  "12h10 ainda disponível"    [print]  cancelar
```

### Código
- `src/services/homeOfficeService.ts` (Firestore + modo mock em localStorage, como os demais),
  `src/services/homeOfficeLogic.ts` (semana, saldo, elegibilidade — puro) e
  `src/services/imageCompress.ts`.
- `src/components/supervisor/HomeOffice*.tsx`, `src/components/technician/MyHomeOffice.tsx`.
- Tipos em `src/types`; `team` denormalizado como nas outras coleções.

### Testes
- Unitários: cálculo de semana/saldo/elegibilidade; escolha de qualidade na compressão.
- Regras (emulador): colaborador não lê semana aberta nem dados de outro; não altera pontos;
  assina uma vez; supervisor com escopo fica na própria equipe; nada entra em semana fechada;
  log `home_office_ack` exige ciência real.
- Navegador (modo mock): lançar com print colado, fechar, assinar como colaborador.

## Deixado para quem implementar
Layout fino, textos, animações (seguir o padrão visual existente) e a ordem de implementação.

## Pontos de atenção
- Descontar pontos por **atestado médico** pode ser questionado na esfera trabalhista; a categoria
  existe porque foi pedida, pode ser desativada na configuração. Recomenda-se validar com o RH.
- Regras e índices novos precisam de `firebase deploy` antes do app novo.
