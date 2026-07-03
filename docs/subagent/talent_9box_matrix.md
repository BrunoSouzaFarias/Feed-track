# Matriz 9-Box de Gestão de Talentos

Este documento detalha a concepção, o design e a implementação da **Matriz 9-Box** no painel de supervisão do sistema **Feed-Track**. O objetivo é cruzar e analisar o potencial (autoavaliações) com o desempenho (conclusão de metas do PDI) da equipe técnica com máxima precisão executiva.

---

## 📊 Metodologia e Cruzamento de Dados

A Matriz 9-Box é estruturada em duas dimensões principais:

1. **Desempenho (Eixo X - Horizontal):** Calculado dinamicamente a partir do **percentual de conclusão de metas do PDI** (`structuredPDI`) de cada técnico.
   - **Fórmula:** Desempenho (%) = (Metas Concluídas / Total de Metas) * 100
   - Se o colaborador não possuir metas no PDI, o sistema assume 0% por padrão.

2. **Potencial (Eixo Y - Vertical):** Derivado da média aritmética simples das notas da última **Autoavaliação** (`SelfAssessment`) realizada pelo técnico.
   - **Pontuação:** De 1.0 a 5.0.
   - **Critérios:** Comunicação, Trabalho em Equipe, Conhecimento Técnico, Proatividade e Comprometimento/Frequência.
   - Se o colaborador não possuir autoavaliação cadastrada, o sistema aplica um baseline neutro de 3.0 e sinaliza a pendência no painel.

### Réguas de Calibração (Customizáveis)
O supervisor pode calibrar as réguas diretamente pelo painel para ajustar as fronteiras entre Baixo, Médio e Alto:
* **Fronteiras de Desempenho (PDI):** Padrão de < 35% para Baixo, de 35% a 70% para Médio, e > 70% para Alto.
* **Fronteiras de Potencial (Autoavaliação):** Padrão de < 3.0 para Baixo, de 3.0 a 4.0 para Médio, e > 4.0 para Alto.

---

## 📦 Estrutura dos Quadrantes (9-Box)

Os colaboradores são mapeados nos seguintes quadrantes com base nas classificações resultantes:

| Potencial (Y) \ Desempenho (X) | Baixo (<35%) | Médio (35% - 70%) | Alto (>70%) |
| :--- | :--- | :--- | :--- |
| **Alto (>4.0)** | **Enigma / Dilema** *(Box 3)* | **Potencial Crescente** *(Box 6)* | **Estrela / Talento** *(Box 9)* ⭐ |
| **Médio (3.0 - 4.0)** | **Questionável** *(Box 2)* | **Mantenedor / Core** *(Box 5)* | **Forte Desempenho** *(Box 8)* |
| **Baixo (<3.0)** | **Risco de Desempenho** *(Box 1)* | **Eficaz / Sólido** *(Box 4)* | **Especialista Técnico** *(Box 7)* |

---

## 🎨 Design de Interface e Efeitos de Movimento

A interface foi projetada utilizando **Tailwind CSS** para estilização visual e **Framer Motion** para animações elásticas e fluidas de alta performance.

### Modos de Visualização

1. **Visualização por Quadrantes (Grid):**
   - Apresenta um layout clássico estruturado com as 9 caixas coloridas.
   - Cada quadrante possui uma estilização de cores exclusivas para facilitar a leitura rápida de status (tons quentes para risco e tons esmeralda para talentos/estrelas).
   - Efeitos elásticos de hover ampliam sutilmente os cartões dos colaboradores e dos quadrantes (`whileHover={{ scale: 1.015 - 1.03 }}`).

2. **Visualização Contínua de Dispersão (Scatter Map):**
   - Um mapa cartesiano bidimensional onde a posição exata de cada colaborador é plotada com base em suas coordenadas reais.
   - A coordenada horizontal é igual à porcentagem do PDI (0% a 100%).
   - A coordenada vertical é calculada por: Y = ((Potencial - 1) / 4) * 100.
   - As linhas limítrofes são desenhadas de forma tracejada com anotações de HR para demarcar visualmente as zonas de risco e destaque.
   - **Efeito Hover Elástico:** Ao passar o mouse sobre a foto/avatar de um colaborador no mapa contínuo, ele se expande elasticamente de forma dinâmica com o efeito spring:
     ```typescript
     whileHover={{ scale: 1.25, zIndex: 40 }}
     transition={{ type: "spring", stiffness: 450, damping: 15 }}
     ```

### Painel Detalhado de Calibração
Ao clicar em qualquer colaborador em qualquer visualização, um painel lateral (*drawer*) desliza suavemente a partir da direita contendo:
* O quadrante 9-box correspondente e sua descrição estratégica.
* Métricas numéricas brutas de desempenho e potencial.
* Um gráfico visual das notas de autoavaliação com barras de progresso horizontais.
* Comentários textuais do colaborador e metas do PDI estruturado com seus respectivos status (Concluída, Em progresso ou Pendente).

---

## 📂 Arquivos Modificados e Criados

* **`src/types/index.ts`**: Atualizado para suportar a estrutura padrão de autoavaliações e PDI.
* **`src/services/userService.ts`**: Atualizado com dados iniciais simulados para 3 técnicos (Ana, Bruno, Carlos) e suas respectivas autoavaliações (`feed_track_mock_assessments`), garantindo que o painel exiba dados corretos e realistas de imediato.
* **`src/components/supervisor/Talent9Box.tsx`**: Componente principal da Matriz 9-Box, contendo toda a lógica de processamento matemático, filtros, toggles, controles de régua, dispersão contínua SVG/CSS e animações do Framer Motion.
* **`src/components/supervisor/SupervisorDashboard.tsx`**: Painel do supervisor estendido para incluir a nova aba "Matriz 9-Box" e renderizar o componente correspondente.
