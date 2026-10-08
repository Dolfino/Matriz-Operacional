# Core Operacional v1 — Baseline Estável

## 1. Identificação da Baseline

- **Sistema:** Matriz Operacional
- **Versão do Core:** `v1.0.0`
- **Versão da Aplicação:** `1.0.0`
- **Schema dos Dados:** `schema-v1.0` (hierarquia estrita de 4 níveis com modelo de dependências transversais)
- **Commit da Baseline:** `c1a08f2` (Etapa 3 congelada — auditoria de paridade aprovada)
- **Data da Auditoria:** 2026-10-08 14:32:00 BRT
- **Quantidade Real de Testes Executados:** 10/10 cenários formais (Fixtures A a J) + Teste de Paridade Multi-Visão + Teste de Transição de Ciclo de Vida
- **Resultado da Auditoria Automatizada:** APROVADO COM 100% DE PARIDADE E ZERO DIVERGÊNCIAS

---

## 2. Invariantes Arquiteturais do Core (Contrato Imutável)

Toda funcionalidade futura (incluindo a Etapa 4 de Planejamento Temporal, Agenda e Follow-ups) deve obrigatoriamente respeitar estas 12 invariantes. Qualquer alteração em uma dessas regras requer decisão arquitetural formal e atualização dos testes de contrato:

1. **Hierarquia Estrita de Quatro Níveis:**
   A árvore possui única e exclusivamente a estrutura:
   `Objetivo → Marco → Tarefa → Subtarefa Executável`.
   Nenhum nível intermediário ou paralelo pode ser inserido na hierarquia primária.

2. **Dependência Externa Transversal:**
   Dependência Externa é uma relação operacional transversal (com setor/responsável, SLA, cobranças e bloqueio), **nunca um nível hierárquico**. Subtarefas vinculadas sofrem o impacto, mas a árvore preserva sua estrutura.

3. **Exclusividade Categórica de Dependências Ativas:**
   Toda dependência ativa pertence a exatamente uma categoria operacional:
   - `BLOQUEANDO` (bloqueandoFluxo = true, pendente/em risco);
   - `EM_RISCO` (bloqueandoFluxo = false, estado EM_RISCO ou SLA iminente/vencido);
   - `AGUARDANDO` (bloqueandoFluxo = false, estado AGUARDANDO dentro do SLA).

4. **Invariante de Resolução:**
   O estado `ATENDIDA` implica obrigatoriamente:
   `bloqueandoFluxo = false` e `isBlocking = false`.
   Uma dependência atendida jamais pode computar como bloqueio ativo ou risco aberto.

5. **Histórico Append-Only:**
   O histórico de mudanças de estado (`history`) e os logs de cobrança/follow-up (`followUps`) são estritamente cumulativos (*append-only*). Nenhum registro existente pode ser sobrescrito ou apagado.

6. **Unicidade das Métricas Canônicas:**
   As 11 métricas operacionais formais possuem uma única implementação centralizada (`src/utils/helpers.ts`). Nenhum componente, modal ou exportador de relatório pode implementar cálculos paralelos ou números hardcoded.

7. **Verdade Operacional Única entre Visualizações:**
   Árvore Hierárquica, Resumo Operacional, Radar de Bloqueios, Central de OCs, Relatório Executivo e Projeções de Agenda devem reportar com precisão exata os mesmos números para o mesmo estado da matriz. Divergência entre projeções é tratada como bug crítico.

8. **Exclusividade Mútua nos Estados Financeiros:**
   Os estados de Ordens de Compra (`PREVISTO`, `EM_APROVACAO`, `APROVADO`, `CONTRATADO`, `FATURADO`, `ENCAMINHADO_PAGAMENTO`, `PAGO`) são mutuamente exclusivos para consolidação por situação financeira.

9. **Distinção Fundamental: Aprovado ≠ Pago:**
   O estado `APROVADO` significa autorização corporativa, não quitação financeira. Apenas o estado `PAGO` liquida a obrigação.

10. **Datas Operacionais Civis:**
    Datas de marcos, SLAs, cobranças e resolução são datas civis no padrão ISO (`YYYY-MM-DD` / `YYYY-MM-DDTHH:mm:ss`) e não podem sofrer distorções ou deslocamentos por fuso horário (*timezone offset*).

11. **Compatibilidade Legada Garantida:**
    Objetivos e dependências criados em versões anteriores ou com campos incompletos continuam válidos e utilizam valores padrão seguros (*fallback seguro*) sem quebrar a renderização.

12. **Princípio da Não-Duplicação no Relatório Executivo:**
    No Relatório Executivo, a Seção 4 reporta estritamente o estado operacional ativo (`BLOQUEANDO`, `EM_RISCO`, `AGUARDANDO`), enquanto a Seção 5 consolida o Histórico das Dependências Atendidas/Resolvidas. Dependências atendidas não aparecem como pendências ativas.

---

## 3. As 11 Fórmulas Canônicas Compartilhadas

| # | Métrica | Definição Canônica (`src/utils/helpers.ts`) |
|---|---|---|
| 1 | **Progresso do Objetivo** | `(Subtarefas Concluídas / Total de Subtarefas) * 100` (arredondado) |
| 2 | **Progresso do Marco** | `(Subtarefas Concluídas do Marco / Total de Subtarefas do Marco) * 100` |
| 3 | **Progresso da Tarefa** | `(Subtarefas Concluídas da Tarefa / Total de Subtarefas da Tarefa) * 100` |
| 4 | **Taxa de Conclusão de Tarefas** | `(Tarefas Concluídas / Total de Tarefas) * 100` |
| 5 | **Taxa de Execução de Subtarefas**| `(Subtarefas Concluídas / Total de Subtarefas) * 100` |
| 6 | **Taxa de Resolução de Dependências** | `(Dependências Atendidas / Total de Dependências) * 100` |
| 7 | **Tempo de Espera de Dependência** | `Max(0, Round((Data_Fim - Data_Abertura) em dias))` |
| 8 | **Tempo Efetivamente Bloqueado** | Soma em dias de intervalos de histórico em que `isBlocking === true` |
| 9 | **Cumprimento de SLA** | Comparação formal: `Data_Resolvido` (ou data atual) `≤ SLA_Deadline` |
| 10 | **Situação de Prazo** | Avaliação baseada no vencimento alvo: `Concluído no Prazo`, `Concluído com Atraso`, `Em Risco`, `Atrasado` ou `No Prazo` |
| 11 | **Taxa de Compromissamento Financeiro** | `((Aprovado + Contratado + Faturado + Encaminhado + Pago) / Total Previsto) * 100` |

---

## 4. Evidência da Auditoria Automatizada da Build

```text
Última auditoria automatizada:
- Versão: v1.0.0
- Commit da Baseline: c1a08f2
- Executada em: 08/10/2026 14:32:00 BRT
- Fixtures executadas: 10/10 (Cenários A a J)
- Cobertura de cenários de borda: 100%
- Paridade multi-projeção: APROVADA (0 divergências)
- Compatibilidade legada: APROVADA
- Transições de ciclo de vida: APROVADA (AGUARDANDO → BLOQUEANDO → EM_RISCO → ATENDIDA)
- Compilação & Lint TypeScript: APROVADOS (0 erros)
```
