# Implementação do Gráfico de Radar Interativo (Radar Chart)

Este documento descreve a especificação técnica e o fluxo de dados da implementação do Gráfico de Radar dinâmico e interativo em SVG criado para comparar as notas de autoavaliação dos técnicos com as avaliações dos supervisores no **Feed-Track**.

---

## 1. Visão Geral

O Gráfico de Radar é uma ferramenta de análise visual integrada em ambos os dashboards (Supervisor e Técnico) para comparar duas perspectivas cruciais de competência:
1. **Autoavaliação (Perspectiva do Técnico):** Nota dada pelo próprio colaborador em seu formulário trimestral de autoavaliação.
2. **Avaliação do Supervisor (Perspectiva de Liderança):** Nota calculada dinamicamente com base no histórico de feedbacks positivos ou de desenvolvimento recebidos pelo técnico.

### Competências Avaliadas (Eixos)
* **Comunicação:** Habilidades interpessoais, clareza e empatia.
* **Trabalho em Equipe:** Colaboração com os membros do time.
* **Conhecimento Técnico:** Domínio das ferramentas, sistemas e processos.
* **Proatividade:** Iniciativa e resolução autônoma de problemas.
* **Comprometimento:** Assiduidade, cumprimento de horários e prazos.

---

## 2. Arquitetura de Componentes

### 2.1 Componente `RadarChart.tsx`
* **Localização:** `src/components/shared/RadarChart.tsx`
* **Tecnologia:** SVG nativo integrado com `Framer Motion` (`motion/react`) para animações de entrada e transições de pontos.
* **Principais Funcionalidades:**
  * **Renderização Dinâmica:** Cálculo trigonométrico automatizado das posições $(x, y)$ dos vértices baseadas em um raio $R = 120$ e centro $(210, 180)$.
  * **Interatividade via Legendas:** Possibilidade de ocultar/mostrar conjuntos de dados individualmente (Autoavaliação e Avaliação do Supervisor) clicando na legenda superior.
  * **Efeitos de Hover Fluidos:** Ao passar o mouse sobre cada ponto (vértice), uma animação com Framer Motion aumenta a escala do ponto e exibe um tooltip com a nota exata correspondente e sua categoria.
  * **Dark Mode & Responsividade:** Estilizado com Tailwind CSS para se ajustar perfeitamente ao tema Dark/Light.

### 2.2 Utilitário de Cálculo `radarUtils.ts`
* **Localização:** `src/services/radarUtils.ts`
* **Fórmula de Cálculo da Avaliação do Supervisor:**
  * Cada competência começa com uma **nota base neutra de 3.0** (escala de 1.0 a 5.0).
  * Para cada feedback do tipo `positive` (positivo) na categoria correspondente, soma-se `+0.5` à nota da competência.
  * Para cada feedback do tipo `development` (desenvolvimento) na categoria correspondente, subtrai-se `-0.5` da nota.
  * O resultado final é limitado (clamped) entre `1.0` (mínimo) e `5.0` (máximo) e arredondado para uma casa decimal.

---

## 3. Integração nos Dashboards

### 3.1 Painel do Técnico (`TechnicianDashboard.tsx`)
* Foi adicionada uma nova aba chamada **"Radar de Competências"** (`activeTab === 'radar'`).
* Exibe a comparação do último preenchimento de autoavaliação do técnico com a pontuação calculada a partir de seus feedbacks recebidos.
* Apresenta um aviso amigável caso ele ainda não tenha preenchido nenhuma autoavaliação no trimestre atual.

### 3.2 Painel do Supervisor (`ClimateOverview.tsx` dentro do `SupervisorDashboard`)
* Foi adicionado um novo filtro dinâmico de **"Colaborador"** ao lado dos filtros de Período e Equipe.
* Quando **"Todos os Colaboradores"** está selecionado, o gráfico de radar exibe a **média geral da equipe** em autoavaliação vs. feedbacks.
* Quando um colaborador específico é selecionado:
  * O gráfico renderiza especificamente as notas desse colaborador contra as suas próprias avaliações.
  * Exibe-se uma dica analítica que orienta o supervisor a identificar desalinhamentos de perspectiva (e.g., quando a autoavaliação supera muito o feedback do supervisor, sinalizando a necessidade de feedback de alinhamento/calibração).

---

## 4. Instruções de Manutenção e Extensão

Para adicionar novos eixos de competência:
1. Atualize a interface `RadarScores` em `src/services/radarUtils.ts` e `src/components/shared/RadarChart.tsx`.
2. Adicione a nova chave na constante `AXIS_KEYS` e o rótulo legível em `AXIS_LABELS`.
3. Certifique-se de atualizar o mapeamento de feedbacks em `calculateSupervisorScores` para atribuir corretamente os feedbacks do novo eixo.
