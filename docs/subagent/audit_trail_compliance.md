# Trilha de Auditoria e Conformidade (Audit Trail)

Este documento descreve a especificação técnica e funcional da implementação da Trilha de Auditoria inviolável para o sistema **FEED-TRACK**, garantindo a conformidade e integridade das assinaturas de feedbacks e conclusões de metas de PDI.

---

## 1. Visão Geral

Para atender aos requisitos de conformidade corporativa e segurança da informação, foi implementada uma trilha de auditoria (Audit Trail). Cada vez que uma ação crítica de assinatura é realizada, o sistema calcula e registra um hash criptográfico **SHA-256** e uma assinatura digital simulada (RSA) do colaborador envolvido.

Esses registros garantem:
- **Não-retrocesso (Non-repudiation):** O colaborador não pode negar a autoria da assinatura digital.
- **Integridade dos Dados:** Qualquer modificação nos logs invalidaria o hash criptográfico gerado.
- **Transparência:** Acesso centralizado e exclusivo para supervisores e auditores na interface do painel.

---

## 2. Eventos Auditados

O sistema monitora e gera logs de conformidade para os seguintes eventos:

1. **Assinatura de Feedback (`feedback_signature`):**
   - Disparado quando um técnico clica no botão "Assinar" em um feedback recebido.
2. **Conclusão de Meta de PDI (`pdi_goal_completion`):**
   - Disparado quando um técnico atualiza o status de uma de suas metas de PDI para "Concluído" (status `'completed'`).

---

## 3. Arquitetura Criptográfica (Simulada)

### 3.1. Geração do Hash SHA-256
Os logs são compostos pelo ID do log, carimbo de data/hora (timestamp ISO), tipo de evento, ID da entidade vinculada, ID do colaborador e nome. O hash SHA-256 é gerado a partir do seguinte padrão de payload:

```typescript
const payload = `${eventType}:${entityId}:${technicianId}:${timestamp}:${JSON.stringify(payloadData)}`;
```

O hash é processado de forma nativa utilizando a API **Web Crypto** do navegador (`crypto.subtle.digest`):

```typescript
const msgBuffer = new TextEncoder().encode(payload);
const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
```

### 3.2. Assinatura Digital RSA Simulada
A assinatura digital garante a autenticidade do emissor por meio de um par de chaves assimétricas simuladas (Pública/Privada):
- **Chave Privada:** `PRIV_KEY_[USER_ID]_SECURE_KEY` (utilizada para assinar de forma única o hash gerado).
- **Chave Pública:** `MOCK_RSA_PUB_KEY_[USER_ID]_FEED_TRACK_AUDIT_TRAIL_VALID` (utilizada para verificação da integridade).

O resultado final é uma assinatura digital formatada como:
`SIG_RSA_SHA256_[ASSINATURA_HEX]_[PREFIXO_HASH]`

---

## 4. Estrutura do Modelo de Dados

A interface TypeScript para cada log de auditoria é definida da seguinte forma em `src/types/index.ts`:

```typescript
export interface AuditLog {
  id: string; // Identificador único do log (ex: audit_xxxxxxxxx)
  timestamp: string; // Timestamp ISO 8601 do evento
  eventType: 'feedback_signature' | 'pdi_goal_completion';
  entityId: string; // ID do feedback ou do objetivo do PDI correspondente
  technicianId: string; // ID do técnico responsável
  technicianName: string; // Nome do técnico responsável
  details: string; // Descrição legível por humanos
  hash: string; // Hash SHA-256 do registro
  signature: string; // Assinatura digital RSA gerada
  publicKey: string; // Chave pública de validação
}
```

---

## 5. Visualização na Seção de Supervisores

Os supervisores possuem acesso direto à trilha de auditoria por meio da nova aba **"Auditoria"** no menu do `SupervisorDashboard`.

### Recursos da Interface:
- **Tabela de Conformidade:** Exibição cronológica dos eventos de conformidade de assinaturas.
- **Filtro Avançado:** Pesquisa instantânea por colaborador, tipo de evento, descrição ou hash SHA-256.
- **Painel de Validação Criptográfica:** Ao clicar em um log, a linha é expandida exibindo os metadados técnicos detalhados:
  - ID do Log e ID da Entidade;
  - Hash SHA-256 do Registro (com opção de cópia rápida);
  - Assinatura Digital RSA Simulada;
  - Chave Pública de Verificação do Usuário.
- **Exportação de Conformidade:** Botão para exportar toda a trilha de auditoria para um arquivo formato **JSON** (`trilha_auditoria_compliance_[DATA].json`) para auditoria externa.
