import { Objective, Milestone, Task, Subtask, Dependency } from '../types';

export type GanttItemType = 'objective' | 'milestone' | 'task' | 'subtask' | 'dependency';

export interface GanttRowItem {
  id: string;
  uniqueKey: string;
  type: GanttItemType;
  title: string;
  level: number; // 0: Objective, 1: Milestone, 2: Task, 3: Subtask, 4: Dependency
  parentId?: string;
  objectiveId: string;
  objectiveTitle: string;
  milestoneId?: string;
  milestoneTitle?: string;
  taskId?: string;
  taskTitle?: string;
  startDateStr: string;
  endDateStr: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  status: string; // 'completed' | 'in_progress' | 'pending' | 'waiting_approval' | 'blocked' | 'cleared' etc.
  progressPercent: number;
  assigneeOrOwner?: string;
  cost?: number;
  ocNumber?: string;
  category?: string;
  priority?: string;
  severity?: string;
  notes?: string;
  hasChildren: boolean;
  isExpanded: boolean;
  originalItem: Objective | Milestone | Task | Subtask | Dependency;
}

export type GanttScale = 'day' | 'week' | 'month';

/**
 * Safely parse date string YYYY-MM-DD to a local Date object
 */
export function parseLocalDate(dateStr?: string, defaultFallback?: Date): Date {
  if (!dateStr) return defaultFallback ? new Date(defaultFallback) : new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 0, 0, 0);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? (defaultFallback ? new Date(defaultFallback) : new Date()) : d;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format Date to DD/MM/YYYY
 */
export function formatDateBR(d: Date | string): string {
  const dateObj = typeof d === 'string' ? parseLocalDate(d) : d;
  return dateObj.toLocaleDateString('pt-BR');
}

/**
 * Calculate duration in days between two dates inclusive
 */
export function calculateDaysBetween(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Normalizes start and end date for any item in the project hierarchy
 */
export function normalizeItemDates(
  explicitStart?: string,
  explicitEnd?: string,
  parentStart?: Date,
  parentEnd?: Date,
  defaultDurationDays = 5
): { start: Date; end: Date; startStr: string; endStr: string; durationDays: number } {
  let start: Date;
  let end: Date;

  if (explicitStart && explicitEnd) {
    start = parseLocalDate(explicitStart);
    end = parseLocalDate(explicitEnd);
    if (end < start) {
      end = new Date(start.getTime() + (defaultDurationDays - 1) * 86400000);
    }
  } else if (explicitStart && !explicitEnd) {
    start = parseLocalDate(explicitStart);
    if (parentEnd && parentEnd >= start) {
      end = new Date(parentEnd);
    } else {
      end = new Date(start.getTime() + (defaultDurationDays - 1) * 86400000);
    }
  } else if (!explicitStart && explicitEnd) {
    end = parseLocalDate(explicitEnd);
    if (parentStart && parentStart <= end) {
      start = new Date(parentStart);
    } else {
      start = new Date(end.getTime() - (defaultDurationDays - 1) * 86400000);
    }
  } else {
    // Both missing - inherit from parent or fallback
    start = parentStart ? new Date(parentStart) : new Date();
    end = parentEnd ? new Date(parentEnd) : new Date(start.getTime() + (defaultDurationDays - 1) * 86400000);
  }

  return {
    start,
    end,
    startStr: formatDateISO(start),
    endStr: formatDateISO(end),
    durationDays: calculateDaysBetween(start, end),
  };
}

/**
 * Build flat, hierarchical list of Gantt rows from a list of Objectives
 */
export function buildGanttRows(
  objectives: Objective[],
  collapsedKeys: Record<string, boolean>,
  depthFilter: 'all' | 'tasks' | 'milestones' = 'all',
  searchQuery = '',
  statusFilter = 'all'
): GanttRowItem[] {
  const rows: GanttRowItem[] = [];
  const query = searchQuery.trim().toLowerCase();

  objectives.forEach((obj) => {
    const objDates = normalizeItemDates(
      obj.startDate,
      obj.endDate || obj.eventDate,
      undefined,
      undefined,
      20
    );

    // Calculate overall objective subtask completion percentage
    let totalSubs = 0;
    let completedSubs = 0;
    obj.milestones.forEach((m) =>
      m.tasks.forEach((t) =>
        t.subtasks.forEach((s) => {
          totalSubs++;
          if (s.status === 'completed') completedSubs++;
        })
      )
    );
    const objProgress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
    const objKey = `obj-${obj.id}`;
    const isObjExpanded = !collapsedKeys[objKey];

    const objRow: GanttRowItem = {
      id: obj.id,
      uniqueKey: objKey,
      type: 'objective',
      title: obj.title,
      level: 0,
      objectiveId: obj.id,
      objectiveTitle: obj.title,
      startDateStr: objDates.startStr,
      endDateStr: objDates.endStr,
      startDate: objDates.start,
      endDate: objDates.end,
      durationDays: objDates.durationDays,
      status: obj.status,
      progressPercent: objProgress,
      category: obj.category,
      notes: obj.description,
      hasChildren: obj.milestones.length > 0,
      isExpanded: isObjExpanded,
      originalItem: obj,
    };

    rows.push(objRow);

    if (depthFilter === 'milestones' && !isObjExpanded) return;

    // Milestones
    obj.milestones.forEach((milestone, mIdx) => {
      if (!isObjExpanded) return;

      const mDates = normalizeItemDates(
        milestone.startDate,
        milestone.endDate || milestone.targetDate,
        objDates.start,
        objDates.end,
        14
      );

      let mTotal = 0;
      let mCompleted = 0;
      milestone.tasks.forEach((t) =>
        t.subtasks.forEach((s) => {
          mTotal++;
          if (s.status === 'completed') mCompleted++;
        })
      );
      const mProgress = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;
      const mKey = `mil-${milestone.id}`;
      const isMExpanded = !collapsedKeys[mKey];

      const mRow: GanttRowItem = {
        id: milestone.id,
        uniqueKey: mKey,
        type: 'milestone',
        title: milestone.title,
        level: 1,
        parentId: obj.id,
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        startDateStr: mDates.startStr,
        endDateStr: mDates.endStr,
        startDate: mDates.start,
        endDate: mDates.end,
        durationDays: mDates.durationDays,
        status: mProgress === 100 ? 'completed' : mProgress > 0 ? 'in_progress' : 'pending',
        progressPercent: mProgress,
        notes: milestone.description,
        hasChildren: milestone.tasks.length > 0,
        isExpanded: isMExpanded,
        originalItem: milestone,
      };

      rows.push(mRow);

      if (depthFilter === 'milestones') return;

      // Tasks
      milestone.tasks.forEach((task) => {
        if (!isMExpanded) return;

        const tDates = normalizeItemDates(
          task.startDate,
          task.endDate || task.deadline,
          mDates.start,
          mDates.end,
          10
        );

        let tTotal = task.subtasks.length;
        let tCompleted = task.subtasks.filter((s) => s.status === 'completed').length;
        const tProgress = tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0;

        const hasBlocker = task.dependencies.some(
          (d) => d.status === 'blocked' || d.status === 'waiting_approval'
        );
        const taskStatus =
          tProgress === 100
            ? 'completed'
            : hasBlocker
            ? 'blocked'
            : tProgress > 0
            ? 'in_progress'
            : 'not_started';

        const tKey = `task-${task.id}`;
        const isTExpanded = !collapsedKeys[tKey];

        const tRow: GanttRowItem = {
          id: task.id,
          uniqueKey: tKey,
          type: 'task',
          title: task.title,
          level: 2,
          parentId: milestone.id,
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          taskId: task.id,
          taskTitle: task.title,
          startDateStr: tDates.startStr,
          endDateStr: tDates.endStr,
          startDate: tDates.start,
          endDate: tDates.end,
          durationDays: tDates.durationDays,
          status: taskStatus,
          progressPercent: tProgress,
          category: task.category,
          priority: task.priority,
          notes: task.description,
          hasChildren: task.subtasks.length > 0 || task.dependencies.length > 0,
          isExpanded: isTExpanded,
          originalItem: task,
        };

        rows.push(tRow);

        if (depthFilter === 'tasks') return;

        if (!isTExpanded) return;

        // Subtasks
        task.subtasks.forEach((sub, sIdx) => {
          const sDates = normalizeItemDates(
            sub.startDate,
            sub.endDate || sub.dueDate,
            tDates.start,
            tDates.end,
            3
          );

          const sKey = `sub-${sub.id}`;
          const sRow: GanttRowItem = {
            id: sub.id,
            uniqueKey: sKey,
            type: 'subtask',
            title: sub.title,
            level: 3,
            parentId: task.id,
            objectiveId: obj.id,
            objectiveTitle: obj.title,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            taskId: task.id,
            taskTitle: task.title,
            startDateStr: sDates.startStr,
            endDateStr: sDates.endStr,
            startDate: sDates.start,
            endDate: sDates.end,
            durationDays: sDates.durationDays,
            status: sub.status,
            progressPercent: sub.status === 'completed' ? 100 : sub.status === 'in_progress' ? 50 : 0,
            assigneeOrOwner: sub.assignee,
            cost: sub.orderCost,
            ocNumber: sub.ocNumber,
            notes: sub.notes,
            hasChildren: false,
            isExpanded: false,
            originalItem: sub,
          };

          rows.push(sRow);
        });

        // Dependencies
        task.dependencies.forEach((dep) => {
          const dDates = normalizeItemDates(
            dep.startDate || dep.requestDate,
            dep.endDate || dep.slaDeadline,
            tDates.start,
            tDates.end,
            4
          );

          const dKey = `dep-${dep.id}`;
          const dRow: GanttRowItem = {
            id: dep.id,
            uniqueKey: dKey,
            type: 'dependency',
            title: `[Bloqueio/SLA] ${dep.title}`,
            level: 3,
            parentId: task.id,
            objectiveId: obj.id,
            objectiveTitle: obj.title,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            taskId: task.id,
            taskTitle: task.title,
            startDateStr: dDates.startStr,
            endDateStr: dDates.endStr,
            startDate: dDates.start,
            endDate: dDates.end,
            durationDays: dDates.durationDays,
            status: dep.status,
            progressPercent: dep.status === 'cleared' ? 100 : 20,
            assigneeOrOwner: dep.departmentOrOwner,
            severity: dep.severity,
            notes: dep.notes,
            hasChildren: false,
            isExpanded: false,
            originalItem: dep,
          };

          rows.push(dRow);
        });
      });
    });
  });

  // Apply Search and Status filter
  let filtered = rows;
  if (query) {
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.objectiveTitle.toLowerCase().includes(query) ||
        (r.assigneeOrOwner && r.assigneeOrOwner.toLowerCase().includes(query)) ||
        (r.ocNumber && r.ocNumber.toLowerCase().includes(query))
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((r) => {
      if (statusFilter === 'blocked') return r.status === 'blocked' || r.status === 'waiting_approval';
      if (statusFilter === 'completed') return r.status === 'completed' || r.status === 'cleared';
      if (statusFilter === 'in_progress') return r.status === 'in_progress';
      return true;
    });
  }

  return filtered;
}

/**
 * Calculates global start and end bounds across all rows with a little padding
 */
export function getTimelineBounds(rows: GanttRowItem[]): { minDate: Date; maxDate: Date; totalDays: number } {
  if (rows.length === 0) {
    const today = new Date();
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { minDate, maxDate, totalDays: calculateDaysBetween(minDate, maxDate) };
  }

  let minTime = Infinity;
  let maxTime = -Infinity;

  rows.forEach((r) => {
    if (r.startDate.getTime() < minTime) minTime = r.startDate.getTime();
    if (r.endDate.getTime() > maxTime) maxTime = r.endDate.getTime();
  });

  // Add 3 days padding on both ends
  const minDate = new Date(minTime - 3 * 86400000);
  const maxDate = new Date(maxTime + 5 * 86400000);

  return {
    minDate,
    maxDate,
    totalDays: calculateDaysBetween(minDate, maxDate),
  };
}

/**
 * Month names in Portuguese
 */
export const PT_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const PT_MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
