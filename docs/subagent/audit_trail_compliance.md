# Trilha de Auditoria e Conformidade (Audit Trail)

Este documento descreve a especificação técnica e funcional da implementação da Trilha de Auditoria inviolável para o sistema **FEED-TRACK**, garantindo a conformidade e integridade das assinaturas de feedbacks e conclusões de metas de PDI.

---

## 1. Visão Geral

Para atender aos requisitos de conformidade corporativa e segurança da informação, foi implementada uma trilha de auditoria (Audit Trail). Cada vez que uma ação crítica de assinatura é realizada, o sistema calcula e registra um hash criptográfico **SHA-256** e uma assinatura digital ECDSA P-256 do colaborador envolvido.

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

## 3. Arquitetura Criptográfica

### 3.1. Hash SHA-256
O hash é calculado sobre o evento, o instante e o conteúdo, com a **Web Crypto API** (`crypto.subtle.digest`):

```typescript
const payload = `${eventType}:${entityId}:${technicianId}:${timestamp}:${JSON.stringify(payloadData)}`;
const hash = await sha256Hex(payload); // lança erro se Web Crypto não existir (sem fallback fraco)
```

### 3.2. Assinatura digital ECDSA P-256 (real)
Implementada em `src/services/signatureService.ts`:
- Cada colaborador/dispositivo gera um par **ECDSA P-256**. A chave **privada é não-exportável** e fica em IndexedDB (`CryptoKey`), então o JavaScript da página nunca lê o material da chave.
- A assinatura (base64) é feita sobre o hash e gravada junto com a **chave pública (JWK)** no log.
- `verifySignature(hash, assinatura, chavePública)` valida a assinatura; a tela de Compliance exibe o selo “válida/inválida” de cada evento.

**Limites conhecidos (honestidade técnica):** a chave pública vem no próprio log, e não há registro central (âncora) das chaves por usuário. A assinatura prova integridade do registro e posse da chave daquele dispositivo, **não** não-repúdio jurídico forte. Para isso, ancore as chaves públicas no servidor (ex.: Cloud Function) ou use certificado ICP-Brasil.

### 3.3. Garantias aplicadas pelo servidor (`firestore.rules`)
- Logs são **imutáveis** (sem update/delete).
- `createdAt` é obrigatoriamente o horário do **servidor** (`request.time`).
- Log de `feedback_signature` só é aceito se o feedback **existir**, for do técnico informado e **já estiver assinado** (`signedAt`).
- `hash` deve ser SHA-256 hexadecimal e apenas campos conhecidos são aceitos.
- Testes: `npm run test:rules` (emulador do Firestore).

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
  signature: string; // Assinatura ECDSA P-256 (base64)
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
  - Assinatura digital ECDSA (com selo de verificação);
  - Chave Pública de Verificação do Usuário.
- **Exportação de Conformidade:** Botão para exportar toda a trilha de auditoria para um arquivo formato **JSON** (`trilha_auditoria_compliance_[DATA].json`) para auditoria externa.
