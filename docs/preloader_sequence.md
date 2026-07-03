# Componente Preloader de Alta Fidelidade & Transição Imersiva (Split-Door Reveal)

Este documento descreve a especificação técnica, o design das animações e o fluxo de ciclo de vida do componente `Preloader` integrado ao aplicativo **FEED-TRACK**.

---

## 🚀 Visão Geral

O `Preloader` atua como a primeira camada visual e funcional do FEED-TRACK. Ele tem o duplo propósito de garantir que recursos críticos da aplicação (como fontes tipográficas e imagens pesadas) estejam totalmente carregados antes da exibição da interface, e de proporcionar uma experiência de boas-vindas premium através de animações cinéticas coordenadas e um efeito finalizador de **Split-Door Sweep (cortina dividida)**.

---

## 🛠️ Tecnologias Utilizadas

- **React 19 & TypeScript**: Para controle de ciclo de vida e estado tipado.
- **Framer Motion (`motion/react` v12)**: Para orquestração das transições físicas e de layout.
- **Tailwind CSS v4**: Para estilização fluida, suporte nativo ao modo escuro e responsividade.
- **Lucide React**: Ícones vetoriais de estado dinâmico (`Cpu`, `Activity`, `ShieldAlert`, `Sparkles`, `CheckCircle2`).

---

## 📦 Detalhes de Implementação

### 1. Carregamento de Recursos

O preloader utiliza técnicas reais e simuladas em conjunto para otimizar o tempo de espera percebível e real do usuário:
- **Fontes**: Utilização da API nativa `document.fonts.ready` para assegurar que a fonte institucional **Hanken Grotesk** esteja renderizada antes de prosseguir.
- **Imagens**: Pré-carregamento programático em background do arquivo de destaque do Hero (`hero.png`).
- **Simulação Realista de Progresso**: Um contador dinâmico e uma barra tridimensional avançam ao longo de um ciclo de 2.5 segundos, exibindo mensagens de status refinadas e específicas da operação do aplicativo (e.g., conexões seguras, sincronização de feedbacks e PDIs).

### 2. Estados da Transição

As etapas e textos informativos exibidos em sincronia com o progresso são:
1. `0%` - *Estabelecendo conexão segura...*
2. `20%` - *Carregando fontes e componentes dinâmicos...*
3. `45%` - *Sincronizando base de dados de feedbacks...*
4. `70%` - *Estruturando planos de desenvolvimento individual (PDI)...*
5. `90%` - *Otimizando performance e renderização...*
6. `100%` - *Tudo pronto!*

### 3. O Efeito Split-Door Reveal

Assim que o progresso atinge 100% e os recursos chave estão em cache:
1. Um sinalizador de finalização (`isFinishing`) é definido como `true`.
2. Usando o componente `<AnimatePresence>` do Framer Motion, as duas metades da tela (portas esquerda e direita com largura de `50vw` cada) iniciam uma animação de saída:
   - **Porta Esquerda**: Desliza para fora da tela pelo eixo X (`x: "-100%"`).
   - **Porta Direita**: Desliza para fora da tela pelo eixo X (`x: "100%"`).
3. O conteúdo central esmaece (`opacity: 0`) e se desloca levemente para cima.
4. Após `800ms` (tempo da transição física das portas), o callback `onComplete()` é invocado, desmontando permanentemente o Preloader no componente pai (`App.tsx`) e liberando a interação completa com o painel principal do FEED-TRACK.

---

## 📂 Arquivos Modificados ou Criados

1. **`src/components/shared/Preloader.tsx`** [Criado]
   - Componente core que encapsula os painéis de split-door, a barra de progresso em gradiente e o ciclo de simulação e carregamento assíncrono.
2. **`src/App.tsx`** [Modificado]
   - Integração do Preloader na raiz da aplicação. O estado `showPreloader` controla condicionalmente a montagem do componente.
3. **`src/components/shared/CustomCursor.tsx`** [Corrigido]
   - Ajuste na chamada do contexto de cursor (`useCursor()`) para obter a função `setCursorType`, resolvendo bugs anteriores de compilação.
4. **`src/components/auth/LoginForm.tsx`** [Corrigido]
   - Correção do fechamento da tag `<Tilt3D>` que causava falha na compilação do TypeScript.

---

## 📈 Benefícios Obtidos

- **Zero Flash of Unstyled Text (FOUT)**: O uso do `document.fonts.ready` previne que o texto do site mude bruscamente de fonte após o carregamento inicial.
- **Aparência Premium**: O efeito split-door cria um impacto teatral e profissional, alinhado com a proposta de *Executive Precision* do design system do FEED-TRACK.
- **Compilação Estável**: A aplicação agora passa 100% nos testes de build de produção (`npm run build`).
