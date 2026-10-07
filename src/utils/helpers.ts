import { Objective, Task, Dependency, Subtask, Milestone } from '../types';

export function getObjectiveStats(objective: Objective) {
  let totalTasks = 0;
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let inProgressSubtasks = 0;
  let pendingSubtasks = 0;

  let totalDependencies = 0;
  let waitingDependencies = 0;
  let blockedDependencies = 0;
  let clearedDependencies = 0;

  let totalOcCost = 0;
  let pendingOcCost = 0;
  let approvedOcCost = 0;
  let totalOcs = 0;

  objective.milestones.forEach((milestone) => {
    milestone.tasks.forEach((task) => {
      totalTasks++;

      task.subtasks.forEach((sub) => {
        totalSubtasks++;
        if (sub.status === 'completed') completedSubtasks++;
        else if (sub.status === 'in_progress') inProgressSubtasks++;
        else pendingSubtasks++;

        if (sub.ocNumber) {
          totalOcs++;
          const cost = sub.orderCost || 0;
          totalOcCost += cost;
          // check if task has cleared dependency or is completed
          const hasWaitingDep = task.dependencies.some(
            (d) => d.status === 'waiting_approval' || d.status === 'blocked'
          );
          if (hasWaitingDep) {
            pendingOcCost += cost;
          } else {
            approvedOcCost += cost;
          }
        }
      });

      task.dependencies.forEach((dep) => {
        totalDependencies++;
        if (dep.status === 'waiting_approval') waitingDependencies++;
        else if (dep.status === 'blocked') blockedDependencies++;
        else if (dep.status === 'cleared') clearedDependencies++;
      });
    });
  });

  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const hasActiveBlockers = blockedDependencies > 0 || waitingDependencies > 0;

  return {
    totalMilestones: objective.milestones.length,
    totalTasks,
    totalSubtasks,
    completedSubtasks,
    inProgressSubtasks,
    pendingSubtasks,
    progressPercent,
    totalDependencies,
    waitingDependencies,
    blockedDependencies,
    clearedDependencies,
    hasActiveBlockers,
    totalOcs,
    totalOcCost,
    pendingOcCost,
    approvedOcCost,
  };
}

export function getMilestoneProgress(milestone: Milestone): number {
  let total = 0;
  let completed = 0;
  milestone.tasks.forEach((t) => {
    t.subtasks.forEach((s) => {
      total++;
      if (s.status === 'completed') completed++;
    });
  });
  return total > 0 ? Math.round((completed / total) * 100) : 0;
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
      return { label: 'Aguardando Aprovação', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'blocked':
      return { label: 'Bloqueador Ativo', badgeClass: 'bg-red-100 text-red-800 border-red-300' };
    case 'cleared':
      return { label: 'Liberado / Aprovado', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'pending':
    default:
      return { label: 'Pendente de Envio', badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-300' };
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
  const hasBlocker = task.dependencies.some((d) => d.status === 'blocked' || d.status === 'waiting_approval');
  if (task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completed')) {
    return 'completed';
  }
  if (hasBlocker) {
    return 'blocked';
  }
  if (task.subtasks.some((s) => s.status === 'completed' || s.status === 'in_progress')) {
    return 'in_progress';
  }
  return 'not_started';
}
