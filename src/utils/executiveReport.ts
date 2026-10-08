import {
  Objective,
  Milestone,
  Task,
  Subtask,
  Dependency,
  FinancialStatus,
} from '../types';
import {
  getObjectiveStats,
  getMilestoneOperationalMetrics,
  getDependencyLifecycle,
  getDependencyWaitingTimeDays,
  getFinancialTotals,
  getFinancialStatusLabel,
  getTaskEffectiveStatus,
  formatCurrencyBRL,
  calculateTaskCompletionRate,
  calculateSubtaskExecutionRate,
  calculateDependencyResolutionRate,
  calculateFinancialCommitmentRate,
} from './helpers';

export interface ReportDependencyItem {
  dep: Dependency;
  taskTitle: string;
  milestoneTitle: string;
  waitingDays: number;
  lifecycle: ReturnType<typeof getDependencyLifecycle>;
}

export interface ReportOcItem {
  ocNumber: string;
  cost: number;
  financialStatus: FinancialStatus;
  statusLabel: string;
  badgeClass: string;
  taskTitle: string;
  milestoneTitle: string;
  subtaskTitle: string;
  assignee?: string;
}

export interface ReportCriticalDeadlineItem {
  type: 'milestone' | 'task';
  title: string;
  parentTitle?: string;
  deadline: string;
  situation: string;
}

export interface ReportHistoryItem {
  depId: string;
  depTitle: string;
  taskTitle: string;
  milestoneTitle: string;
  entries: Array<{
    timestamp: string;
    description: string;
    author?: string;
    note?: string;
  }>;
}

export interface ExecutiveReportData {
  objective: Objective;
  stats: ReturnType<typeof getObjectiveStats>;
  isCompleted: boolean;
  statusLabel: string;
  statusBadge: { text: string; bgClass: string; textClass: string };
  periodText: string;

  // 2. Situação Operacional Atual
  situacaoAtual: {
    bloqueandoAgora: ReportDependencyItem[];
    emRisco: ReportDependencyItem[];
    aguardandoTerceiros: ReportDependencyItem[];
    prazosCriticos: ReportCriticalDeadlineItem[];
    isFullyClean: boolean;
    cleanMessage: string;
  };

  // 3. Execução por Marcos
  milestonesExecution: Array<{
    milestone: Milestone;
    metrics: ReturnType<typeof getMilestoneOperationalMetrics>;
    tasks: Array<{
      task: Task;
      effectiveStatus: 'completed' | 'blocked' | 'in_progress' | 'not_started';
      effectiveStatusLabel: string;
      subtasks: Subtask[];
    }>;
  }>;

  // 4. Dependências Externas e Bloqueios
  dependenciesByCategory: {
    bloqueando: ReportDependencyItem[];
    emRisco: ReportDependencyItem[];
    aguardando: ReportDependencyItem[];
    atendidas: ReportDependencyItem[];
  };

  // 5. Histórico de Dependências
  dependencyHistory: ReportHistoryItem[];

  // 6. Gestão Financeira & OCs
  financial: ReturnType<typeof getFinancialTotals>;
  ocList: ReportOcItem[];

  // 7. Indicadores Operacionais
  indicators: {
    taskCompletionRate: number;
    subtaskCompletionRate: number;
    dependencyResolutionRate: number;
    activeCriticalDeps: number;
    totalFollowUps: number;
    averageWaitingTimeDays: number;
    financialExecutionRate: number;
  };

  // 8. Conclusão / Situação do Objetivo
  conclusion: {
    title: string;
    summary: string;
    diagnostico: string;
    generatedAt: string;
  };
}

/**
 * Constrói a projeção consolidada de dados do Relatório Executivo
 * sem duplicar nenhuma regra de cálculo da aplicação.
 */
export function buildExecutiveReportData(objective: Objective): ExecutiveReportData {
  const stats = getObjectiveStats(objective);
  const isCompleted = stats.progressPercent === 100 || objective.status === 'completed';

  // Período formatado
  const startStr = objective.startDate || '';
  const endStr = objective.eventDate || objective.endDate || '';
  let periodText = 'A definir';
  if (startStr && endStr) {
    periodText = `${startStr} a ${endStr}`;
  } else if (endStr) {
    periodText = `Até ${endStr}`;
  } else if (startStr) {
    periodText = `A partir de ${startStr}`;
  }

  // Status geral do objetivo
  let statusLabel = 'EM ANDAMENTO';
  let statusBadge = {
    text: '⏳ EM ANDAMENTO',
    bgClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700',
  };

  if (isCompleted) {
    statusLabel = 'CONCLUÍDO';
    statusBadge = {
      text: '✅ CONCLUÍDO',
      bgClass: 'bg-emerald-50 border-emerald-200',
      textClass: 'text-emerald-700',
    };
  } else if (stats.bloqueandoDependencies > 0) {
    statusLabel = 'COM BLOQUEIOS';
    statusBadge = {
      text: '🚨 COM BLOQUEIOS ATIVOS',
      bgClass: 'bg-rose-50 border-rose-200',
      textClass: 'text-rose-700',
    };
  } else if (stats.emRiscoDependencies > 0) {
    statusLabel = 'EM RISCO';
    statusBadge = {
      text: '⚠️ EM RISCO',
      bgClass: 'bg-amber-50 border-amber-200',
      textClass: 'text-amber-700',
    };
  }

  // Coletar dependências com metadados
  const allDeps: ReportDependencyItem[] = [];
  const ocList: ReportOcItem[] = [];
  const prazosCriticos: ReportCriticalDeadlineItem[] = [];

  objective.milestones.forEach((m) => {
    const mMetrics = getMilestoneOperationalMetrics(m);
    if (mMetrics.status === 'Atrasado' || mMetrics.deadlineSituation.includes('risco')) {
      prazosCriticos.push({
        type: 'milestone',
        title: `Marco: ${m.title}`,
        deadline: m.targetDate || m.endDate || 'Não informado',
        situation: mMetrics.deadlineSituation,
      });
    }

    m.tasks.forEach((t) => {
      // Verificar tarefas atrasadas
      if (t.deadline) {
        const dDate = new Date(t.deadline);
        const refDate = new Date('2026-10-08');
        const isTaskDone =
          t.subtasks.length > 0 && t.subtasks.every((s) => s.status === 'completed');
        if (!isTaskDone && !isNaN(dDate.getTime()) && dDate < refDate) {
          prazosCriticos.push({
            type: 'task',
            title: `Tarefa: ${t.title}`,
            parentTitle: m.title,
            deadline: t.deadline,
            situation: 'Prazo da tarefa expirado',
          });
        }
      }

      // Subtarefas e OCs
      t.subtasks.forEach((s) => {
        if (s.ocNumber || s.orderCost) {
          const finStatus: FinancialStatus =
            s.financialStatus || (s.status === 'completed' ? 'PAGO' : 'EM_APROVACAO');
          const { label, badgeClass } = getFinancialStatusLabel(finStatus);

          ocList.push({
            ocNumber: s.ocNumber || 'OC Provisória',
            cost: s.orderCost || 0,
            financialStatus: finStatus,
            statusLabel: label,
            badgeClass,
            taskTitle: t.title,
            milestoneTitle: m.title,
            subtaskTitle: s.title,
            assignee: s.assignee,
          });
        }
      });

      // Dependências
      t.dependencies.forEach((d) => {
        const lifecycle = getDependencyLifecycle(d);
        const waitingDays = getDependencyWaitingTimeDays(d);
        allDeps.push({
          dep: d,
          taskTitle: t.title,
          milestoneTitle: m.title,
          waitingDays,
          lifecycle,
        });
      });
    });
  });

  // Agrupamento de dependências por categoria
  const bloqueando = allDeps.filter(
    (item) => item.lifecycle.state !== 'ATENDIDA' && item.lifecycle.isBlocking
  );
  const emRisco = allDeps.filter(
    (item) => item.lifecycle.state === 'EM_RISCO' && !item.lifecycle.isBlocking
  );
  const aguardando = allDeps.filter(
    (item) => item.lifecycle.state === 'AGUARDANDO' && !item.lifecycle.isBlocking
  );
  const atendidas = allDeps.filter((item) => item.lifecycle.state === 'ATENDIDA');

  // Situação Operacional Atual
  const isFullyClean =
    bloqueando.length === 0 &&
    emRisco.length === 0 &&
    aguardando.length === 0 &&
    prazosCriticos.length === 0;

  let cleanMessage = 'Nenhum bloqueio operacional ativo no momento.';
  if (isCompleted) {
    cleanMessage = 'Objetivo encerrado sem pendências operacionais ativas.';
  } else if (isFullyClean) {
    cleanMessage = 'Nenhum bloqueio operacional ativo no momento.';
  } else if (bloqueando.length === 0) {
    cleanMessage = 'Nenhum bloqueio operacional ativo no momento.';
  }

  // Execução por Marcos
  const milestonesExecution = objective.milestones.map((m) => {
    const metrics = getMilestoneOperationalMetrics(m);
    const tasks = m.tasks.map((t) => {
      const effectiveStatus = getTaskEffectiveStatus(t);
      let effectiveStatusLabel = 'Não iniciada';
      if (effectiveStatus === 'completed') effectiveStatusLabel = 'Concluída';
      else if (effectiveStatus === 'blocked') effectiveStatusLabel = 'Bloqueada';
      else if (effectiveStatus === 'in_progress') effectiveStatusLabel = 'Em andamento';

      return {
        task: t,
        effectiveStatus,
        effectiveStatusLabel,
        subtasks: t.subtasks,
      };
    });

    return {
      milestone: m,
      metrics,
      tasks,
    };
  });

  // Histórico de Dependências
  const dependencyHistory: ReportHistoryItem[] = [];
  allDeps.forEach((item) => {
    const entries: Array<{
      timestamp: string;
      description: string;
      author?: string;
      note?: string;
    }> = [];

    // Se tiver histórico formal de mudanças
    if (item.dep.history && item.dep.history.length > 0) {
      item.dep.history.forEach((h) => {
        entries.push({
          timestamp: h.timestamp,
          description: `Estado: ${h.previousState ? `${h.previousState} → ` : ''}${h.newState} (${
            h.isBlocking ? 'Bloqueando fluxo' : 'Sem bloqueio'
          })`,
          author: h.author,
          note: h.note,
        });
      });
    }

    // Se tiver follow-ups registrados
    if (item.dep.followUps && item.dep.followUps.length > 0) {
      item.dep.followUps.forEach((f) => {
        entries.push({
          timestamp: f.date,
          description: 'Cobrança / Follow-up realizado',
          author: f.author,
          note: f.note,
        });
      });
    }

    // Se não tiver registros detalhados além do cadastro
    if (entries.length === 0) {
      entries.push({
        timestamp: item.dep.openedAt || item.dep.startDate || 'Data inicial',
        description: `Dependência aberta (${
          item.lifecycle.isBlocking ? 'Bloqueando fluxo' : 'Aguardando terceiros'
        })`,
        author: item.dep.departmentOrOwner,
        note: item.dep.notes || item.dep.impactNextAction,
      });
    }

    // Ordenar por data cronológica crescente
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    dependencyHistory.push({
      depId: item.dep.id,
      depTitle: item.dep.title,
      taskTitle: item.taskTitle,
      milestoneTitle: item.milestoneTitle,
      entries,
    });
  });

  // Indicadores consolidados
  const totalFollowUps = allDeps.reduce(
    (acc, cur) => acc + (cur.dep.followUps?.length || 0),
    0
  );

  const averageWaitingTimeDays =
    allDeps.length > 0
      ? Math.round(
          allDeps.reduce((acc, cur) => acc + cur.waitingDays, 0) / allDeps.length
        )
      : 0;

  const dependencyResolutionRate = calculateDependencyResolutionRate({
    totalDependencies: stats.totalDependencies,
    atendidasDependencies: stats.atendidasDependencies,
  });

  const taskCompletionRate = calculateTaskCompletionRate({
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
  });

  const subtaskCompletionRate = calculateSubtaskExecutionRate({
    totalSubtasks: stats.totalSubtasks,
    completedSubtasks: stats.completedSubtasks,
  });

  const financialExecutionRate = calculateFinancialCommitmentRate(stats.financial);

  // Conclusão
  let conclTitle = 'Operação em Andamento Regular';
  let conclSummary = 'Operação em andamento regular, sem bloqueios ativos.';
  let diagnostico =
    'O projeto mantém fluxo operacional estável. As dependências e prazos devem continuar sendo monitorados preventivamente.';

  if (isCompleted) {
    conclTitle = 'Objetivo Concluído com Sucesso';
    conclSummary = 'Objetivo concluído com sucesso. Todos os marcos alcançados e dependências finalizadas.';
    diagnostico =
      'Todas as entregas foram realizadas, as ordens de compra foram atendidas e não restam pendências operacionais ativas.';
  } else if (bloqueando.length > 0) {
    conclTitle = 'Atenção Crítica: Bloqueios Ativos';
    conclSummary = `Atenção requerida: ${bloqueando.length} bloqueio(s) ativo(s) impedindo o avanço operacional.`;
    diagnostico = `Existe(m) ${bloqueando.length} dependência(s) externa(s) com bloqueio ativo de fluxo. Ações imediatas de escalonamento com os responsáveis são mandatórias para evitar atrasos na entrega dos marcos.`;
  } else if (emRisco.length > 0) {
    conclTitle = 'Atenção Operacional: Itens em Risco';
    conclSummary = `Atenção recomendada: ${emRisco.length} dependência(s) em risco por proximidade ou vencimento de SLA.`;
    diagnostico = `Apesar de não haver bloqueio direto no momento, ${emRisco.length} dependência(s) demanda(m) follow-up intensivo para evitar transição para bloqueio.`;
  }

  const generatedAt = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;

  return {
    objective,
    stats,
    isCompleted,
    statusLabel,
    statusBadge,
    periodText,
    situacaoAtual: {
      bloqueandoAgora: bloqueando,
      emRisco,
      aguardandoTerceiros: aguardando,
      prazosCriticos,
      isFullyClean,
      cleanMessage,
    },
    milestonesExecution,
    dependenciesByCategory: {
      bloqueando,
      emRisco,
      aguardando,
      atendidas,
    },
    dependencyHistory,
    financial: stats.financial,
    ocList,
    indicators: {
      taskCompletionRate,
      subtaskCompletionRate,
      dependencyResolutionRate,
      activeCriticalDeps: stats.bloqueandoDependencies + stats.emRiscoDependencies,
      totalFollowUps,
      averageWaitingTimeDays,
      financialExecutionRate,
    },
    conclusion: {
      title: conclTitle,
      summary: conclSummary,
      diagnostico,
      generatedAt,
    },
  };
}

/**
 * Gera texto em Markdown rigorosamente estruturado
 * conforme a especificação executiva solicitada
 */
export function generateExecutiveReportMarkdown(data: ExecutiveReportData): string {
  const {
    objective,
    stats,
    periodText,
    statusBadge,
    situacaoAtual,
    milestonesExecution,
    dependenciesByCategory,
    dependencyHistory,
    financial,
    ocList,
    indicators,
    conclusion,
    isCompleted,
  } = data;

  let md = `# RELATÓRIO EXECUTIVO OPERACIONAL

**Objetivo:** ${objective.title}
**Período:** ${periodText}
**Status:** ${statusBadge.text}
**Progresso:** ${stats.progressPercent}%

**Marcos:** ${stats.completedMilestones}/${stats.totalMilestones} concluídos
**Tarefas:** ${stats.completedTasks}/${stats.totalTasks} concluídas
**Subtarefas:** ${stats.completedSubtasks}/${stats.totalSubtasks} executadas

**Dependências externas:**
- ${stats.aguardandoDependencies} aguardando
- ${stats.emRiscoDependencies} em risco
- ${stats.bloqueandoDependencies} bloqueando
- ${stats.atendidasDependencies} atendidas

**Financeiro:**
- Valor previsto: ${formatCurrencyBRL(financial.totalPrevisto)}
- Em aprovação: ${formatCurrencyBRL(financial.emAprovacao)}
- Aprovado: ${formatCurrencyBRL(financial.aprovado)}
- Contratado: ${formatCurrencyBRL(financial.contratado)}
- Faturado: ${formatCurrencyBRL(financial.faturado)}
- Encaminhado para pagamento: ${formatCurrencyBRL(financial.encaminhadoPagamento)}
- Pago: ${formatCurrencyBRL(financial.pago)}

---

## 2. SITUAÇÃO OPERACIONAL ATUAL
`;

  if (isCompleted) {
    md += `*${situacaoAtual.cleanMessage}*\n\n`;
  } else if (
    situacaoAtual.bloqueandoAgora.length === 0 &&
    situacaoAtual.emRisco.length === 0 &&
    situacaoAtual.aguardandoTerceiros.length === 0 &&
    situacaoAtual.prazosCriticos.length === 0
  ) {
    md += `*${situacaoAtual.cleanMessage}*\n\n`;
  } else {
    // 🚨 Bloqueando agora
    md += `### 🚨 Bloqueando agora\n`;
    if (situacaoAtual.bloqueandoAgora.length === 0) {
      md += `*Nenhum bloqueio operacional ativo no momento.*\n\n`;
    } else {
      situacaoAtual.bloqueandoAgora.forEach((item) => {
        md += `- **${item.dep.title}**
  - Responsável/Setor: ${item.dep.departmentOrOwner}
  - Tarefa vinculada: ${item.taskTitle} (Marco: ${item.milestoneTitle})
  - Prazo SLA: ${item.dep.slaDeadline || 'Não informado'}
  - Tempo de espera: ${item.waitingDays} dia(s)
  - Impacto / Próxima ação: ${item.dep.impactNextAction || 'Avanço de tarefa'}
  - Cobranças realizadas: ${item.dep.followUps?.length || 0}\n`;
      });
      md += `\n`;
    }

    // ⚠️ Em risco
    md += `### ⚠️ Em risco\n`;
    if (situacaoAtual.emRisco.length === 0) {
      md += `*Nenhuma dependência classificada em risco no momento.*\n\n`;
    } else {
      situacaoAtual.emRisco.forEach((item) => {
        md += `- **${item.dep.title}**
  - Responsável/Setor: ${item.dep.departmentOrOwner}
  - Tarefa vinculada: ${item.taskTitle} (Marco: ${item.milestoneTitle})
  - Prazo SLA: ${item.dep.slaDeadline || 'Não informado'}
  - Tempo de espera: ${item.waitingDays} dia(s)
  - Cobranças realizadas: ${item.dep.followUps?.length || 0}\n`;
      });
      md += `\n`;
    }

    // ⏳ Aguardando terceiros
    md += `### ⏳ Aguardando terceiros\n`;
    if (situacaoAtual.aguardandoTerceiros.length === 0) {
      md += `*Nenhuma pendência regular aguardando terceiros.*\n\n`;
    } else {
      situacaoAtual.aguardandoTerceiros.forEach((item) => {
        md += `- **${item.dep.title}**
  - Responsável/Setor: ${item.dep.departmentOrOwner}
  - Tarefa vinculada: ${item.taskTitle} (Marco: ${item.milestoneTitle})
  - Prazo SLA: ${item.dep.slaDeadline || 'Não informado'}
  - Cobranças realizadas: ${item.dep.followUps?.length || 0}\n`;
      });
      md += `\n`;
    }

    // 📅 Marcos ou tarefas com prazo crítico
    if (situacaoAtual.prazosCriticos.length > 0) {
      md += `### 📅 Marcos ou tarefas com prazo crítico\n`;
      situacaoAtual.prazosCriticos.forEach((crit) => {
        md += `- **${crit.title}** ${crit.parentTitle ? `(no marco ${crit.parentTitle})` : ''}
  - Prazo limite: ${crit.deadline}
  - Situação: ${crit.situation}\n`;
      });
      md += `\n`;
    }
  }

  // 3. Execução por Marcos
  md += `---

## 3. EXECUÇÃO POR MARCOS\n\n`;

  milestonesExecution.forEach((mItem, idx) => {
    const { milestone, metrics, tasks } = mItem;
    const statusIcon = metrics.status === 'Concluído' ? '✅' : '📌';
    md += `### ${statusIcon} Marco ${idx + 1} — ${milestone.title}
**Status:** ${metrics.status}
**Prazo planejado:** ${milestone.targetDate || milestone.endDate || 'Não informado'}
**Conclusão:** ${milestone.completedAt || (metrics.status === 'Concluído' ? 'Concluído' : 'Pendente')}
**Situação:** ${metrics.deadlineSituation}
**Progresso:** ${metrics.completedTasks}/${metrics.totalTasks} tarefas concluídas (${metrics.progressPercent}% das subtarefas)
`;

    tasks.forEach((tItem) => {
      const { task, effectiveStatusLabel, subtasks } = tItem;
      md += `\n#### ${task.title}
**Categoria:** ${task.category}
**Status:** ${effectiveStatusLabel}
`;

      subtasks.forEach((sub) => {
        const check = sub.status === 'completed' ? '[x]' : '[ ]';
        let subLine = `- ${check} ${sub.title}`;
        if (sub.status === 'in_progress') subLine += ' *(Em andamento)*';
        if (sub.ocNumber || sub.orderCost) {
          const finLabel = getFinancialStatusLabel(
            sub.financialStatus || (sub.status === 'completed' ? 'PAGO' : 'EM_APROVACAO')
          ).label;
          subLine += ` (OC: ${sub.ocNumber || 'N/D'} - ${formatCurrencyBRL(
            sub.orderCost || 0
          )} | Situação financeira: ${finLabel})`;
        }
        md += `${subLine}\n`;
      });
    });

    md += `\n`;
  });

  // 4. Dependências Externas e Bloqueios
  md += `---

## 4. DEPENDÊNCIAS EXTERNAS E BLOQUEIOS\n\n`;

  const renderDepBlock = (title: string, list: ReportDependencyItem[]) => {
    let out = `### ${title} (${list.length})\n`;
    if (list.length === 0) {
      out += `*Nenhuma dependência nesta categoria.*\n\n`;
      return out;
    }

    list.forEach((item) => {
      const isBlockingText = item.lifecycle.isBlocking ? 'SIM' : 'NÃO';
      out += `- **${item.dep.title}**
  - Responsável/Setor: ${item.dep.departmentOrOwner}
  - Tarefa vinculada: ${item.taskTitle} (Marco: ${item.milestoneTitle})
  - Data de abertura: ${item.dep.openedAt || item.dep.startDate || 'Não informada'}
  - Prazo SLA: ${item.dep.slaDeadline || 'Não informado'}
  - Data de atendimento: ${item.dep.resolvedAt || 'Pendente'}
  - Tempo de espera: ${item.waitingDays} dia(s)
  - Cobranças realizadas: ${item.dep.followUps?.length || 0}
  - Impacto / Próxima ação: ${item.dep.impactNextAction || 'Avanço operacional'}
  - Bloqueando fluxo: **${isBlockingText}**
  - Estado: ${item.lifecycle.label}${item.dep.notes ? `\n  - Observações: ${item.dep.notes}` : ''}\n`;
    });
    out += `\n`;
    return out;
  };

  const activeDepsCount =
    dependenciesByCategory.bloqueando.length +
    dependenciesByCategory.emRisco.length +
    dependenciesByCategory.aguardando.length;

  if (activeDepsCount === 0) {
    md += `*Nenhuma dependência externa ativa no momento.${
      dependenciesByCategory.atendidas.length > 0
        ? ` Todas as ${dependenciesByCategory.atendidas.length} dependências foram atendidas e encontram-se documentadas na Seção 5 (Histórico de Dependências).`
        : ' Nenhuma dependência externa cadastrada.'
    }*\n\n`;
  } else {
    md += renderDepBlock('🚨 Bloqueando o fluxo', dependenciesByCategory.bloqueando);
    md += renderDepBlock('⚠️ Em risco', dependenciesByCategory.emRisco);
    md += renderDepBlock('⏳ Aguardando terceiros', dependenciesByCategory.aguardando);
  }

  // 5. Histórico de Dependências
  md += `---

## 5. HISTÓRICO DE DEPENDÊNCIAS\n\n`;

  if (dependencyHistory.length === 0) {
    md += `*Nenhum histórico registrado.*\n\n`;
  } else {
    dependencyHistory.forEach((hist) => {
      md += `### ${hist.depTitle}
*Tarefa: ${hist.taskTitle} (Marco: ${hist.milestoneTitle})*
`;
      hist.entries.forEach((e) => {
        md += `- **[${e.timestamp}]** ${e.description}${e.author ? ` — *por ${e.author}*` : ''}${
          e.note ? `\n  *Obs:* ${e.note}` : ''
        }\n`;
      });
      md += `\n`;
    });
  }

  // 6. Gestão Financeira & OCs
  md += `---

## 6. GESTÃO FINANCEIRA & OCs

- **Total de OCs mapeadas:** ${financial.totalOcs}
- **Valor Total Previsto:** ${formatCurrencyBRL(financial.totalPrevisto)}
- **Em aprovação:** ${formatCurrencyBRL(financial.emAprovacao)}
- **Aprovado:** ${formatCurrencyBRL(financial.aprovado)}
- **Contratado:** ${formatCurrencyBRL(financial.contratado)}
- **Faturado:** ${formatCurrencyBRL(financial.faturado)}
- **Encaminhado para pagamento:** ${formatCurrencyBRL(financial.encaminhadoPagamento)}
- **Pago:** ${formatCurrencyBRL(financial.pago)}

### Detalhamento das Ordens de Compra
`;

  if (ocList.length === 0) {
    md += `*Nenhuma Ordem de Compra mapeada para este objetivo.*\n\n`;
  } else {
    ocList.forEach((oc) => {
      md += `- **${oc.ocNumber}** | ${oc.taskTitle} → ${oc.subtaskTitle}
  - Valor: **${formatCurrencyBRL(oc.cost)}**
  - Situação financeira: **${oc.statusLabel}**
  - Marco: ${oc.milestoneTitle}${oc.assignee ? ` | Responsável: ${oc.assignee}` : ''}\n`;
    });
    md += `\n`;
  }

  // 7. Indicadores Operacionais
  md += `---

## 7. INDICADORES OPERACIONAIS

- **Taxa de conclusão de tarefas:** ${indicators.taskCompletionRate}% (${stats.completedTasks}/${stats.totalTasks} tarefas)
- **Taxa de conclusão de subtarefas:** ${indicators.subtaskCompletionRate}% (${stats.completedSubtasks}/${stats.totalSubtasks} subtarefas)
- **Taxa de resolução de dependências:** ${indicators.dependencyResolutionRate}% (${stats.atendidasDependencies}/${stats.totalDependencies} atendidas)
- **Dependências críticas ativas:** ${indicators.activeCriticalDeps} (${stats.bloqueandoDependencies} bloqueando, ${stats.emRiscoDependencies} em risco)
- **Total de follow-ups / cobranças realizadas:** ${indicators.totalFollowUps} cobrança(s)
- **Tempo médio de espera das dependências:** ${indicators.averageWaitingTimeDays} dia(s)
- **Eficiência financeira / compromissamento:** ${indicators.financialExecutionRate}% do previsto

---

## 8. CONCLUSÃO / SITUAÇÃO DO OBJETIVO

### ${conclusion.title}
${conclusion.summary}

**Diagnóstico Operacional:**
${conclusion.diagnostico}

---
*Gerado pela Matriz Operacional em ${conclusion.generatedAt}*
`;

  return md;
}

/**
 * Constrói o HTML puro de impressão para garantir formatação executiva
 * perfeita em qualquer impressora, PDF ou sandbox iframe
 */
export function generateExecutiveReportHtml(data: ExecutiveReportData): string {
  const {
    objective,
    stats,
    periodText,
    statusBadge,
    situacaoAtual,
    milestonesExecution,
    dependenciesByCategory,
    dependencyHistory,
    financial,
    ocList,
    indicators,
    conclusion,
    isCompleted,
  } = data;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório Executivo Operacional - ${objective.title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.45;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-tag {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #2563eb;
      margin-bottom: 4px;
    }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 12px;
      color: #475569;
      margin: 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 16px;
    }
    .meta-box strong {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-box span {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 18px 0 10px 0;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: #fafafa;
      page-break-inside: avoid;
    }
    .card-blocking {
      border-color: #fecaca;
      background: #fff5f5;
    }
    .card-risk {
      border-color: #fde68a;
      background: #fffbeb;
    }
    .card-cleared {
      border-color: #a7f3d0;
      background: #f0fdf4;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
    }
    .badge-blocking { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-risk { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-waiting { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
    .badge-cleared { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 12px;
      font-size: 10px;
    }
    th, td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
    }
    .milestone-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 12px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .milestone-box-header {
      background: #eff6ff;
      border-bottom: 1px solid #bfdbfe;
      padding: 6px 10px;
      font-weight: 800;
      color: #1e40af;
      display: flex;
      justify-content: space-between;
    }
    .task-entry {
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .task-entry:last-child {
      border-bottom: none;
    }
    .subtask-list {
      margin-top: 4px;
      padding-left: 14px;
    }
    .subtask-item {
      font-size: 10px;
      color: #475569;
      margin-bottom: 2px;
    }
    .indicators-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .indicator-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 8px;
      border-radius: 6px;
      text-align: center;
    }
    .indicator-box strong {
      display: block;
      font-size: 8px;
      text-transform: uppercase;
      color: #64748b;
    }
    .indicator-box span {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .conclusion-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2563eb;
      padding: 10px 14px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-tag">Relatório Executivo Oficial • Matriz Operacional</div>
    <h1 class="title">${objective.title}</h1>
    <p class="subtitle">Período: ${periodText} | Status: <strong>${statusBadge.text}</strong> | Progresso: <strong>${stats.progressPercent}%</strong></p>
  </div>

  <!-- 1. RESUMO EXECUTIVO -->
  <div class="section-title">1. Resumo Executivo</div>
  <div class="meta-grid">
    <div class="meta-box">
      <strong>Marcos Concluídos</strong>
      <span>${stats.completedMilestones} de ${stats.totalMilestones}</span>
    </div>
    <div class="meta-box">
      <strong>Tarefas Concluídas</strong>
      <span>${stats.completedTasks} de ${stats.totalTasks}</span>
    </div>
    <div class="meta-box">
      <strong>Subtarefas Entregues</strong>
      <span>${stats.completedSubtasks} de ${stats.totalSubtasks}</span>
    </div>
    <div class="meta-box">
      <strong>Dependências Externas</strong>
      <span>${stats.bloqueandoDependencies} bloqueando / ${stats.atendidasDependencies} atendidas</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Total Previsto</th>
        <th>Em Aprovação</th>
        <th>Aprovado</th>
        <th>Contratado</th>
        <th>Faturado</th>
        <th>Enc. Pagamento</th>
        <th>Pago</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${formatCurrencyBRL(financial.totalPrevisto)}</strong></td>
        <td style="color: #b45309;">${formatCurrencyBRL(financial.emAprovacao)}</td>
        <td style="color: #0369a1;">${formatCurrencyBRL(financial.aprovado)}</td>
        <td style="color: #4338ca;">${formatCurrencyBRL(financial.contratado)}</td>
        <td style="color: #6b21a8;">${formatCurrencyBRL(financial.faturado)}</td>
        <td style="color: #0f766e;">${formatCurrencyBRL(financial.encaminhadoPagamento)}</td>
        <td style="color: #047857; font-weight: 700;">${formatCurrencyBRL(financial.pago)}</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. SITUAÇÃO OPERACIONAL ATUAL -->
  <div class="section-title">2. Situação Operacional Atual ("O que precisa de atenção agora?")</div>
  ${
    isCompleted || (situacaoAtual.bloqueandoAgora.length === 0 && situacaoAtual.emRisco.length === 0 && situacaoAtual.aguardandoTerceiros.length === 0 && situacaoAtual.prazosCriticos.length === 0)
      ? `<div class="card card-cleared" style="text-align: center; padding: 12px;"><strong>${situacaoAtual.cleanMessage}</strong></div>`
      : `
        ${
          situacaoAtual.bloqueandoAgora.length > 0
            ? `<div style="font-weight: 800; color: #b91c1c; margin-bottom: 4px;">🚨 Bloqueando agora (${situacaoAtual.bloqueandoAgora.length})</div>
               ${situacaoAtual.bloqueandoAgora
                 .map(
                   (item) => `
                 <div class="card card-blocking">
                   <div style="display: flex; justify-content: space-between;">
                     <strong>${item.dep.title}</strong>
                     <span class="badge badge-blocking">BLOQUEANDO FLUXO</span>
                   </div>
                   <div style="font-size: 10px; color: #475569; margin-top: 3px;">
                     Setor: <strong>${item.dep.departmentOrOwner}</strong> | Tarefa: ${item.taskTitle} | SLA: ${item.dep.slaDeadline || 'N/D'} | Espera: ${item.waitingDays} dia(s)
                   </div>
                   <div style="font-size: 10px; color: #b91c1c; margin-top: 2px;">
                     Impacto: ${item.dep.impactNextAction || 'Avanço imediato da tarefa'}
                   </div>
                 </div>`
                 )
                 .join('')}`
            : ''
        }

        ${
          situacaoAtual.emRisco.length > 0
            ? `<div style="font-weight: 800; color: #b45309; margin-top: 8px; margin-bottom: 4px;">⚠️ Em risco (${situacaoAtual.emRisco.length})</div>
               ${situacaoAtual.emRisco
                 .map(
                   (item) => `
                 <div class="card card-risk">
                   <div style="display: flex; justify-content: space-between;">
                     <strong>${item.dep.title}</strong>
                     <span class="badge badge-risk">EM RISCO</span>
                   </div>
                   <div style="font-size: 10px; color: #475569; margin-top: 3px;">
                     Setor: <strong>${item.dep.departmentOrOwner}</strong> | SLA: ${item.dep.slaDeadline || 'N/D'} | Espera: ${item.waitingDays} dia(s) | Cobranças: ${item.dep.followUps?.length || 0}
                   </div>
                 </div>`
                 )
                 .join('')}`
            : ''
        }

        ${
          situacaoAtual.aguardandoTerceiros.length > 0
            ? `<div style="font-weight: 800; color: #0369a1; margin-top: 8px; margin-bottom: 4px;">⏳ Aguardando terceiros (${situacaoAtual.aguardandoTerceiros.length})</div>
               ${situacaoAtual.aguardandoTerceiros
                 .map(
                   (item) => `
                 <div class="card">
                   <div style="display: flex; justify-content: space-between;">
                     <strong>${item.dep.title}</strong>
                     <span class="badge badge-waiting">AGUARDANDO</span>
                   </div>
                   <div style="font-size: 10px; color: #475569; margin-top: 3px;">
                     Setor: <strong>${item.dep.departmentOrOwner}</strong> | SLA: ${item.dep.slaDeadline || 'N/D'} | Espera: ${item.waitingDays} dia(s)
                   </div>
                 </div>`
                 )
                 .join('')}`
            : ''
        }
      `
  }

  <!-- 3. EXECUÇÃO POR MARCOS -->
  <div class="section-title">3. Execução por Marcos</div>
  ${milestonesExecution
    .map(
      (mItem, idx) => `
    <div class="milestone-box">
      <div class="milestone-box-header">
        <span>Marco ${idx + 1} — ${mItem.milestone.title}</span>
        <span>${mItem.metrics.status} (${mItem.metrics.progressPercent}%)</span>
      </div>
      <div style="padding: 6px 10px; font-size: 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569;">
        Prazo planejado: <strong>${mItem.milestone.targetDate || mItem.milestone.endDate || 'N/D'}</strong> | Situação: <strong>${mItem.metrics.deadlineSituation}</strong> | Tarefas: <strong>${mItem.metrics.completedTasks}/${mItem.metrics.totalTasks} concluídas</strong>
      </div>
      ${mItem.tasks
        .map(
          (tItem) => `
        <div class="task-entry">
          <div style="font-weight: 700;">
            • ${tItem.task.title} <span style="font-size: 9px; font-weight: normal; color: #64748b;">(${tItem.task.category} — ${tItem.effectiveStatusLabel})</span>
          </div>
          <div class="subtask-list">
            ${tItem.subtasks
              .map(
                (sub) => `
              <div class="subtask-item">
                ${sub.status === 'completed' ? '☑' : '☐'} ${sub.title}
                ${sub.status === 'in_progress' ? '<em style="color: #2563eb;">(Em andamento)</em>' : ''}
                ${
                  sub.ocNumber
                    ? `<strong style="color: #6b21a8;">[OC: ${sub.ocNumber} - ${formatCurrencyBRL(
                        sub.orderCost || 0
                      )} | ${
                        getFinancialStatusLabel(
                          sub.financialStatus || (sub.status === 'completed' ? 'PAGO' : 'EM_APROVACAO')
                        ).label
                      }]</strong>`
                    : ''
                }
              </div>`
              )
              .join('')}
          </div>
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('')}

  <!-- 4. DEPENDÊNCIAS EXTERNAS E BLOQUEIOS -->
  <div class="section-title">4. Dependências Externas e Bloqueios (Estado Atual)</div>
  ${
    dependenciesByCategory.bloqueando.length === 0 &&
    dependenciesByCategory.emRisco.length === 0 &&
    dependenciesByCategory.aguardando.length === 0
      ? `<div class="card card-cleared" style="text-align: center; padding: 12px;"><strong>Nenhuma dependência externa ativa no momento.${
          dependenciesByCategory.atendidas.length > 0
            ? ` Todas as ${dependenciesByCategory.atendidas.length} dependências foram atendidas e constam na Seção 5 (Histórico de Dependências).`
            : ' Nenhuma dependência externa cadastrada.'
        }</strong></div>`
      : `
  <table>
    <thead>
      <tr>
        <th>Dependência / Item</th>
        <th>Responsável/Setor</th>
        <th>Tarefa Vinculada</th>
        <th>SLA / Abertura</th>
        <th>Espera</th>
        <th>Bloqueando</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ...dependenciesByCategory.bloqueando,
        ...dependenciesByCategory.emRisco,
        ...dependenciesByCategory.aguardando,
      ]
        .map(
          (item) => `
        <tr>
          <td><strong>${item.dep.title}</strong><br><small style="color: #64748b;">${item.dep.impactNextAction || ''}</small></td>
          <td>${item.dep.departmentOrOwner}</td>
          <td>${item.taskTitle}</td>
          <td>${item.dep.slaDeadline || 'N/D'}<br><small>Aberta: ${item.dep.openedAt || 'N/D'}</small></td>
          <td>${item.waitingDays} d</td>
          <td><strong style="color: ${item.lifecycle.isBlocking ? '#b91c1c' : '#047857'};">${item.lifecycle.isBlocking ? 'SIM' : 'NÃO'}</strong></td>
          <td>${item.lifecycle.label}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>`
  }

  <!-- 5. HISTÓRICO DE DEPENDÊNCIAS -->
  <div class="section-title">5. Histórico de Dependências</div>
  ${dependencyHistory
    .map(
      (h) => `
    <div style="margin-bottom: 8px;">
      <div style="font-weight: 700; color: #1e3a8a;">• ${h.depTitle} <span style="font-weight: 400; color: #64748b; font-size: 10px;">(${h.taskTitle})</span></div>
      <div style="padding-left: 12px; font-size: 10px; color: #475569;">
        ${h.entries
          .map(
            (e) => `
          <div>- [${e.timestamp}] ${e.description}${e.author ? ` (${e.author})` : ''}${e.note ? ` — <em>${e.note}</em>` : ''}</div>`
          )
          .join('')}
      </div>
    </div>`
    )
    .join('')}

  <!-- 6. GESTÃO FINANCEIRA & OCs -->
  <div class="section-title">6. Gestão Financeira & Ordens de Compra (OCs)</div>
  <table>
    <thead>
      <tr>
        <th>Nº da OC</th>
        <th>Tarefa / Demanda</th>
        <th>Item / Subtarefa</th>
        <th>Valor</th>
        <th>Situação Financeira</th>
      </tr>
    </thead>
    <tbody>
      ${
        ocList.length === 0
          ? `<tr><td colspan="5" style="text-align: center; color: #64748b;">Nenhuma OC mapeada.</td></tr>`
          : ocList
              .map(
                (oc) => `
            <tr>
              <td><strong>${oc.ocNumber}</strong></td>
              <td>${oc.taskTitle}</td>
              <td>${oc.subtaskTitle}</td>
              <td><strong>${formatCurrencyBRL(oc.cost)}</strong></td>
              <td>${oc.statusLabel}</td>
            </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <!-- 7. INDICADORES OPERACIONAIS -->
  <div class="section-title">7. Indicadores Operacionais</div>
  <div class="indicators-grid">
    <div class="indicator-box">
      <strong>Taxa Tarefas</strong>
      <span>${indicators.taskCompletionRate}%</span>
    </div>
    <div class="indicator-box">
      <strong>Taxa Subtarefas</strong>
      <span>${indicators.subtaskCompletionRate}%</span>
    </div>
    <div class="indicator-box">
      <strong>Resolução Dependências</strong>
      <span>${indicators.dependencyResolutionRate}%</span>
    </div>
    <div class="indicator-box">
      <strong>Bloqueios / Em Risco</strong>
      <span>${indicators.activeCriticalDeps}</span>
    </div>
    <div class="indicator-box">
      <strong>Cobranças Feitas</strong>
      <span>${indicators.totalFollowUps}</span>
    </div>
    <div class="indicator-box">
      <strong>Tempo Médio Espera</strong>
      <span>${indicators.averageWaitingTimeDays} dias</span>
    </div>
    <div class="indicator-box">
      <strong>Compromissamento</strong>
      <span>${indicators.financialExecutionRate}%</span>
    </div>
    <div class="indicator-box">
      <strong>Total de OCs</strong>
      <span>${financial.totalOcs}</span>
    </div>
  </div>

  <!-- 8. CONCLUSÃO / SITUAÇÃO DO OBJETIVO -->
  <div class="section-title">8. Conclusão / Situação do Objetivo</div>
  <div class="conclusion-box">
    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${conclusion.title}</div>
    <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">${conclusion.summary}</div>
    <div style="font-size: 10px; color: #475569; line-height: 1.5;">${conclusion.diagnostico}</div>
  </div>

  <div class="footer">
    Gerado pela Matriz Operacional em ${conclusion.generatedAt} • Documento Executivo de Acompanhamento
  </div>
</body>
</html>`;
}
