# Linha do Tempo e Jornada de Carreira Interativa

Este documento descreve a implementação da **Linha do Tempo e Jornada de Carreira** no `TechnicianDashboard`, projetada para mapear e visualizar a trajetória profissional do técnico de forma cronológica, interativa e gamificada.

## 📌 Objetivos da Funcionalidade

- **Reconhecimento Histórico:** Agrupar marcos cruciais em uma única interface histórica.
- **Transparência e Engajamento:** Facilitar a visualização do progresso profissional, estimulando o autodesenvolvimento.
- **Interatividade Premium:** Oferecer uma navegação fluida com transições animadas e detalhamento sob demanda.

---

## 🛠️ Fontes de Dados Mapeadas

O componente consolida de forma inteligente dados provenientes de diferentes módulos e coleções do banco de dados:

1. **Contratação / Boas-vindas (`userProfile.createdAt`):** Marca o primeiro nó da linha do tempo com a data de admissão, cargo e equipe inicial.
2. **Feedbacks Assinados (`feedbacks`):** Exibe cada feedback assinado ou lido pelo técnico, diferenciando visualmente feedbacks positivos (verde) de feedbacks de desenvolvimento (laranja/âmbar).
3. **Metas Concluídas (`userProfile.structuredPDI`):** Registra o momento de definição de um objetivo de PDI e o marco de sua conclusão com sucesso.
4. **Troféus / Badges Desbloqueados (`userProfile.badges`):** Celebra os troféus conquistados no percurso do técnico.

---

## 🎨 Design e Componentização

A interface foi estruturada no componente `CareerTimeline.tsx` e integrada como uma nova aba no `TechnicianDashboard.tsx`.

### Recursos Implementados:

- **Filtros por Tipo de Marco:** Permite alternar visualizações entre "Tudo", "Feedbacks", "Metas PDI" e "Conquistas".
- **Alternador de Layout:**
  - **Vertical (Clássico):** Ideal para leitura contínua e análise detalhada dos marcos.
  - **Horizontal (Jornada/Scroll):** Ideal para visualização estilo *pipeline* de jornada interativa com rolagem horizontal fluida.
- **Ordenação Chrono:** Botão interativo para inverter a ordenação entre os marcos mais recentes e os mais antigos.
- **Micro-interações com Framer Motion:**
  - Animação de carregamento em cascata (*staggerChildren*) ao renderizar os marcos.
  - Efeito hover e escala reativa nos nós da jornada.
  - Expansão animada dos detalhes do evento (`AnimatePresence` e `motion.div` para transição de altura suave).

---

## ⚙️ Estrutura do Código

O componente está localizado em:
📄 `src/components/technician/CareerTimeline.tsx`

Ele recebe como propriedades (`props`):
```typescript
interface CareerTimelineProps {
  userProfile: User;
  feedbacks: Feedback[];
}
```

E renderiza internamente estruturas condicionais baseadas nos estados:
```typescript
const [filter, setFilter] = useState<'all' | 'feedbacks' | 'pdi' | 'badges'>('all');
const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
```

---

## 🚀 Como Visualizar no Painel

1. Acesse o **Dashboard do Técnico**.
2. Clique na nova aba **"Jornada & Linha do Tempo"**.
3. Navegue entre os modos **Vertical** e **Horizontal**, clique nos nós para expandir descrições completas e utilize os botões de filtro para organizar sua jornada.
