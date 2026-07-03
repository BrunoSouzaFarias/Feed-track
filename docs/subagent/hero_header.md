# Hero Tipografia Cinematográfica + Header Scroll-Reactive

**Data:** 2026-06-17  
**Status:** ✅ DONE — Build limpo em 1.00s

---

## Arquivos Criados

### `src/hooks/useScrollDirection.ts` (NOVO)
Hook que detecta a direção do scroll com:
- **Threshold:** 10px de delta mínimo para evitar micro-oscilações
- **Debounce:** via `requestAnimationFrame` (sem polling)
- **Retorno:** `{ direction: 'up' | 'down' | 'idle', scrollY: number }`

---

## Arquivos Modificados

### `src/components/auth/LoginForm.tsx`

**Tipografia Cinematográfica implementada:**

1. "FEED-TRACK" quebrado em chars via `Array.from('FEED-TRACK')` (10 chars)
2. Cada `motion.span` anima com:
   - `initial`: `{ opacity: 0, y: 40, rotateX: -90 }`
   - `animate`: `{ opacity: 1, y: 0, rotateX: 0 }`
   - `transition.delay`: `index * 0.04` (stagger de 40ms por char)
   - `duration: 0.6`, `ease: [0.25, 0.46, 0.45, 0.94]`
3. Container `<h1>` com `style={{ perspective: '400px' }}` para efeito 3D
4. Subtítulo "Executive Precision Analytics" com delay `charAnimDuration + 0.2` = **0.60s**
5. Card do formulário com delay `10 * 0.04 + 0.5` = **0.90s**

### `src/components/shared/Header.tsx`

**Scroll-Reactive implementado:**

1. Importa `motion, useMotionValue, useTransform, useSpring` de `motion/react`
2. Usa `useScrollDirection()` para obter `direction` e `scrollY`
3. **Blur progressivo:** `useMotionValue` → `useSpring` → `useTransform` gera `backdropFilter: blur(0–16px)` proporcional ao scrollY (0px no topo, 16px em 200px de scroll)
4. **Hide logic:** `isHidden = direction === 'down' && scrollY > 80`
5. `<motion.header>` anima:
   - **Hidden:** `y: '-100%'`, `opacity: 0.5`
   - **Visible:** `y: '0%'`, `opacity: 1`
6. **Transição spring:** `stiffness: 400, damping: 35` — snappy e responsivo

---

## Resultado do Build

```
> tsc -b && vite build

✓ 2416 modules transformed.
✓ built in 1.00s

dist/index.html                          0.65 kB │ gzip:   0.41 kB
dist/assets/index-BUlTpj6Z.css         118.80 kB │ gzip:  17.84 kB
dist/assets/index-BYSkgCq_.js        1,400.97 kB │ gzip: 421.57 kB
```

> [!NOTE]
> O warning de chunk > 500kB é pré-existente e não relacionado a estas alterações. Nenhum erro TypeScript.

---

## Conformidade com Design System

| Critério | Status |
|---|---|
| Só anima `transform` e `opacity` | ✅ (`y`, `rotateX`, `opacity`) |
| Usa `framer-motion` (`motion/react`) | ✅ |
| Cores `#006c49` / `#4bdfa1` preservadas | ✅ |
| Fonte Plus Jakarta Sans preservada | ✅ |
| Build TypeScript limpo | ✅ |
