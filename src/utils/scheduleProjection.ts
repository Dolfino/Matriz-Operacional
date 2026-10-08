/**
 * Utilitários do Planejamento Temporal, Agenda e Follow-up Operacional (Etapa 4)
 * Invariante: Agenda é uma PROJEÇÃO TEMPORAL da mesma Matriz Operacional.
 * Não cadastra trabalho em local separado; deriva prazos, follow-ups e cobranças das tarefas e dependências reais.
 */

import { Objective, Dependency, Task, Subtask, Milestone } from '../types';
import { getDependencyLifecycle } from './helpers';

export interface TemporalFollowUpItem {
  id: string;
  sourceType: 'dependency_followup' | 'task_deadline' | 'subtask_due' | 'milestone_target';
  title: string;
  targetDate: string; // ISO YYYY-MM-DD
  urgency: 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'later';
  urgencyLabel: string;
  urgencyBadgeClass: string;
  departmentOrOwner: string;
  responsibleOwner?: string;
  nextActionOrImpact: string;
  notes?: string;
  recurrence?: string;
  isBlocking: boolean;
  statusLabel: string;
  // Breadcrumb hierárquico (sempre rastreável)
  objectiveTitle: string;
  milestoneTitle: string;
  taskTitle: string;
  subtaskTitle?: string;
  // Referências para ações rápidas
  objectiveId: string;
  milestoneId: string;
  taskId: string;
  subtaskId?: string;
  dependencyId?: string;
  rawDependency?: Dependency;
}

export interface TemporalOwnerQueue {
  ownerName: string;
  totalItems: number;
  overdueCount: number;
  todayCount: number;
  blockingCount: number;
  items: TemporalFollowUpItem[];
}

export interface OperationalScheduleProjection {
  refDateStr: string;
  summary: {
    totalPendingActions: number;
    overdueCount: number;
    todayCount: number;
    tomorrowCount: number;
    next7DaysCount: number;
    blockingCount: number;
    inRiskCount: number;
  };
  queues: {
    overdue: TemporalFollowUpItem[];
    today: TemporalFollowUpItem[];
    tomorrow: TemporalFollowUpItem[];
    next7Days: TemporalFollowUpItem[];
    upcoming: TemporalFollowUpItem[];
  };
  byOwner: TemporalOwnerQueue[];
}

/**
 * Converte data civil ISO para string YYYY-MM-DD segura (sem timezone shift)
 */
export function normalizeIsoDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  // Se já estiver no formato YYYY-MM-DD, retorna diretamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Se tiver timestamp (ex: 2026-09-20T10:00:00 ou 2026-09-20 10:00)
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/**
 * Calcula diferença em dias civis entre duas datas ISO
 */
export function getDaysDiff(targetDateStr: string, refDateStr: string): number {
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const [rY, rM, rD] = refDateStr.split('-').map(Number);
  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const refUtc = Date.UTC(rY, rM - 1, rD);
  return Math.round((targetUtc - refUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Constrói a projeção temporal da agenda a partir dos dados do objetivo
 */
export function buildOperationalSchedule(
  objective: Objective,
  customRefDateStr: string = '2026-10-08'
): OperationalScheduleProjection {
  const refDate = customRefDateStr;
  const allItems: TemporalFollowUpItem[] = [];

  objective.milestones.forEach((milestone) => {
    // 1. Marcos operacionais pendentes
    const isMilestoneCompleted = milestone.tasks.length > 0 &&
      milestone.tasks.every((t) => t.subtasks.length > 0 && t.subtasks.every((s) => s.status === 'completed'));

    if (!isMilestoneCompleted && milestone.targetDate) {
      const targetNorm = normalizeIsoDate(milestone.targetDate);
      if (targetNorm) {
        const diff = getDaysDiff(targetNorm, refDate);
        let urgency: TemporalFollowUpItem['urgency'] = 'upcoming';
        let urgencyLabel = 'Nos próximos dias';
        let urgencyBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

        if (diff < 0) {
          urgency = 'overdue';
          urgencyLabel = `Atrasado há ${Math.abs(diff)}d`;
          urgencyBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
        } else if (diff === 0) {
          urgency = 'today';
          urgencyLabel = 'Vence Hoje';
          urgencyBadgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
        } else if (diff === 1) {
          urgency = 'tomorrow';
          urgencyLabel = 'Vence Amanhã';
          urgencyBadgeClass = 'bg-blue-100 text-blue-900 border-blue-300';
        } else if (diff <= 7) {
          urgency = 'upcoming';
          urgencyLabel = `Em ${diff} dias`;
          urgencyBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }

        allItems.push({
          id: `m-due-${milestone.id}`,
          sourceType: 'milestone_target',
          title: `Meta do Marco: ${milestone.title}`,
          targetDate: targetNorm,
          urgency,
          urgencyLabel,
          urgencyBadgeClass,
          departmentOrOwner: 'Coordenação Geral',
          responsibleOwner: 'Gerência de Projeto',
          nextActionOrImpact: 'Concluir tarefas estruturais do marco para liberação da esteira',
          notes: milestone.description,
          isBlocking: diff < 0,
          statusLabel: diff < 0 ? 'Marco Atrasado' : 'Prazo Planejado',
          objectiveTitle: objective.title,
          milestoneTitle: milestone.title,
          taskTitle: '-',
          objectiveId: objective.id,
          milestoneId: milestone.id,
          taskId: '',
        });
      }
    }

    milestone.tasks.forEach((task) => {
      const isTaskDone = task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completed');

      // 2. Tarefa com prazo crítico
      if (!isTaskDone && task.deadline) {
        const deadlineNorm = normalizeIsoDate(task.deadline);
        if (deadlineNorm) {
          const diff = getDaysDiff(deadlineNorm, refDate);
          let urgency: TemporalFollowUpItem['urgency'] = 'upcoming';
          let urgencyLabel = 'No prazo';
          let urgencyBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

          if (diff < 0) {
            urgency = 'overdue';
            urgencyLabel = `Atrasada (${Math.abs(diff)}d)`;
            urgencyBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
          } else if (diff === 0) {
            urgency = 'today';
            urgencyLabel = 'Vence Hoje';
            urgencyBadgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
          } else if (diff === 1) {
            urgency = 'tomorrow';
            urgencyLabel = 'Vence Amanhã';
            urgencyBadgeClass = 'bg-blue-100 text-blue-900 border-blue-300';
          } else if (diff <= 7) {
            urgency = 'upcoming';
            urgencyLabel = `Em ${diff} dias`;
            urgencyBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          }

          // Determinar se está bloqueada
          const hasActiveBlock = task.dependencies.some((d) => {
            const life = getDependencyLifecycle(d);
            return life.isBlocking;
          });

          allItems.push({
            id: `t-due-${task.id}`,
            sourceType: 'task_deadline',
            title: `Prazo da Tarefa: ${task.title}`,
            targetDate: deadlineNorm,
            urgency,
            urgencyLabel,
            urgencyBadgeClass,
            departmentOrOwner: task.category,
            responsibleOwner: 'Responsável da Tarefa',
            nextActionOrImpact: `Finalizar subtarefas restantes (${task.subtasks.filter((s) => s.status !== 'completed').length} pendente(s))`,
            notes: task.description,
            isBlocking: hasActiveBlock,
            statusLabel: hasActiveBlock ? 'Bloqueada por Dependência' : isTaskDone ? 'Concluída' : 'Em Execução',
            objectiveTitle: objective.title,
            milestoneTitle: milestone.title,
            taskTitle: task.title,
            objectiveId: objective.id,
            milestoneId: milestone.id,
            taskId: task.id,
          });
        }
      }

      // 3. Subtarefas com dueDate específica pendente
      task.subtasks.forEach((subtask) => {
        if (subtask.status !== 'completed' && subtask.dueDate) {
          const subDateNorm = normalizeIsoDate(subtask.dueDate);
          if (subDateNorm) {
            const diff = getDaysDiff(subDateNorm, refDate);
            let urgency: TemporalFollowUpItem['urgency'] = 'upcoming';
            let urgencyLabel = 'Próxima';
            let urgencyBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

            if (diff < 0) {
              urgency = 'overdue';
              urgencyLabel = `Atrasada (${Math.abs(diff)}d)`;
              urgencyBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
            } else if (diff === 0) {
              urgency = 'today';
              urgencyLabel = 'Executar Hoje';
              urgencyBadgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
            } else if (diff === 1) {
              urgency = 'tomorrow';
              urgencyLabel = 'Amanhã';
              urgencyBadgeClass = 'bg-blue-100 text-blue-900 border-blue-300';
            } else if (diff <= 7) {
              urgency = 'upcoming';
              urgencyLabel = `Em ${diff} dias`;
              urgencyBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
            }

            allItems.push({
              id: `s-due-${subtask.id}`,
              sourceType: 'subtask_due',
              title: `Executar: ${subtask.title}`,
              targetDate: subDateNorm,
              urgency,
              urgencyLabel,
              urgencyBadgeClass,
              departmentOrOwner: subtask.assignee || 'Equipe',
              responsibleOwner: subtask.assignee || 'Executor',
              nextActionOrImpact: `Ação operacional vinculada à tarefa ${task.title}`,
              notes: subtask.notes,
              isBlocking: false,
              statusLabel: subtask.status === 'in_progress' ? 'Em Andamento' : 'Pendente',
              objectiveTitle: objective.title,
              milestoneTitle: milestone.title,
              taskTitle: task.title,
              subtaskTitle: subtask.title,
              objectiveId: objective.id,
              milestoneId: milestone.id,
              taskId: task.id,
              subtaskId: subtask.id,
            });
          }
        }
      });

      // 4. Dependências Externas: COBRANÇAS, SLA e FOLLOW-UPS
      task.dependencies.forEach((dep) => {
        const lifecycle = getDependencyLifecycle(dep);
        // Apenas dependências ativas (não resolvidas) geram cobrança na agenda
        if (lifecycle.state !== 'ATENDIDA') {
          // Determinar a data de ação temporal:
          // Se tiver nextFollowUpDate, usa essa data; se não tiver, usa o slaDeadline ou a data de abertura como fallback
          const actionDateStr = dep.nextFollowUpDate || dep.slaDeadline || dep.openedAt || refDate;
          const actionDateNorm = normalizeIsoDate(actionDateStr) || refDate;
          const diff = getDaysDiff(actionDateNorm, refDate);

          let urgency: TemporalFollowUpItem['urgency'] = 'upcoming';
          let urgencyLabel = 'Acompanhar';
          let urgencyBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

          if (diff < 0) {
            urgency = 'overdue';
            urgencyLabel = `Cobrança Vencida (${Math.abs(diff)}d)`;
            urgencyBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
          } else if (diff === 0) {
            urgency = 'today';
            urgencyLabel = 'Cobrar Hoje';
            urgencyBadgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-black animate-pulse';
          } else if (diff === 1) {
            urgency = 'tomorrow';
            urgencyLabel = 'Cobrar Amanhã';
            urgencyBadgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-semibold';
          } else if (diff <= 7) {
            urgency = 'upcoming';
            urgencyLabel = `Em ${diff} dias`;
            urgencyBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          }

          // Detalhar a próxima ação ou impacto
          let actionText = dep.impactNextAction || `Cobrar liberação junto a ${dep.departmentOrOwner}`;
          if (dep.reminderNotes) {
            actionText = `${dep.reminderNotes} (${actionText})`;
          }

          allItems.push({
            id: `dep-act-${dep.id}`,
            sourceType: 'dependency_followup',
            title: `Cobrar Dependência: ${dep.title}`,
            targetDate: actionDateNorm,
            urgency,
            urgencyLabel,
            urgencyBadgeClass,
            departmentOrOwner: dep.departmentOrOwner,
            responsibleOwner: dep.responsibleOwner || 'Gestor Operacional',
            nextActionOrImpact: actionText,
            notes: dep.notes,
            recurrence: dep.followUpRecurrence || 'daily',
            isBlocking: lifecycle.isBlocking,
            statusLabel: lifecycle.isBlocking
              ? '🚨 Bloqueando Fluxo'
              : lifecycle.state === 'EM_RISCO'
              ? '⚠️ Em Risco'
              : '⏳ Aguardando Terceiros',
            objectiveTitle: objective.title,
            milestoneTitle: milestone.title,
            taskTitle: task.title,
            objectiveId: objective.id,
            milestoneId: milestone.id,
            taskId: task.id,
            dependencyId: dep.id,
            rawDependency: dep,
          });
        }
      });
    });
  });

  // Ordenar por data alvo crescente
  allItems.sort((a, b) => {
    // Primeiro critério: bloqueadores críticos primeiro
    if (a.isBlocking && !b.isBlocking) return -1;
    if (!a.isBlocking && b.isBlocking) return 1;
    // Segundo critério: data mais antiga primeiro
    return a.targetDate.localeCompare(b.targetDate);
  });

  const overdue = allItems.filter((i) => i.urgency === 'overdue');
  const today = allItems.filter((i) => i.urgency === 'today');
  const tomorrow = allItems.filter((i) => i.urgency === 'tomorrow');
  const next7Days = allItems.filter((i) => {
    if (i.urgency === 'overdue' || i.urgency === 'today' || i.urgency === 'tomorrow') return false;
    const diff = getDaysDiff(i.targetDate, refDate);
    return diff >= 2 && diff <= 7;
  });
  const upcoming = allItems.filter((i) => {
    const diff = getDaysDiff(i.targetDate, refDate);
    return diff > 7;
  });

  // Agrupamento por Responsável / Terceiro Cobrado
  const ownerMap = new Map<string, TemporalFollowUpItem[]>();
  allItems.forEach((item) => {
    const owner = item.departmentOrOwner || 'Outros / Não Atribuído';
    const list = ownerMap.get(owner) || [];
    list.push(item);
    ownerMap.set(owner, list);
  });

  const byOwner: TemporalOwnerQueue[] = Array.from(ownerMap.entries())
    .map(([ownerName, items]) => {
      const overdueCount = items.filter((i) => i.urgency === 'overdue').length;
      const todayCount = items.filter((i) => i.urgency === 'today').length;
      const blockingCount = items.filter((i) => i.isBlocking).length;
      return {
        ownerName,
        totalItems: items.length,
        overdueCount,
        todayCount,
        blockingCount,
        items,
      };
    })
    .sort((a, b) => {
      // Ordena por maior número de bloqueadores, depois por vencidos
      if (b.blockingCount !== a.blockingCount) return b.blockingCount - a.blockingCount;
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
      return b.totalItems - a.totalItems;
    });

  return {
    refDateStr: refDate,
    summary: {
      totalPendingActions: allItems.length,
      overdueCount: overdue.length,
      todayCount: today.length,
      tomorrowCount: tomorrow.length,
      next7DaysCount: next7Days.length,
      blockingCount: allItems.filter((i) => i.isBlocking).length,
      inRiskCount: allItems.filter((i) => i.statusLabel.includes('Em Risco')).length,
    },
    queues: {
      overdue,
      today,
      tomorrow,
      next7Days,
      upcoming,
    },
    byOwner,
  };
}
