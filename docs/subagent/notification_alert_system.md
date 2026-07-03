# Sistema de Central de Notificações e Alertas (PDI & Feedback)

Este documento descreve o design, a implementação e a arquitetura da **Central de Notificações** integrada ao FEED-TRACK.

---

## 1. Visão Geral

A Central de Notificações foi desenvolvida para unificar alertas críticos e melhorar o engajamento dos colaboradores e supervisores nas atividades de desenvolvimento. Ela reúne avisos sobre **novos feedbacks**, **prazos de PDI** e **autoavaliações pendentes** em uma gaveta lateral animada e interativa, com suporte a som corporativo e badges dinâmicos.

---

## 2. Funcionalidades Principais

### 🔔 Badge Dinâmico e Pulsante (Efeito Micro-Badge)
O ícone do sino de notificações exibe uma bolinha vermelha dinâmica quando existem notificações ativas. Ela possui uma animação sutil de pulsação (`animate-ping`) para chamar a atenção do usuário de forma executiva e discreta.

### 🎛️ Gaveta Lateral Deslizante Animada
Desenvolvida utilizando `motion/react` (Framer Motion). Ao clicar no sino, uma gaveta desliza da direita da tela com efeitos de aceleração suave física (`spring`). Um backdrop desfocado (`backdrop-blur`) isola o restante da tela para dar foco à lista de pendências.

### 🔊 Efeito Sonoro Corporativo (Web Audio API)
Para evitar o uso de arquivos estáticos `.mp3` pesados, a central sintetiza um **chime duplo corporativo** de alta frequência utilizando a **Web Audio API** do navegador. O som toca de forma inteligente ao receber novas notificações ou ao abrir a gaveta. Há um controle de silenciamento (Mudo) cujo estado é persistido no `localStorage`.

### 🚨 Regras de Negócio por Perfil de Usuário

#### A. Para o Técnico (Technician):
1. **Novos Feedbacks (Urgente):** Alertas sobre feedbacks enviados pelo supervisor que ainda não foram lidos/assinados. Conta com botão de atalho para assinatura direta na gaveta.
2. **Prazos de PDI (Atenção / Urgente):** Alertas de metas com vencimento próximo (menos de 7 dias) ou atrasadas.
3. **Autoavaliação Pendente (Atenção):** Lembrete caso o técnico não tenha realizado sua autoavaliação para o trimestre/período vigente (ex: `2026-Q2`).

#### B. Para o Supervisor (Supervisor):
1. **Feedbacks Não Lidos (Info):** Avisos sobre feedbacks que o supervisor enviou, mas que o técnico ainda não assinou.
2. **Prazos de PDI da Equipe (Atenção / Urgente):** Alertas de metas dos técnicos da sua equipe que estão prestes a vencer ou que já venceram.
3. **Autoavaliações Faltantes (Info):** Lembretes identificando quais colaboradores da sua equipe ainda não preencheram a autoavaliação trimestral do ciclo vigente.

---

## 3. Estrutura de Arquivos e Componentes

### Componente Principal
* **`src/components/shared/NotificationCenter.tsx`:** Controla o estado de abertura, reproduz os chimes via Web Audio API, calcula as notificações dinâmicas com base no perfil logado e renderiza a gaveta com animações.

### Pontos de Integração
* **`src/components/shared/Header.tsx` (Cabeçalho do Técnico):** Importa o `<NotificationCenter />` e o posiciona no menu superior ao lado do avatar.
* **`src/components/supervisor/SupervisorDashboard.tsx` (Dashboard do Supervisor):** Substitui o sino estático antigo por `<NotificationCenter />` no painel administrativo superior.

---

## 4. Código e Sintonia do Efeito Sonoro

O som corporativo é gerado sinteticamente com o seguinte algoritmo:

```typescript
const playCorporateChime = (muted: boolean) => {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Primeiro tom (D5) - Rápido e suave
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Segundo tom (A5) - Harmônico em intervalo agradável
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.08, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
};
```

---

## 5. Garantia de Qualidade

Todas as dependências foram mantidas em harmonia com o compilador TypeScript:
* A build de produção foi validada com sucesso via `npm run build`.
* As animações respeitam a biblioteca `"motion"` (Framer Motion) instalada nativamente.
* Não há arquivos de áudio estáticos quebrados, já que o som é 100% sintetizado programaticamente.
