# Invariantes Temporais da Agenda Operacional v1

Documento de contrato da camada temporal da Matriz Operacional (Etapa 4.1).

---

## 1. As 10 Invariantes Temporais

- **T1. Projeção Estrita:** A Agenda e as listas de cobrança são exclusivamente **projeções temporais da mesma Matriz Operacional**. Não constituem, sob nenhuma hipótese, fonte paralela de cadastro de trabalho.
- **T2. Partição Temporal Canônica Mutuamente Exclusiva:** Uma ocorrência operacional pertence a exatamente **uma categoria primária**:
  `ATRASADO` (precedência máxima) &rarr; `HOJE` &rarr; `AMANHA` &rarr; `PROXIMOS_7_DIAS` &rarr; `HORIZONTE_FUTURO` &rarr; `SEM_DATA`.
  Nenhum item pode constar simultaneamente em duas filas da linha do tempo.
- **T3. Independência entre SLA e Follow-up:** O SLA define o prazo limite para a dependência estar resolvida (criticidade/risco); `nextFollowUpDate` define a data em que a equipe deve realizar a próxima cobrança/ação. Um SLA vencido com cobrança futura reporta status de risco sem gerar falso atraso de follow-up.
- **T4. Dependência ATENDIDA Inativa:** Uma dependência com ciclo `ATENDIDA` não gera cobrança ativa na agenda, não aparece em "Cobrar Hoje", não aparece como "Vencida" e não gera recorrência futura.
- **T5. Itens Concluídos Inativos:** Subtarefas concluídas, tarefas concluídas e marcos concluídos são estritamente excluídos de pendências ativas da agenda temporal.
- **T6. Recorrência Não-Materializada:** A recorrência operacional (`daily`, `every_2_days`, `weekly`, `none`) não gera infinitas entidades no banco de dados. O modelo preserva apenas o histórico cumulativo e a data singular do próximo follow-up.
- **T7. Recálculo Pós-Cobrança Efetiva:** A próxima data de cobrança é recalculada **a partir da data civil em que o follow-up foi efetivamente realizado**, evitando sequências presas no passado.
- **T8. Imunidade a Deslocamento por Fuso Horário:** Todas as datas operacionais são datas civis ISO (`YYYY-MM-DD`). Cálculos de adição de dias, virada de ano (`31/12` &rarr; `01/01`) e virada de fevereiro (ano comum vs. ano bissexto) são matematicamente determinísticos.
- **T9. Agrupamento Unificado por Setor:** A consolidação por responsável/terceiro deriva exatamente do mesmo conjunto canônico e reflete instantaneamente qualquer transição de estado.
- **T10. Paridade Transversal Absoluta:** Árvore Hierárquica, Radar de Bloqueios, Central de OCs, Relatório Executivo e Agenda Operacional reportam rigorosamente a mesma verdade operacional. Divergência é bug.
