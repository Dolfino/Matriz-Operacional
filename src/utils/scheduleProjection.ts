/**
 * Utilitários do Planejamento Temporal, Agenda e Follow-up Operacional (Etapa 4.1)
 * 
 * Contrato e Invariantes:
 * 1. Agenda é uma PROJEÇÃO TEMPORAL unificada da Matriz Operacional (não é local de cadastro paralelo).
 * 2. Determinismo absoluto: aceita referenceDateStr ("YYYY-MM-DD").
 * 3. Partição temporal mutuamente exclusiva por item:
 *    ATRASADO -> HOJE -> AMANHA -> PROXIMOS_7_DIAS -> HORIZONTE_FUTURO -> SEM_DATA.
 *    (Um item pertence a EXATAMENTE uma categoria primária).
 * 4. Separação conceitual estrita:
 *    - SLA = quando a dependência deveria estar resolvida (criticidade operacional).
 *    - nextFollowUpDate = quando deve ser cobrada novamente (agenda da equipe).
 * 5. Itens concluídos e dependências ATENDIDAS são estritamente excluídos de pendências ativas.
 */

import {
  Objective,
  Dependency,
  Task,
  Subtask,
  Milestone,
  FollowUpRecurrence,
  ExecutionSession,
  ExecutionSessionStatus,
} from '../types';
import {
  getDependencyLifecycle,
  calculateObjectiveTimeMetrics,
  getSubtaskTimeMetrics,
  detectScheduleConflicts,
  ScheduleConflict,
  ObjectiveTimeSummary,
  SubtaskTimeMetrics,
} from './helpers';
import { diffCivilDays, parseCivilIsoDate } from './civilDate';

export type TemporalCategory =
  | 'ATRASADO'
  | 'HOJE'
  | 'AMANHA'
  | 'PROXIMOS_7_DIAS'
  | 'HORIZONTE_FUTURO'
  | 'SEM_DATA';

export interface TemporalFollowUpItem {
  id: string;
  sourceType: 'dependency_followup' | 'task_deadline' | 'subtask_due' | 'milestone_target';
  title: string;
  targetDate: string; // ISO YYYY-MM-DD
  
  // Categoria primária mutuamente exclusiva (Precedência Canônica)
  category: TemporalCategory;
  urgencyLabel: string;
  urgencyBadgeClass: string;
  
  // SLA específico para dependências (independente de follow-up)
  slaDeadline?: string;
  slaStatus?: 'DENTRO_DO_SLA' | 'SLA_VENCIDO' | 'SEM_SLA';
  
  departmentOrOwner: string;
  responsibleOwner?: string;
  nextActionOrImpact: string;
  notes?: string;
  recurrence?: FollowUpRecurrence;
  isBlocking: boolean;
  statusLabel: string;
  
  // Breadcrumb hierárquico
  objectiveTitle: string;
  milestoneTitle: string;
  taskTitle: string;
  subtaskTitle?: string;
  
  // Identificadores para navegação e ações de domínio
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
  atrasadoCount: number;
  hojeCount: number;
  amanhaCount: number;
  prox7DiasCount: number;
  blockingCount: number;
  items: TemporalFollowUpItem[];
}

export interface TemporalExecutionSessionItem {
  id: string; // session.id
  session: ExecutionSession;
  date: string;
  startTime: string;
  endTime: string;
  plannedDurationMinutes: number;
  actualDurationMinutes?: number;
  sessionGoal?: string;
  status: ExecutionSessionStatus;
  notes?: string;

  // Breadcrumbs e metadados da hierarquia
  subtaskId: string;
  subtaskTitle: string;
  subtaskStatus: string;
  subtaskDueDate?: string;
  subtaskTimeMetrics: SubtaskTimeMetrics;
  taskId: string;
  taskTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  objectiveId: string;
  objectiveTitle: string;

  // Categoria temporal e status da agenda
  category: TemporalCategory;
  urgencyLabel: string;
  urgencyBadgeClass: string;
  isToday: boolean;
}

export interface OperationalScheduleProjection {
  referenceDateStr: string;
  summary: {
    totalPendingActions: number;
    atrasadoCount: number;
    hojeCount: number;
    amanhaCount: number;
    prox7DiasCount: number;
    horizonteFuturoCount: number;
    semDataCount: number;
    blockingCount: number;
    slaVencidoCount: number;
  };
  timeSummary: ObjectiveTimeSummary; // Resumo agregado de tempo (estimado, reservado, realizado)
  queues: {
    atrasado: TemporalFollowUpItem[];
    hoje: TemporalFollowUpItem[];
    amanha: TemporalFollowUpItem[];
    prox7Dias: TemporalFollowUpItem[];
    horizonteFuturo: TemporalFollowUpItem[];
    semData: TemporalFollowUpItem[];
  };
  sessionsQueue: {
    all: TemporalExecutionSessionItem[];
    hoje: TemporalExecutionSessionItem[];
    amanha: TemporalExecutionSessionItem[];
    prox7Dias: TemporalExecutionSessionItem[];
    futuras: TemporalExecutionSessionItem[];
    atrasadas: TemporalExecutionSessionItem[];
    concluidas: TemporalExecutionSessionItem[];
    activeNowSession?: TemporalExecutionSessionItem;
    conflicts: ScheduleConflict[]; // Alertas de sobreposição de horário (conflitos de planejamento)
    missedSessions: TemporalExecutionSessionItem[]; // Sessões passadas não executadas (MISSED)
  };
  byOwner: TemporalOwnerQueue[];
}

/**
 * Classifica um prazo em uma categoria temporal canônica mutuamente exclusiva.
 * Precedência estrita: ATRASADO -> HOJE -> AMANHA -> PROXIMOS_7_DIAS -> HORIZONTE_FUTURO.
 */
export function classifyTemporalCategory(
  targetDateStr: string | undefined,
  refDateStr: string
): {
  category: TemporalCategory;
  diffDays: number;
  label: string;
  badgeClass: string;
} {
  if (!targetDateStr) {
    return {
      category: 'SEM_DATA',
      diffDays: 0,
      label: 'Sem data',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    };
  }

  const diff = diffCivilDays(targetDateStr, refDateStr);

  if (diff < 0) {
    return {
      category: 'ATRASADO',
      diffDays: diff,
      label: `Atrasado (${Math.abs(diff)}d)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    };
  }

  if (diff === 0) {
    return {
      category: 'HOJE',
      diffDays: 0,
      label: 'Vence / Agir Hoje',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 font-black animate-pulse',
    };
  }

  if (diff === 1) {
    return {
      category: 'AMANHA',
      diffDays: 1,
      label: 'Vence Amanhã',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-semibold',
    };
  }

  if (diff >= 2 && diff <= 7) {
    return {
      category: 'PROXIMOS_7_DIAS',
      diffDays: diff,
      label: `Em ${diff} dias`,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium',
    };
  }

  return {
    category: 'HORIZONTE_FUTURO',
    diffDays: diff,
    label: `Em ${diff} dias`,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  };
}

/**
 * Projeta a Agenda Operacional a partir do estado real do objetivo e de uma data de referência.
 */
export function buildOperationalSchedule(
  objective: Objective,
  referenceDateStr: string = '2026-10-08'
): OperationalScheduleProjection {
  const refDate = referenceDateStr;
  const allItems: TemporalFollowUpItem[] = [];

  objective.milestones.forEach((milestone) => {
    // 1. MARCOS OPERACIONAIS
    // Invariante T5: Marco concluído não gera pendência ativa
    const isMilestoneCompleted =
      milestone.status === 'concluido' ||
      (milestone.tasks.length > 0 &&
        milestone.tasks.every(
          (t) => t.subtasks.length > 0 && t.subtasks.every((s) => s.status === 'completed')
        ));

    if (!isMilestoneCompleted && milestone.targetDate) {
      const classification = classifyTemporalCategory(milestone.targetDate, refDate);
      allItems.push({
        id: `m-target-${milestone.id}`,
        sourceType: 'milestone_target',
        title: `Meta do Marco: ${milestone.title}`,
        targetDate: milestone.targetDate,
        category: classification.category,
        urgencyLabel: classification.label,
        urgencyBadgeClass: classification.badgeClass,
        departmentOrOwner: 'Coordenação Geral',
        responsibleOwner: 'Gerência de Projeto',
        nextActionOrImpact: 'Concluir tarefas estruturais do marco para liberação da esteira',
        notes: milestone.description,
        isBlocking: classification.category === 'ATRASADO',
        statusLabel: classification.category === 'ATRASADO' ? 'Marco Atrasado' : 'Prazo Planejado',
        objectiveTitle: objective.title,
        milestoneTitle: milestone.title,
        taskTitle: '-',
        objectiveId: objective.id,
        milestoneId: milestone.id,
        taskId: '',
      });
    }

    milestone.tasks.forEach((task) => {
      // Invariante T5: Tarefa concluída não gera pendência ativa
      const isTaskCompleted =
        task.subtasks.length > 0 && task.subtasks.every((s) => s.status === 'completed');

      // 2. PRAZO DA TAREFA
      if (!isTaskCompleted && task.deadline) {
        const classification = classifyTemporalCategory(task.deadline, refDate);

        // Verifica se há dependência bloqueando esta tarefa
        const hasActiveBlock = task.dependencies.some((d) => {
          const life = getDependencyLifecycle(d);
          return life.isBlocking;
        });

        allItems.push({
          id: `t-deadline-${task.id}`,
          sourceType: 'task_deadline',
          title: `Prazo da Tarefa: ${task.title}`,
          targetDate: task.deadline,
          category: classification.category,
          urgencyLabel: classification.label,
          urgencyBadgeClass: classification.badgeClass,
          departmentOrOwner: task.category,
          responsibleOwner: 'Responsável da Tarefa',
          nextActionOrImpact: `Finalizar subtarefas restantes (${task.subtasks.filter((s) => s.status !== 'completed').length} pendente(s))`,
          notes: task.description,
          isBlocking: hasActiveBlock,
          statusLabel: hasActiveBlock ? 'Bloqueada por Dependência' : 'Em Execução',
          objectiveTitle: objective.title,
          milestoneTitle: milestone.title,
          taskTitle: task.title,
          objectiveId: objective.id,
          milestoneId: milestone.id,
          taskId: task.id,
        });
      }

      // 3. PRAZO DE SUBTAREFAS EXECUTÁVEIS
      // Invariante T5: Subtarefa concluída não aparece em cobranças ou pendências
      task.subtasks.forEach((subtask) => {
        if (subtask.status !== 'completed' && subtask.dueDate) {
          const classification = classifyTemporalCategory(subtask.dueDate, refDate);

          allItems.push({
            id: `sub-due-${subtask.id}`,
            sourceType: 'subtask_due',
            title: `Executar: ${subtask.title}`,
            targetDate: subtask.dueDate,
            category: classification.category,
            urgencyLabel: classification.label,
            urgencyBadgeClass: classification.badgeClass,
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
      });

      // 4. DEPENDÊNCIAS EXTERNAS E FOLLOW-UPS
      // Invariante T4: Dependência ATENDIDA não gera cobrança na agenda
      task.dependencies.forEach((dep) => {
        const lifecycle = getDependencyLifecycle(dep);
        if (lifecycle.state === 'ATENDIDA') {
          return; // Totalmente excluída da agenda ativa
        }

        // Invariante T3: SLA e Próxima Cobrança são conceitos independentes
        let slaStatus: TemporalFollowUpItem['slaStatus'] = 'SEM_SLA';
        if (dep.slaDeadline) {
          const slaDiff = diffCivilDays(dep.slaDeadline, refDate);
          slaStatus = slaDiff < 0 ? 'SLA_VENCIDO' : 'DENTRO_DO_SLA';
        }

        // Data determinante da agenda:
        // Se nextFollowUpDate estiver definido, ele comanda a data de ação.
        // Se NÃO estiver definido, o SLA limite assume como fallback da data de cobrança.
        const actionDateStr = dep.nextFollowUpDate || dep.slaDeadline || dep.openedAt || refDate;
        const classification = classifyTemporalCategory(actionDateStr, refDate);

        let actionText = dep.impactNextAction || `Cobrar liberação junto a ${dep.departmentOrOwner}`;
        if (dep.reminderNotes) {
          actionText = `${dep.reminderNotes} (${actionText})`;
        }

        allItems.push({
          id: `dep-act-${dep.id}`,
          sourceType: 'dependency_followup',
          title: `Cobrar Dependência: ${dep.title}`,
          targetDate: actionDateStr,
          category: classification.category,
          urgencyLabel: classification.label,
          urgencyBadgeClass: classification.badgeClass,
          slaDeadline: dep.slaDeadline,
          slaStatus,
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
      });
    });
  });

  // Ordenação determinística:
  // 1. Bloqueadores primeiro
  // 2. Data civil crescente
  // 3. Título
  allItems.sort((a, b) => {
    if (a.isBlocking && !b.isBlocking) return -1;
    if (!a.isBlocking && b.isBlocking) return 1;
    const dateCmp = a.targetDate.localeCompare(b.targetDate);
    if (dateCmp !== 0) return dateCmp;
    return a.title.localeCompare(b.title);
  });

  // Filas por partição temporal estrita (sem sobreposição)
  const atrasado = allItems.filter((i) => i.category === 'ATRASADO');
  const hoje = allItems.filter((i) => i.category === 'HOJE');
  const amanha = allItems.filter((i) => i.category === 'AMANHA');
  const prox7Dias = allItems.filter((i) => i.category === 'PROXIMOS_7_DIAS');
  const horizonteFuturo = allItems.filter((i) => i.category === 'HORIZONTE_FUTURO');
  const semData = allItems.filter((i) => i.category === 'SEM_DATA');

  // Agrupamento por Responsável / Área
  const ownerMap = new Map<string, TemporalFollowUpItem[]>();
  allItems.forEach((item) => {
    const owner = item.departmentOrOwner || 'Outros / Não Atribuído';
    const list = ownerMap.get(owner) || [];
    list.push(item);
    ownerMap.set(owner, list);
  });

  const byOwner: TemporalOwnerQueue[] = Array.from(ownerMap.entries())
    .map(([ownerName, items]) => {
      const atrasadoCount = items.filter((i) => i.category === 'ATRASADO').length;
      const hojeCount = items.filter((i) => i.category === 'HOJE').length;
      const amanhaCount = items.filter((i) => i.category === 'AMANHA').length;
      const prox7DiasCount = items.filter((i) => i.category === 'PROXIMOS_7_DIAS').length;
      const blockingCount = items.filter((i) => i.isBlocking).length;

      return {
        ownerName,
        totalItems: items.length,
        atrasadoCount,
        hojeCount,
        amanhaCount,
        prox7DiasCount,
        blockingCount,
        items,
      };
    })
    .sort((a, b) => {
      if (b.blockingCount !== a.blockingCount) return b.blockingCount - a.blockingCount;
      if (b.atrasadoCount !== a.atrasadoCount) return b.atrasadoCount - a.atrasadoCount;
      return b.totalItems - a.totalItems;
    });

  // 5. PROJEÇÃO DE SESSÕES DE EXECUÇÃO / BLOCOS DE FOCO (Time Blocking)
  const allSessions: TemporalExecutionSessionItem[] = [];

  objective.milestones.forEach((milestone) => {
    milestone.tasks.forEach((task) => {
      task.subtasks.forEach((subtask) => {
        const timeMetrics = getSubtaskTimeMetrics(subtask);
        const sessions = subtask.executionSessions || [];

        sessions.forEach((session) => {
          const classification = classifyTemporalCategory(session.date, refDate);
          const isToday = session.date === refDate;

          allSessions.push({
            id: session.id,
            session,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            plannedDurationMinutes: session.plannedDurationMinutes,
            actualDurationMinutes: session.actualDurationMinutes,
            sessionGoal: session.sessionGoal,
            status: session.status,
            notes: session.notes,
            subtaskId: subtask.id,
            subtaskTitle: subtask.title,
            subtaskStatus: subtask.status,
            subtaskDueDate: subtask.dueDate,
            subtaskTimeMetrics: timeMetrics,
            taskId: task.id,
            taskTitle: task.title,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            objectiveId: objective.id,
            objectiveTitle: objective.title,
            category: classification.category,
            urgencyLabel: classification.label,
            urgencyBadgeClass: classification.badgeClass,
            isToday,
          });
        });
      });
    });
  });

  // Ordenação das sessões: data crescente -> horário de início -> título
  allSessions.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = a.startTime.localeCompare(b.startTime);
    if (timeCmp !== 0) return timeCmp;
    return a.subtaskTitle.localeCompare(b.subtaskTitle);
  });

  const sessionsHoje = allSessions.filter(
    (s) => s.isToday && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const sessionsAmanha = allSessions.filter(
    (s) => s.category === 'AMANHA' && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const sessionsProx7Dias = allSessions.filter(
    (s) => s.category === 'PROXIMOS_7_DIAS' && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const sessionsFuturas = allSessions.filter(
    (s) => s.category === 'HORIZONTE_FUTURO' && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const sessionsAtrasadas = allSessions.filter(
    (s) => s.category === 'ATRASADO' && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const sessionsConcluidas = allSessions.filter((s) => s.status === 'completed');

  // Sessões perdidas / não executadas (data anterior à referência e status ainda scheduled)
  const missedSessions = allSessions.filter(
    (s) => s.category === 'ATRASADO' && s.status === 'scheduled'
  );

  // Detecção de Conflitos de Planejamento (Sobreposições de horário no mesmo dia)
  const conflicts = detectScheduleConflicts(
    allSessions.map((s) => ({
      id: s.id,
      subtaskTitle: s.subtaskTitle,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    }))
  );

  // Sessão ativa ("AGORA"): primeira em andamento, ou primeira programada para hoje
  const activeNowSession =
    sessionsHoje.find((s) => s.status === 'in_progress') ||
    sessionsAtrasadas.find((s) => s.status === 'in_progress') ||
    sessionsHoje.find((s) => s.status === 'scheduled');

  const timeSummary = calculateObjectiveTimeMetrics(objective);

  return {
    referenceDateStr: refDate,
    summary: {
      totalPendingActions: allItems.length,
      atrasadoCount: atrasado.length,
      hojeCount: hoje.length,
      amanhaCount: amanha.length,
      prox7DiasCount: prox7Dias.length,
      horizonteFuturoCount: horizonteFuturo.length,
      semDataCount: semData.length,
      blockingCount: allItems.filter((i) => i.isBlocking).length,
      slaVencidoCount: allItems.filter((i) => i.slaStatus === 'SLA_VENCIDO').length,
    },
    timeSummary,
    queues: {
      atrasado,
      hoje,
      amanha,
      prox7Dias,
      horizonteFuturo,
      semData,
    },
    sessionsQueue: {
      all: allSessions,
      hoje: sessionsHoje,
      amanha: sessionsAmanha,
      prox7Dias: sessionsProx7Dias,
      futuras: sessionsFuturas,
      atrasadas: sessionsAtrasadas,
      concluidas: sessionsConcluidas,
      activeNowSession,
      conflicts,
      missedSessions,
    },
    byOwner,
  };
}
