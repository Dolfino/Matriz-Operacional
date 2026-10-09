import {
  Objective,
  Task,
  Dependency,
  Subtask,
  Milestone,
  DependencyLifecycleState,
  FinancialStatus,
  ExecutionSession,
  ExecutionSessionEvent,
} from '../types';

/**
 * Centralização Formal das Fórmulas Métricas Operacionais
 * Todas as visualizações (Árvore, Radar, Central de OCs, ViewModel e Relatório)
 * compartilham estritamente estas 11 definições canônicas.
 */

/**
 * 1. Progresso do Objetivo (%)
 * Fórmula: (Subtarefas concluídas / Total de subtarefas) * 100.
 * Fallback para objetivos sem subtarefas: (Tarefas concluídas / Total de tarefas) * 100.
 */
export function calculateObjectiveProgress(objective: Objective): number {
  let totalSub = 0;
  let compSub = 0;
  let totalTasks = 0;
  let compTasks = 0;

  objective.milestones.forEach((m) => {
    m.tasks.forEach((t) => {
      totalTasks++;
      const isDone = t.subtasks.length > 0 && t.subtasks.every((s) => s.status === 'completed');
      if (isDone) compTasks++;
      t.subtasks.forEach((s) => {
        totalSub++;
        if (s.status === 'completed') compSub++;
      });
    });
  });

  if (totalSub > 0) {
    return Math.round((compSub / totalSub) * 100);
  }
  if (totalTasks > 0) {
    return Math.round((compTasks / totalTasks) * 100);
  }
  return 0;
}

/**
 * 2. Progresso do Marco (%)
 * Fórmula: (Subtarefas concluídas do marco / Total de subtarefas do marco) * 100.
 */
export function calculateMilestoneProgress(milestone: Milestone): number {
  let totalSub = 0;
  let compSub = 0;
  let totalTasks = milestone.tasks.length;
  let compTasks = 0;

  milestone.tasks.forEach((t) => {
    const isDone = t.subtasks.length > 0 && t.subtasks.every((s) => s.status === 'completed');
    if (isDone) compTasks++;
    t.subtasks.forEach((s) => {
      totalSub++;
      if (s.status === 'completed') compSub++;
    });
  });

  if (totalSub > 0) {
    return Math.round((compSub / totalSub) * 100);
  }
  if (totalTasks > 0) {
    return Math.round((compTasks / totalTasks) * 100);
  }
  return 0;
}

/**
 * 3. Progresso da Tarefa (%)
 * Fórmula: (Subtarefas concluídas da tarefa / Total de subtarefas da tarefa) * 100.
 */
export function calculateTaskProgress(task: Task): number {
  if (task.subtasks.length === 0) {
    return 0;
  }
  const completed = task.subtasks.filter((s) => s.status === 'completed').length;
  return Math.round((completed / task.subtasks.length) * 100);
}

/**
 * 4. Taxa de Conclusão de Tarefas (%)
 * Fórmula: (Tarefas concluídas / Total de tarefas) * 100.
 */
export function calculateTaskCompletionRate(stats: { totalTasks: number; completedTasks: number }): number {
  return stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
}

/**
 * 5. Taxa de Execução de Subtarefas (%)
 * Fórmula: (Subtarefas concluídas / Total de subtarefas) * 100.
 */
export function calculateSubtaskExecutionRate(stats: { totalSubtasks: number; completedSubtasks: number }): number {
  return stats.totalSubtasks > 0 ? Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100) : 0;
}

/**
 * 6. Taxa de Resolução de Dependências (%)
 * Fórmula: (Dependências atendidas / Total de dependências) * 100. Se 0 dependências, 100%.
 */
export function calculateDependencyResolutionRate(stats: { totalDependencies: number; atendidasDependencies: number }): number {
  return stats.totalDependencies > 0
    ? Math.round((stats.atendidasDependencies / stats.totalDependencies) * 100)
    : 100;
}

/**
 * 7. Tempo de Espera de Dependência (em dias)
 * Fórmula: Max(0, Round((Data_Fim - Data_Abertura) em dias))
 * Onde Data_Fim = resolvedAt || dataReferencia
 */
export function calculateWaitingTimeDays(dep: Dependency, refDate: Date = new Date('2026-10-08')): number {
  const openStr = dep.openedAt || dep.startDate || dep.requestDate;
  if (!openStr) return 0;

  const openDate = new Date(openStr);
  if (isNaN(openDate.getTime())) return 0;

  let endDate = refDate;
  if (dep.resolvedAt) {
    const resDate = new Date(dep.resolvedAt);
    if (!isNaN(resDate.getTime())) endDate = resDate;
  }

  const diffTime = endDate.getTime() - openDate.getTime();
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * 8. Tempo Efetivamente Bloqueado (em dias)
 * Reconstrói a partir do histórico operacional os períodos em que a dependência esteve bloqueando.
 */
export function calculateBlockedTimeDays(dep: Dependency, refDate: Date = new Date('2026-10-08')): number {
  if (dep.history && dep.history.length > 0) {
    let totalBlockedMs = 0;
    const sorted = [...dep.history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (entry.isBlocking) {
        // Obter data de início deste bloqueio
        const start = new Date(entry.timestamp.replace(' ', 'T'));
        let end = refDate;
        if (i + 1 < sorted.length) {
          const nextDate = new Date(sorted[i + 1].timestamp.replace(' ', 'T'));
          if (!isNaN(nextDate.getTime())) end = nextDate;
        } else if (dep.resolvedAt) {
          const resDate = new Date(dep.resolvedAt);
          if (!isNaN(resDate.getTime())) end = resDate;
        }
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          totalBlockedMs += end.getTime() - start.getTime();
        }
      }
    }
    const days = Math.round(totalBlockedMs / (1000 * 60 * 60 * 24));
    if (days > 0) return days;
  }

  // Fallback: se está bloqueando agora, o tempo bloqueado equivale ao tempo de espera ativo
  const lifecycle = getDependencyLifecycle(dep);
  if (lifecycle.isBlocking) {
    return calculateWaitingTimeDays(dep, refDate);
  }
  return 0;
}

/**
 * 9. Cumprimento de SLA da Dependência
 * Avalia se o atendimento ocorreu dentro do SLA ou se o prazo foi estourado.
 */
export function calculateSlaCompliance(
  dep: Dependency,
  refDate: Date = new Date('2026-10-08')
): {
  isCompliant: boolean;
  status: 'Dentro do SLA' | 'SLA estourado' | 'Sem SLA';
  delayDays: number;
} {
  const slaStr = dep.slaDeadline || dep.endDate;
  if (!slaStr) {
    return { isCompliant: true, status: 'Sem SLA', delayDays: 0 };
  }
  const slaDate = new Date(slaStr);
  if (isNaN(slaDate.getTime())) {
    return { isCompliant: true, status: 'Sem SLA', delayDays: 0 };
  }
  const checkDate = dep.resolvedAt ? new Date(dep.resolvedAt) : refDate;
  if (checkDate <= slaDate) {
    return { isCompliant: true, status: 'Dentro do SLA', delayDays: 0 };
  }
  const delayDays = Math.max(1, Math.round((checkDate.getTime() - slaDate.getTime()) / (1000 * 60 * 60 * 24)));
  return { isCompliant: false, status: 'SLA estourado', delayDays };
}

/**
 * 10. Situação de Prazo (Marcos e Tarefas)
 */
export function calculateDeadlineSituation(
  item: { targetDate?: string; completedAt?: string; isCompleted: boolean },
  refDate: Date = new Date('2026-10-08')
): string {
  if (item.isCompleted) {
    if (item.completedAt && item.targetDate) {
      return new Date(item.completedAt) <= new Date(item.targetDate)
        ? 'Concluído dentro do prazo'
        : 'Concluído com atraso';
    }
    return 'Concluído';
  }

  if (item.targetDate) {
    const targetDate = new Date(item.targetDate);
    if (isNaN(targetDate.getTime())) return 'Sem prazo definido';
    if (targetDate < refDate) {
      return 'Atrasado';
    }
    const diffDays = Math.round((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return 'Em risco (prazo próximo)';
    }
    return 'Dentro do prazo';
  }

  return 'Sem prazo definido';
}

/**
 * 11. Taxa de Compromissamento Financeiro (%)
 * Fórmula: ((Aprovado + Contratado + Faturado + Encaminhado Pagamento + Pago) / Total Previsto) * 100
 */
export function calculateFinancialCommitmentRate(financial: {
  totalPrevisto: number;
  aprovado: number;
  contratado: number;
  faturado: number;
  encaminhadoPagamento: number;
  pago: number;
}): number {
  if (financial.totalPrevisto <= 0) return 0;
  const compromissado =
    financial.pago +
    financial.encaminhadoPagamento +
    financial.faturado +
    financial.contratado +
    financial.aprovado;
  return Math.round((compromissado / financial.totalPrevisto) * 100);
}

/**
 * Normaliza o ciclo de vida e estado de bloqueio de uma dependência
 */
export function getDependencyLifecycle(dep: Dependency): {
  state: DependencyLifecycleState;
  isBlocking: boolean;
  label: string;
  badgeClass: string;
} {
  let state: DependencyLifecycleState = 'AGUARDANDO';

  if (dep.state) {
    state = dep.state;
  } else if (dep.status === 'cleared') {
    state = 'ATENDIDA';
  } else if (dep.status === 'blocked') {
    state = 'EM_RISCO';
  } else if (dep.status === 'waiting_approval') {
    // Verificar se SLA estourou
    if (dep.slaDeadline || dep.endDate) {
      const slaStr = dep.slaDeadline || dep.endDate || '';
      const slaDate = new Date(slaStr);
      const now = new Date('2026-10-08'); // Data de referência da aplicação
      if (!isNaN(slaDate.getTime()) && slaDate < now) {
        state = 'EM_RISCO';
      } else {
        state = 'AGUARDANDO';
      }
    } else {
      state = 'AGUARDANDO';
    }
  }

  // bloqueandoFluxo: se explicitamente booleano, respeita; caso contrário deduz
  let isBlocking = false;
  if (typeof dep.bloqueandoFluxo === 'boolean') {
    isBlocking = state !== 'ATENDIDA' && dep.bloqueandoFluxo;
  } else {
    // Legado
    if (state === 'ATENDIDA') {
      isBlocking = false;
    } else if (dep.status === 'blocked' || dep.severity === 'blocker') {
      isBlocking = true;
    } else if (dep.status === 'waiting_approval') {
      isBlocking = true;
    }
  }

  let label = 'Aguardando';
  let badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';

  if (state === 'ATENDIDA') {
    label = 'Atendida';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (state === 'EM_RISCO') {
    label = 'Em Risco';
    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
  } else {
    label = 'Aguardando';
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
  }

  return { state, isBlocking, label, badgeClass };
}

/**
 * Calcula o tempo de espera de uma dependência (em dias)
 */
export function getDependencyWaitingTimeDays(dep: Dependency, refDate?: Date): number {
  return calculateWaitingTimeDays(dep, refDate);
}

/**
 * Indicadores operacionais da tarefa: subtarefas e dependências
 */
export function getTaskOperationalStats(task: Task) {
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.status === 'completed').length;

  let aguardando = 0;
  let emRisco = 0;
  let bloqueando = 0;
  let atendidas = 0;

  task.dependencies.forEach((dep) => {
    const { state, isBlocking } = getDependencyLifecycle(dep);
    if (state === 'ATENDIDA') {
      atendidas++;
    } else if (isBlocking) {
      bloqueando++;
    } else if (state === 'EM_RISCO') {
      emRisco++;
    } else {
      aguardando++;
    }
  });

  return {
    totalSubtasks,
    completedSubtasks,
    totalDependencies: task.dependencies.length,
    aguardando,
    emRisco,
    bloqueando,
    atendidas,
    hasActiveBlocker: bloqueando > 0,
  };
}

/**
 * Métricas operacionais do Marco
 */
export function getMilestoneOperationalMetrics(milestone: Milestone) {
  let totalTasks = milestone.tasks.length;
  let completedTasks = 0;
  let totalSubtasks = 0;
  let completedSubtasks = 0;

  let activeDependencies = 0;
  let activeBlockers = 0;

  milestone.tasks.forEach((task) => {
    const isTaskDone =
      task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completed');
    if (isTaskDone) completedTasks++;

    task.subtasks.forEach((s) => {
      totalSubtasks++;
      if (s.status === 'completed') completedSubtasks++;
    });

    task.dependencies.forEach((dep) => {
      const { state, isBlocking } = getDependencyLifecycle(dep);
      if (state !== 'ATENDIDA') {
        activeDependencies++;
        if (isBlocking) activeBlockers++;
      }
    });
  });

  const progressPercent = calculateMilestoneProgress(milestone);
  const isAllTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;

  // Status do Marco
  let status: 'Concluído' | 'Em andamento' | 'Não iniciado' | 'Atrasado' = 'Não iniciado';
  if (milestone.completedAt || isAllTasksCompleted) {
    status = 'Concluído';
  } else if (completedTasks > 0 || completedSubtasks > 0) {
    status = 'Em andamento';
  }

  // Situação do prazo centralizada
  const targetDateStr = milestone.targetDate || milestone.endDate;
  const deadlineSituation = calculateDeadlineSituation({
    targetDate: targetDateStr,
    completedAt: milestone.completedAt,
    isCompleted: status === 'Concluído',
  });

  if (status !== 'Concluído' && deadlineSituation === 'Atrasado') {
    status = 'Atrasado';
  }

  return {
    totalTasks,
    completedTasks,
    totalSubtasks,
    completedSubtasks,
    progressPercent,
    activeDependencies,
    activeBlockers,
    hasBlocker: activeBlockers > 0,
    status,
    deadlineSituation,
  };
}

/**
 * Mapeia e totaliza valores financeiros de OCs por estado
 */
export function getFinancialTotals(objective: Objective): {
  totalPrevisto: number;
  emAprovacao: number;
  aprovado: number;
  contratado: number;
  faturado: number;
  encaminhadoPagamento: number;
  pago: number;
  totalOcs: number;
} {
  let totalPrevisto = 0;
  let emAprovacao = 0;
  let aprovado = 0;
  let contratado = 0;
  let faturado = 0;
  let encaminhadoPagamento = 0;
  let pago = 0;
  let totalOcs = 0;

  objective.milestones.forEach((m) => {
    m.tasks.forEach((t) => {
      t.subtasks.forEach((s) => {
        if (s.ocNumber || s.orderCost) {
          totalOcs++;
          const cost = s.orderCost || 0;
          totalPrevisto += cost;

          // Determinar status financeiro
          let fStatus: FinancialStatus = s.financialStatus || 'PREVISTO';

          // Se não houver status financeiro explícito, deduzir por regras de negócio
          if (!s.financialStatus) {
            const hasWaitingDep = t.dependencies.some((d) => {
              const { state } = getDependencyLifecycle(d);
              return state !== 'ATENDIDA';
            });

            if (hasWaitingDep) {
              fStatus = 'EM_APROVACAO';
            } else if (s.status === 'completed') {
              fStatus = 'PAGO';
            } else {
              fStatus = 'APROVADO';
            }
          }

          switch (fStatus) {
            case 'EM_APROVACAO':
              emAprovacao += cost;
              break;
            case 'APROVADO':
              aprovado += cost;
              break;
            case 'CONTRATADO':
              contratado += cost;
              break;
            case 'FATURADO':
              faturado += cost;
              break;
            case 'ENCAMINHADO_PAGAMENTO':
              encaminhadoPagamento += cost;
              break;
            case 'PAGO':
              pago += cost;
              break;
            case 'PREVISTO':
            default:
              break;
          }
        }
      });
    });
  });

  return {
    totalPrevisto,
    emAprovacao,
    aprovado,
    contratado,
    faturado,
    encaminhadoPagamento,
    pago,
    totalOcs,
  };
}

export function getFinancialStatusLabel(status: FinancialStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'PREVISTO':
      return { label: 'Previsto', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'EM_APROVACAO':
      return { label: 'Em Aprovação', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'APROVADO':
      return { label: 'Aprovado', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'CONTRATADO':
      return { label: 'Contratado', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case 'FATURADO':
      return { label: 'Faturado', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'ENCAMINHADO_PAGAMENTO':
      return { label: 'Encaminhado Pagamento', badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'PAGO':
      return { label: 'Pago', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    default:
      return { label: status, badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

/**
 * Resumo Operacional Calculado Dinamicamente do Objetivo
 */
export function getObjectiveStats(objective: Objective) {
  let totalTasks = 0;
  let completedTasks = 0;
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let inProgressSubtasks = 0;
  let pendingSubtasks = 0;

  let totalDependencies = 0;
  let aguardandoDependencies = 0;
  let emRiscoDependencies = 0;
  let bloqueandoDependencies = 0;
  let atendidasDependencies = 0;

  let completedMilestones = 0;

  objective.milestones.forEach((milestone) => {
    const mMetrics = getMilestoneOperationalMetrics(milestone);
    if (mMetrics.status === 'Concluído') completedMilestones++;

    milestone.tasks.forEach((task) => {
      totalTasks++;
      const isTaskDone =
        task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completed');
      if (isTaskDone) completedTasks++;

      task.subtasks.forEach((sub) => {
        totalSubtasks++;
        if (sub.status === 'completed') completedSubtasks++;
        else if (sub.status === 'in_progress') inProgressSubtasks++;
        else pendingSubtasks++;
      });

      task.dependencies.forEach((dep) => {
        totalDependencies++;
        const { state, isBlocking } = getDependencyLifecycle(dep);
        if (state === 'ATENDIDA') {
          atendidasDependencies++;
        } else if (isBlocking) {
          bloqueandoDependencies++;
        } else if (state === 'EM_RISCO') {
          emRiscoDependencies++;
        } else {
          aguardandoDependencies++;
        }
      });
    });
  });

  const progressPercent = calculateObjectiveProgress(objective);
  const financialTotals = getFinancialTotals(objective);

  return {
    totalMilestones: objective.milestones.length,
    completedMilestones,
    totalTasks,
    completedTasks,
    totalSubtasks,
    completedSubtasks,
    inProgressSubtasks,
    pendingSubtasks,
    progressPercent,

    totalDependencies,
    aguardandoDependencies,
    emRiscoDependencies,
    bloqueandoDependencies,
    atendidasDependencies,
    hasActiveBlockers: bloqueandoDependencies > 0,

    financial: financialTotals,
    totalOcs: financialTotals.totalOcs,
    totalOcCost: financialTotals.totalPrevisto,
    pendingOcCost: financialTotals.emAprovacao,
    approvedOcCost:
      financialTotals.aprovado +
      financialTotals.contratado +
      financialTotals.faturado +
      financialTotals.encaminhadoPagamento +
      financialTotals.pago,
    waitingDependencies: aguardandoDependencies,
    blockedDependencies: bloqueandoDependencies,
    clearedDependencies: atendidasDependencies,
  };
}

export function getMilestoneProgress(milestone: Milestone): number {
  return getMilestoneOperationalMetrics(milestone).progressPercent;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function getDependencyStatusLabel(status: Dependency['status']) {
  switch (status) {
    case 'waiting_approval':
    case 'AGUARDANDO':
      return { label: 'Aguardando Aprovação', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'blocked':
    case 'EM_RISCO':
      return { label: 'Em Risco / Bloqueio', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' };
    case 'cleared':
    case 'ATENDIDA':
      return { label: 'Atendida / Liberada', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'pending':
    default:
      return { label: 'Pendente', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' };
  }
}

export function getSeverityLabel(severity: Dependency['severity']) {
  switch (severity) {
    case 'blocker':
      return { label: 'Bloqueio Crítico', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    case 'critical':
      return { label: 'Alta Prioridade', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'normal':
      return { label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    case 'low':
      return { label: 'Baixa', color: 'text-zinc-600 bg-zinc-50 border-zinc-200' };
  }
}

export function getTaskEffectiveStatus(task: Task): 'completed' | 'blocked' | 'in_progress' | 'not_started' {
  const { isBlocking } = task.dependencies.reduce(
    (acc, d) => {
      const info = getDependencyLifecycle(d);
      if (info.isBlocking) acc.isBlocking = true;
      return acc;
    },
    { isBlocking: false }
  );

  if (task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completed')) {
    return 'completed';
  }
  if (isBlocking) {
    return 'blocked';
  }
  if (task.subtasks.some((s) => s.status === 'completed' || s.status === 'in_progress')) {
    return 'in_progress';
  }
  return 'not_started';
}

/**
 * Métricas Temporais da Subtarefa (Time Blocking / Sessões de Execução)
 * 
 * Invariantes da Matriz (Etapa 4.3B):
 * - estimatedMinutes: Quanto trabalho eu tenho? (esforço total planejado na subtarefa)
 * - reservedUpcomingMinutes: Tempo ainda reservado em sessões ativas/futuras (scheduled, in_progress)
 * - plannedHistoricalMinutes: Todo o tempo que foi planejado, inclusive concluído, perdido, reagendado
 * - actualMinutes: Tempo efetivamente consumido em foco (soma apenas intervalos ativos START/RESUME -> PAUSE/COMPLETE)
 * - planningGapMinutes: estimatedMinutes - reservedUpcomingMinutes (gap de trabalho sem horário reservado)
 * - coveragePercent: (reservedUpcomingMinutes / estimatedMinutes) * 100 (SEM clamp a 100%, pode exceder)
 * - coverageDeltaMinutes: reservedUpcomingMinutes - estimatedMinutes (excedente ou déficit em minutos)
 */
export interface SubtaskTimeMetrics {
  estimatedMinutes: number;
  reservedMinutes: number; // mantido para compatibilidade = reservedUpcomingMinutes
  reservedUpcomingMinutes: number; // tempo ainda reservado em sessões futuras/ativas
  plannedHistoricalMinutes: number; // todo o tempo que foi planejado na história
  actualMinutes: number;
  remainingMinutes: number;
  planningGapMinutes: number; // estimatedMinutes - reservedUpcomingMinutes
  coveragePercent: number; // SEM clamp, pode passar de 100% (ex: 150%)
  coverageDeltaMinutes: number; // > 0 quando acima da estimativa, < 0 quando faltam horas
  progressTimePercent: number; // Realizado / Estimado (%)
  activeSession?: ExecutionSession;
}

export function getSubtaskTimeMetrics(subtask: Subtask): SubtaskTimeMetrics {
  const estimatedMinutes = Math.max(0, subtask.estimatedMinutes || 0);
  const sessions = subtask.executionSessions || [];

  // Estados que entram em reservedUpcomingMinutes: 'scheduled' e 'in_progress'
  // Estados que NÃO entram: 'completed', 'cancelled', 'missed', 'rescheduled'
  const upcomingSessions = sessions.filter(
    (s) => s.status === 'scheduled' || s.status === 'in_progress'
  );

  const reservedUpcomingMinutes = upcomingSessions.reduce(
    (sum, s) => sum + (s.plannedDurationMinutes || 0),
    0
  );

  // Todo o tempo planejado na história (exclui apenas cancelled puramente descartados)
  const plannedHistoricalMinutes = sessions
    .filter((s) => s.status !== 'cancelled' || s.cancellationReason === 'SUBTASK_COMPLETED')
    .reduce((sum, s) => sum + (s.plannedDurationMinutes || 0), 0);

  // Tempo realizado em foco
  const actualMinutes = sessions.reduce((sum, s) => {
    if (s.events && s.events.length > 0) {
      const { actualMinutes: fromEvt } = calculateActualMinutesFromEvents(s.events, s.actualDurationMinutes);
      return sum + fromEvt;
    }
    if (s.actualDurationMinutes !== undefined && s.actualDurationMinutes !== null) {
      return sum + s.actualDurationMinutes;
    }
    if (s.status === 'completed') {
      return sum + (s.plannedDurationMinutes || 0);
    }
    return sum;
  }, 0);

  const remainingMinutes = Math.max(0, estimatedMinutes - actualMinutes);

  // Gap de planejamento: trabalho estimado ainda sem horário reservado
  const planningGapMinutes = estimatedMinutes - reservedUpcomingMinutes;

  // Cobertura SEM clamp: pode passar de 100% (ex: 60min estimado, 90min reservado = 150%)
  const coveragePercent =
    estimatedMinutes > 0 ? Math.round((reservedUpcomingMinutes / estimatedMinutes) * 100) : 0;

  const coverageDeltaMinutes = reservedUpcomingMinutes - estimatedMinutes;

  const progressTimePercent =
    estimatedMinutes > 0 ? Math.round((actualMinutes / estimatedMinutes) * 100) : 0;

  const activeSession = sessions.find((s) => s.status === 'in_progress');

  return {
    estimatedMinutes,
    reservedMinutes: reservedUpcomingMinutes,
    reservedUpcomingMinutes,
    plannedHistoricalMinutes,
    actualMinutes,
    remainingMinutes,
    planningGapMinutes,
    coveragePercent,
    coverageDeltaMinutes,
    progressTimePercent,
    activeSession,
  };
}

export function formatMinutes(minutes: number): string {
  if (!minutes || minutes === 0) return '0 min';
  const isNegative = minutes < 0;
  const abs = Math.abs(minutes);
  const sign = isNegative ? '-' : '';
  if (abs < 60) return `${sign}${abs} min`;
  const hours = Math.floor(abs / 60);
  const remainingMin = abs % 60;
  if (remainingMin === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${remainingMin}m`;
}

export interface ObjectiveTimeSummary {
  totalEstimatedMinutes: number;
  totalReservedMinutes: number; // tempo ainda reservado futuro
  totalPlannedHistoricalMinutes: number;
  totalActualMinutes: number;
  totalRemainingMinutes: number;
  totalPlanningGapMinutes: number;
  coveragePercent: number; // sem clamp
  totalSessionsCount: number;
  completedSessionsCount: number;
  scheduledSessionsCount: number;
}

export function calculateObjectiveTimeMetrics(objective: Objective): ObjectiveTimeSummary {
  let totalEstimatedMinutes = 0;
  let totalReservedMinutes = 0;
  let totalPlannedHistoricalMinutes = 0;
  let totalActualMinutes = 0;
  let totalSessionsCount = 0;
  let completedSessionsCount = 0;
  let scheduledSessionsCount = 0;

  objective.milestones.forEach((m) => {
    m.tasks.forEach((t) => {
      t.subtasks.forEach((s) => {
        const metrics = getSubtaskTimeMetrics(s);
        totalEstimatedMinutes += metrics.estimatedMinutes;
        totalReservedMinutes += metrics.reservedUpcomingMinutes;
        totalPlannedHistoricalMinutes += metrics.plannedHistoricalMinutes;
        totalActualMinutes += metrics.actualMinutes;

        const sessions = s.executionSessions || [];
        sessions.forEach((session) => {
          if (session.status !== 'cancelled') {
            totalSessionsCount++;
            if (session.status === 'completed') {
              completedSessionsCount++;
            } else if (session.status === 'scheduled') {
              scheduledSessionsCount++;
            }
          }
        });
      });
    });
  });

  const totalRemainingMinutes = Math.max(0, totalEstimatedMinutes - totalActualMinutes);
  const totalPlanningGapMinutes = totalEstimatedMinutes - totalReservedMinutes;
  const coveragePercent =
    totalEstimatedMinutes > 0
      ? Math.round((totalReservedMinutes / totalEstimatedMinutes) * 100)
      : 0;

  return {
    totalEstimatedMinutes,
    totalReservedMinutes,
    totalPlannedHistoricalMinutes,
    totalActualMinutes,
    totalRemainingMinutes,
    totalPlanningGapMinutes,
    coveragePercent,
    totalSessionsCount,
    completedSessionsCount,
    scheduledSessionsCount,
  };
}

/**
 * Converte string de horário "HH:mm" em minutos a partir da meia-noite (0..1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Converte minutos a partir da meia-noite em formato "HH:mm".
 */
export function minutesToTimeString(minutes: number): string {
  const norm = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calcula a sobreposição em minutos entre dois intervalos de horário (mesmo dia civil).
 * Retorna 0 se não houver sobreposição.
 */
export function calculateTimeOverlapMinutes(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): number {
  const sA = timeStringToMinutes(startA);
  const eA = timeStringToMinutes(endA);
  const sB = timeStringToMinutes(startB);
  const eB = timeStringToMinutes(endB);

  const startMax = Math.max(sA, sB);
  const endMin = Math.min(eA, eB);

  if (endMin > startMax) {
    return endMin - startMax;
  }
  return 0;
}

/**
 * Conflito de Planejamento entre duas Sessões de Execução (sobreposição de horário no mesmo dia).
 */
export interface ScheduleConflict {
  sessionAId: string;
  sessionBId: string;
  sessionATitle: string;
  sessionBTitle: string;
  date: string;
  overlapMinutes: number;
  message: string;
}

/**
 * Detecta todos os conflitos de planejamento (sobreposições na agenda) para uma lista de sessões.
 * Não bloqueia o cadastro, mas expõe alertas claros de colisão de tempo.
 */
export function detectScheduleConflicts(
  sessions: Array<{
    id: string;
    subtaskTitle: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }>
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const activeSessions = sessions.filter(
    (s) => s.status !== 'cancelled' && s.date && s.startTime && s.endTime
  );

  for (let i = 0; i < activeSessions.length; i++) {
    for (let j = i + 1; j < activeSessions.length; j++) {
      const a = activeSessions[i];
      const b = activeSessions[j];
      if (a.date === b.date && a.id !== b.id) {
        const overlap = calculateTimeOverlapMinutes(
          a.startTime,
          a.endTime,
          b.startTime,
          b.endTime
        );
        if (overlap > 0) {
          conflicts.push({
            sessionAId: a.id,
            sessionBId: b.id,
            sessionATitle: a.subtaskTitle,
            sessionBTitle: b.subtaskTitle,
            date: a.date,
            overlapMinutes: overlap,
            message: `Sobreposição de ${overlap} minuto(s) no dia ${a.date} entre "${a.subtaskTitle}" (${a.startTime}–${a.endTime}) e "${b.subtaskTitle}" (${b.startTime}–${b.endTime}).`,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Reconstrução canônica do tempo efetivamente realizado a partir de histórico append-only de eventos.
 * Permite pausas, retomadas e cancelamento preservando os segmentos reais de foco.
 * 
 * Exemplo do usuário:
 * INICIAR 10:00 -> PAUSAR 10:12 (12m) -> RETOMAR 10:20 -> CONCLUIR 10:38 (18m) = 30m realizado (e não 38m).
 */
export function calculateActualMinutesFromEvents(
  events?: ExecutionSessionEvent[],
  fallbackActualMinutes?: number
): {
  actualMinutes: number;
  pauseMinutes: number;
  interruptionsCount: number;
  isCurrentlyRunning: boolean;
} {
  if (!events || events.length === 0) {
    return {
      actualMinutes: fallbackActualMinutes || 0,
      pauseMinutes: 0,
      interruptionsCount: 0,
      isCurrentlyRunning: false,
    };
  }

  let totalActiveMs = 0;
  let totalPauseMs = 0;
  let interruptionsCount = 0;
  let runningStartMs: number | null = null;
  let pauseStartMs: number | null = null;

  // Helper para parsear timestamp (ISO ou hora HH:mm)
  const parseEventTime = (tStr: string): number => {
    if (!tStr) return 0;
    // Se for formato HH:mm
    if (/^\d{1,2}:\d{2}$/.test(tStr.trim())) {
      const parts = tStr.trim().split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return (h * 60 + m) * 60 * 1000;
    }
    const ms = Date.parse(tStr);
    return isNaN(ms) ? 0 : ms;
  };

  events.forEach((evt) => {
    const evtTime = parseEventTime(evt.timestamp);
    if (evt.type === 'START' || evt.type === 'RESUME') {
      if (pauseStartMs !== null && evtTime >= pauseStartMs) {
        totalPauseMs += evtTime - pauseStartMs;
        pauseStartMs = null;
      }
      runningStartMs = evtTime;
    } else if (evt.type === 'PAUSE') {
      if (runningStartMs !== null && evtTime >= runningStartMs) {
        totalActiveMs += evtTime - runningStartMs;
        runningStartMs = null;
      }
      pauseStartMs = evtTime;
      interruptionsCount++;
    } else if (evt.type === 'COMPLETE' || evt.type === 'CANCEL') {
      if (runningStartMs !== null && evtTime >= runningStartMs) {
        totalActiveMs += evtTime - runningStartMs;
        runningStartMs = null;
      }
      if (pauseStartMs !== null && evtTime >= pauseStartMs) {
        totalPauseMs += evtTime - pauseStartMs;
        pauseStartMs = null;
      }
    }
  });

  const actualMinutes = Math.round(totalActiveMs / (60 * 1000));
  const pauseMinutes = Math.round(totalPauseMs / (60 * 1000));

  return {
    actualMinutes: actualMinutes > 0 ? actualMinutes : fallbackActualMinutes || 0,
    pauseMinutes,
    interruptionsCount,
    isCurrentlyRunning: runningStartMs !== null,
  };
}

