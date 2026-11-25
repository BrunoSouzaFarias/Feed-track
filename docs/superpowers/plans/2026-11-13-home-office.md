# Avaliação de Home Office — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página onde o supervisor lança pontuações semanais com print e motivo, fecha a semana, e o colaborador vê, assina ciência e comenta.

**Architecture:** Lógica pura (semana, saldo, elegibilidade) separada do serviço (Firestore + modo mock em localStorage, como os demais serviços). Print comprimido no navegador e gravado em documento próprio. Acesso garantido por `firestore.rules`; a UI só reflete as regras.

**Tech Stack:** React 19 + TypeScript, Tailwind 4, motion, lucide-react, Firebase Firestore, vitest, `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-11-13-home-office-design.md`

## Global Constraints
- Semana = segunda a domingo; `weekId` = data local da segunda, `YYYY-MM-DD`.
- Saldo = `max(0, 100 − soma dos pontos ativos)`; nota de corte padrão **70**; elegível se saldo ≥ corte.
- 8 categorias padrão, **10 pontos** cada; as duas de atestado têm `requiresEvidence: false` e **nunca** aceitam imagem.
- Observação obrigatória, 10–1000 caracteres. Comentário de ciência até 1000.
- Print: lado maior ≤ 1600 px, JPEG, `dataUrl.length ≤ 800_000`; a regra do servidor aceita até 900 000.
- Lançamento nunca é editado/apagado: só cancelado com motivo, e só com a semana aberta.
- Colaborador só enxerga semana **fechada**; assina uma única vez.
- Sem dependências novas. Sem `any`. `npm run lint` com 0 erros e 0 avisos.
- Textos em pt-BR; seguir tokens visuais existentes (verde `#006c49` / `#0bbb81`, superfícies zinc, modo claro/escuro, `prefers-reduced-motion`).

## Review Focus
1. Colar algo que não é imagem, ou imagem que não cabe mesmo na menor qualidade → aviso claro, nada é gravado (Task 2).
2. Lançamento com data de domingo à noite / virada de semana → cai na semana certa no fuso local (Task 1).
3. Dois supervisores fecham a mesma semana, ou lançam enquanto outro fecha → o segundo recebe erro e nada entra em semana fechada (Task 3).
4. Soma de descontos acima de 100 → saldo 0, nunca negativo; cancelados não contam (Task 1).
5. Colaborador abre o link de uma semana ainda aberta ou de outra pessoa → vê estado vazio, sem erro e sem dados (Tasks 3 e 6).

---

### Task 1: Tipos e lógica pura

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/homeOfficeLogic.ts`
- Test: `src/services/homeOfficeLogic.test.ts`

**Interfaces — Produces:**
```ts
// src/types/index.ts
export type Team = 'back-office' | 'teleservice';
export interface HomeOfficeCategory { id: string; label: string; points: number; requiresEvidence: boolean; active: boolean }
export interface HomeOfficeConfig { categories: HomeOfficeCategory[]; threshold: number }
export interface HomeOfficePoint {
  id: string; technicianId: string; technicianName: string; team: Team; weekId: string;
  categoryId: string; categoryLabel: string; points: number; note: string; occurredOn: string; // YYYY-MM-DD
  hasEvidence: boolean; status: 'active' | 'cancelled';
  cancelReason?: string; cancelledBy?: string; cancelledAt?: Timestamp;
  createdBy: string; createdAt: Timestamp;
}
export interface HomeOfficeEvidence { pointId: string; technicianId: string; team: Team; weekId: string; dataUrl: string; createdBy: string; createdAt: Timestamp }
export interface HomeOfficeWeek {
  id: string; technicianId: string; technicianName: string; team: Team; weekId: string;
  score: number; threshold: number; eligible: boolean; closedBy: string; closedAt: Timestamp;
  ackAt?: Timestamp; ackComment?: string;
}
// AuditLog['eventType'] ganha 'home_office_ack'

// src/services/homeOfficeLogic.ts
export const DEFAULT_HOME_OFFICE_CONFIG: HomeOfficeConfig; // 8 categorias, 10 pts, threshold 70
export function weekIdOf(date: Date): string;              // segunda-feira local
export function weekIdOfDateString(ymd: string): string;   // usa parseLocalDate
export function shiftWeek(weekId: string, delta: number): string;
export function weekRangeLabel(weekId: string): string;    // "09/11 a 15/11"
export function computeScore(points: Pick<HomeOfficePoint,'points'|'status'>[]): number;
export function isEligible(score: number, threshold: number): boolean;
export function weekDocId(weekId: string, technicianId: string): string; // `${weekId}_${technicianId}`
export function validatePointInput(i: { category?: HomeOfficeCategory; note: string; occurredOn: string; hasEvidence: boolean }): string | null;
```
IDs das categorias padrão: `ticket_waiting_no_reply`, `medical_certificate`, `attendance_certificate`, `sla`, `n2_return`, `whatsapp_arrival`, `whatsapp_leave`, `whatsapp_lunch` (rótulos do spec).

- [ ] **Step 1: testes que falham** — em `homeOfficeLogic.test.ts`:
```ts
expect(weekIdOf(new Date(2026, 10, 15, 23, 30))).toBe('2026-11-09'); // domingo à noite
expect(weekIdOf(new Date(2026, 10, 16, 0, 5))).toBe('2026-11-16');   // segunda
expect(weekIdOfDateString('2026-11-09')).toBe('2026-11-09');
expect(shiftWeek('2026-11-09', -1)).toBe('2026-11-02');
expect(weekRangeLabel('2026-11-09')).toBe('09/11 a 15/11');
expect(computeScore([])).toBe(100);
expect(computeScore([{points:10,status:'active'},{points:10,status:'cancelled'}])).toBe(90);
expect(computeScore(Array(15).fill({points:10,status:'active'}))).toBe(0);
expect(isEligible(70,70)).toBe(true); expect(isEligible(69,70)).toBe(false);
expect(DEFAULT_HOME_OFFICE_CONFIG.categories).toHaveLength(8);
expect(DEFAULT_HOME_OFFICE_CONFIG.categories.filter(c=>!c.requiresEvidence).map(c=>c.id)).toEqual(['medical_certificate','attendance_certificate']);
// validatePointInput: sem categoria; nota < 10; nota > 1000; data inválida; print faltando quando exigido;
// print presente em categoria de atestado → erro; caso válido → null
```
- [ ] **Step 2:** `npx vitest run src/services/homeOfficeLogic.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** implementar tipos e funções acima.
- [ ] **Step 4:** mesmo comando → PASS; `npx tsc -b` limpo.
- [ ] **Step 5:** commit `feat(home-office): types and scoring logic`.

### Task 2: Compressão do print

**Files:** Create `src/services/imageCompress.ts`; Test `src/services/imageCompress.test.ts`

**Interfaces — Produces:**
```ts
export const MAX_SIDE = 1600; export const MAX_DATA_URL_LENGTH = 800_000;
export function fitDimensions(w: number, h: number, maxSide?: number): { width: number; height: number };
/** Tenta as qualidades em ordem e devolve o primeiro resultado que cabe; null se nenhum couber. */
export function pickEncoding(encode: (quality: number) => string, maxLength?: number, qualities?: number[]): string | null; // padrão [0.85,0.7,0.55,0.4]
/** Lança AppError('Cole ou selecione uma imagem.') se não for image/*; AppError('O print é grande demais...') se não couber. */
export async function compressImage(file: Blob): Promise<string>; // dataURL JPEG; usa createImageBitmap + canvas
```
- [ ] **Step 1: testes** — `fitDimensions(3200,1600)` → `{1600,800}`; `(800,600)` inalterado; `(1000,4000)` → `{400,1600}`; `pickEncoding` devolve a 1ª que cabe, tenta na ordem, e `null` quando nenhuma cabe; `compressImage(new Blob(['x'],{type:'text/plain'}))` rejeita com a mensagem de imagem.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar → PASS. **Step 5:** commit `feat(home-office): client-side screenshot compression`.

### Task 3: Regras do Firestore

**Files:** Modify `firestore.rules`, `firestore.indexes.json`; regenerar `firestore.strict.rules` (`npm run rules:strict`); Test `tests/rules/homeOffice.rules.test.ts`

Regras (usar os helpers existentes `supervisorOf`, `isFullSupervisor`, `isActiveUser`, `isOwner`):
- helper `hoWeekClosed(weekId, techId)` = `exists(homeOfficeWeeks/$(weekId + '_' + techId))`.
- `config/homeOffice`: read `isActiveUser()`; create/update `isFullSupervisor()` com `threshold` número 0–100 e `categories` lista de 1–30; delete nunca.
- `homeOfficePoints/{id}`: read `supervisorOf(team)` ou (dono **e** semana fechada). Create: `supervisorOf(team)`, `team` igual ao do usuário-alvo, `createdBy == auth.uid`, `status == 'active'`, `points` 1–100, `note` 10–1000, `weekId`/`occurredOn` no formato `^\d{4}-\d{2}-\d{2}$`, semana **aberta**. Update: só supervisor da equipe, semana aberta, `active → cancelled`, alterando apenas `status, cancelReason, cancelledBy, cancelledAt` com `cancelReason` 5–500. Delete nunca.
- `homeOfficeEvidence/{pointId}`: read como o lançamento; create supervisor da equipe, semana aberta, `dataUrl` começa com `data:image/jpeg;base64,` e tamanho ≤ 900000; update/delete nunca.
- `homeOfficeWeeks/{id}`: read `supervisorOf(team)` ou dono. Create supervisor da equipe com `id == weekId + '_' + technicianId`, `closedBy == auth.uid`, `closedAt == request.time`, `score` 0–100, sem `ackAt`. Update: só o dono, uma vez (`!('ackAt' in resource.data)`), mudando apenas `ackAt` (== `request.time`) e `ackComment` (≤ 1000). Delete: supervisor da equipe e sem `ackAt` (reabrir).
- `auditLogs`: novo ramo `eventType == 'home_office_ack'`: dono, e `homeOfficeWeeks/$(entityId)` existe, é dele e tem `ackAt`.
- Índices: `homeOfficePoints` (`team` ASC, `weekId` ASC) e (`technicianId` ASC, `weekId` ASC); `homeOfficeWeeks` (`team` ASC, `weekId` ASC).

- [ ] **Step 1: testes que falham** (mesmo padrão de `tests/rules/firestore.rules.test.ts`; rodar contra as duas regras):
  supervisor cria ponto/evidência/semana da equipe ✔; técnico não cria ponto ✗; técnico lê os próprios pontos/evidência com semana **aberta** ✗ e **fechada** ✔ (inclusive via consulta `where technicianId == uid, where weekId == X`); técnico lê pontos de outro ✗; ponto/evidência novos em semana fechada ✗; cancelar com semana aberta ✔ / fechada ✗ / editar `points` ou `note` ✗; delete de ponto ✗; evidência > 900000 ou não-JPEG ✗; segunda criação da mesma semana ✗; técnico assina a própria semana ✔, segunda vez ✗, mudando `score` ✗; reabrir sem ciência ✔ / com ciência ✗; supervisor com `managedTeam` de outra equipe: tudo ✗; `home_office_ack` sem `ackAt` ✗ / com ✔; `config/homeOffice` por supervisor com escopo ✗.
- [ ] **Step 2:** `npm run test:rules` → os novos FALHAM. **Step 3:** escrever regras, rodar `npm run rules:strict`. **Step 4:** `npm run test:rules` → tudo PASS (antigos inclusive). **Step 5:** commit `feat(home-office): firestore rules and indexes`.

### Task 4: Serviço

**Files:** Create `src/services/homeOfficeService.ts`; Modify `src/services/auditService.ts` (texto de `details` para `home_office_ack`: `Ciência da avaliação de home office por ${technicianName}.`), `src/services/legacyCleanup.ts` (não tocar nas chaves novas de mock)

**Interfaces — Consumes:** Task 1 e 2. **Produces:**
```ts
export const homeOfficeService = {
  getConfig(): Promise<HomeOfficeConfig>,                       // sem doc → DEFAULT_HOME_OFFICE_CONFIG
  saveConfig(config: HomeOfficeConfig): Promise<void>,
  listPoints(weekId: string, technicianId?: string): Promise<HomeOfficePoint[]>, // sem technicianId: equipe (respeita scope)
  listWeeks(weekId: string): Promise<HomeOfficeWeek[]>,          // equipe
  listMyWeeks(technicianId: string): Promise<HomeOfficeWeek[]>,  // fechadas, mais recente primeiro
  getEvidence(pointId: string): Promise<string | null>,          // dataUrl
  addPoint(input: { technician: User; category: HomeOfficeCategory; note: string; occurredOn: string; evidence?: string }): Promise<HomeOfficePoint>,
  cancelPoint(point: HomeOfficePoint, reason: string): Promise<void>,
  closeWeek(technician: User, weekId: string, threshold: number): Promise<HomeOfficeWeek>, // recalcula o saldo lendo os pontos
  reopenWeek(week: HomeOfficeWeek): Promise<void>,
  acknowledge(week: HomeOfficeWeek, comment: string): Promise<void>, // atualiza a semana e registra auditService.registerLog('home_office_ack', week.id, ...)
};
```
Padrão do projeto: `isFirebaseMock` → localStorage (`feed_track_mock_ho_points|evidence|weeks|config`), senão Firestore via `offlineSyncService.run`; `scope.get()` filtra por equipe; IDs por `newId('ho')`; `addPoint` grava evidência **antes** do ponto (ponto com `hasEvidence` nunca fica sem print) e valida com `validatePointInput`; `weekId` do ponto = `weekIdOfDateString(occurredOn)`; erros como `AppError`. Em mock, `closeWeek` em semana já fechada lança `AppError('Esta semana já foi fechada.')`.
- [ ] **Step 1:** implementar. **Step 2:** `npx tsc -b && npm run lint` limpos. **Step 3:** commit `feat(home-office): service`. (O serviço é exercitado ponta a ponta na Task 7.)

### Task 5: Tela do supervisor

**Files:** Create `src/components/supervisor/HomeOffice.tsx` (orquestra), `HomeOfficeTeamList.tsx`, `HomeOfficeEntryForm.tsx`, `HomeOfficePointList.tsx`, `HomeOfficeConfigModal.tsx`, `src/components/shared/ScoreRing.tsx`, `src/components/shared/EvidenceInput.tsx`, `src/components/shared/EvidenceLightbox.tsx`; Modify `SupervisorSidebar.tsx` (tab `{ id: 'homeoffice', label: 'Home Office', icon: Home }`, tipo `SupervisorTab`), `SupervisorDashboard.tsx`

**Interfaces — Consumes:** Task 4. **Produces:** `<HomeOffice technicians={User[]} />`; `<ScoreRing score threshold size? />`; `<EvidenceInput value onChange />` (colar Ctrl+V na página, arrastar, escolher arquivo; chama `compressImage`); `<EvidenceLightbox pointId onClose />` (carrega via `getEvidence`, usa `useModalA11y`).

Comportamento e visual (é a tela principal — caprichar):
- Cabeçalho: título, seletor de semana (`‹ 09/11 a 15/11 ›`, sem avançar além da semana atual), filtro de equipe (padrão Teleservice quando o supervisor não tem escopo), botão ⚙ e 3 cartões-resumo (elegíveis, não elegíveis, aguardando ciência).
- Lista da equipe em cartões: avatar, nome, `ScoreRing` animado (verde ≥ corte, âmbar até 15 pontos abaixo, vermelho abaixo disso), nº de ocorrências e selo de estado: `Em aberto` / `Elegível` / `Não elegível` / `Ciente`.
- Painel da pessoa (ao lado em telas largas, abaixo em estreitas): saldo grande, formulário (categoria com o desconto visível, data com padrão hoje, observação com contador, área de print com pré-visualização; some nas categorias de atestado com a nota "Atestados não recebem anexo"), e linha do tempo das ocorrências (−pontos, categoria, data, observação, miniatura que abre o lightbox, "Cancelar" com motivo; cancelados riscados).
- Ações: `Fechar semana` (confirma mostrando saldo e resultado), `Fechar equipe`, `Reabrir` (só sem ciência), `Copiar link` (`${origin}/technician?tab=home-office`).
- Semana fechada: formulário desabilitado com explicação.
- Estados: skeleton ao carregar, `EmptyState` sem ocorrências, toasts com `friendlyError`.
- Modal ⚙ (só supervisor sem `managedTeam`): editar pontos de cada categoria (1–100), ativar/desativar, nota de corte (0–100).
- [ ] **Step 1:** implementar. **Step 2:** `npx tsc -b && npm run lint` limpos. **Step 3:** `npm run dev`, entrar como supervisor demo e conferir visualmente (claro e escuro, 1280 px e 390 px). **Step 4:** commit `feat(home-office): supervisor page`.

### Task 6: Tela do colaborador

**Files:** Create `src/components/technician/MyHomeOffice.tsx`; Modify `TechnicianDashboard.tsx` (tab `{ id: 'home-office', label: 'Home Office', icon: Home }`; aba inicial lida de `?tab=` via `useSearchParams`, aceitando só ids válidos)

**Interfaces — Consumes:** Task 4, `ScoreRing`, `EvidenceLightbox`. **Produces:** `<MyHomeOffice userProfile={User} />`
- Lista de semanas fechadas (mais recente aberta por padrão): `ScoreRing`, resultado ("Home office garantido" / "Não atingiu a nota de corte (70)"), ocorrências com print, e bloco de ciência: textarea opcional (≤ 1000, com contador) + botão `Estou ciente`; depois de assinar mostra data e comentário, somente leitura.
- Sem semana fechada: estado vazio "Nenhuma avaliação fechada ainda. Quando seu supervisor fechar a semana, ela aparece aqui."
- [ ] **Step 1:** implementar. **Step 2:** `npx tsc -b && npm run lint` limpos. **Step 3:** commit `feat(home-office): collaborator page with acknowledgement`.

### Task 7: Verificação ponta a ponta e documentação

**Files:** Modify `docs/DEPLOY.md`, `docs/PRIVACY.md`, `README.md`
- [ ] **Step 1:** script Playwright (scratchpad, modo mock): supervisor lança 4 ocorrências em um técnico de teleatendimento, uma com print colado (PNG gerado em canvas), cancela uma, fecha a semana (saldo 70 → elegível; depois outro técnico com 4 ativas → 60, não elegível); técnico entra por `/technician?tab=home-office`, vê as ocorrências e o print, assina com comentário; supervisor vê selo `Ciente` e não consegue reabrir. Sem erros no console. Colar texto no lugar de imagem mostra o aviso.
- [ ] **Step 2:** `npm run ci`, `npm run test:rules`, `npm run test:functions` → tudo verde.
- [ ] **Step 3:** docs: seção "Home Office" no DEPLOY (deploy de regras e índices antes do app), nota de privacidade (prints podem conter dados de clientes; atestados sem imagem), linha no README.
- [ ] **Step 4:** commit `docs(home-office): deploy and privacy notes`, push.
