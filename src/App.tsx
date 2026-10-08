/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Objective,
  Milestone,
  Task,
  Subtask,
  Dependency,
  DependencyLifecycleState,
  FinancialStatus,
  DependencyHistoryEntry,
} from './types';
import { loadObjectives, saveObjectives, resetToDefault, exportDataAsJson } from './utils/storage';
import { createDefaultApprovalStages } from './utils/approvalRules';
import { Navbar } from './components/Navbar';
import { TreeView } from './components/TreeView';
import { DependenciesRadar } from './components/DependenciesRadar';
import { TaskBoardView } from './components/TaskBoardView';
import { OcManager } from './components/OcManager';
import { MultiProjectGanttView } from './components/MultiProjectGanttView';
import { OperationalScheduleView } from './components/OperationalScheduleView';
import { TaskModal } from './components/TaskModal';
import { MilestoneModal } from './components/MilestoneModal';
import { ObjectiveModal } from './components/ObjectiveModal';
import { GranularityCheckerModal } from './components/GranularityCheckerModal';
import { FollowUpModal } from './components/FollowUpModal';
import { ExecutiveSummaryModal } from './components/ExecutiveSummaryModal';
import { GranularityRuleBanner } from './components/GranularityRuleBanner';

export default function App() {
  const [objectives, setObjectives] = useState<Objective[]>(() => loadObjectives());
  const [currentObjectiveId, setCurrentObjectiveId] = useState<string>(
    () => objectives[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'tree' | 'radar' | 'board' | 'ocs' | 'gantt' | 'schedule'>('tree');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [targetMilestoneId, setTargetMilestoneId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  const [isCheckerModalOpen, setIsCheckerModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Follow-up modal state
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<Dependency | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');

  // Persist to storage
  useEffect(() => {
    saveObjectives(objectives);
  }, [objectives]);

  // Active objective reference
  const currentObjective =
    objectives.find((o) => o.id === currentObjectiveId) || objectives[0] || null;

  // Task Modal Handlers
  const handleOpenTaskModal = (milestoneId: string, task?: Task) => {
    setTargetMilestoneId(milestoneId);
    setEditingTask(task || null);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (milestoneId: string, task: Task) => {
    if (!currentObjective) return;

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;

      const existingTaskIndex = m.tasks.findIndex((t) => t.id === task.id);
      let updatedTasks: Task[];

      if (existingTaskIndex >= 0) {
        updatedTasks = m.tasks.map((t) => (t.id === task.id ? task : t));
      } else {
        updatedTasks = [...m.tasks, task];
      }

      return {
        ...m,
        tasks: updatedTasks,
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  const handleDeleteTask = (milestoneId: string, taskId: string) => {
    if (!confirm('Deseja realmente remover esta tarefa?')) return;
    if (!currentObjective) return;

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        tasks: m.tasks.filter((t) => t.id !== taskId),
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Subtask Toggle (Cycle: Pending -> In Progress -> Completed -> Pending)
  const handleToggleSubtask = (milestoneId: string, taskId: string, subtaskId: string) => {
    if (!currentObjective) return;

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        tasks: m.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: t.subtasks.map((s) => {
              if (s.id !== subtaskId) return s;
              const nextStatus: Subtask['status'] =
                s.status === 'completed'
                  ? 'pending'
                  : s.status === 'pending'
                  ? 'in_progress'
                  : 'completed';
              return { ...s, status: nextStatus };
            }),
          };
        }),
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Reorder Subtasks
  const handleReorderSubtasks = (
    milestoneId: string,
    taskId: string,
    startIndex: number,
    endIndex: number
  ) => {
    if (!currentObjective) return;

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        tasks: m.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const reordered = [...t.subtasks];
          const [removed] = reordered.splice(startIndex, 1);
          reordered.splice(endIndex, 0, removed);
          return { ...t, subtasks: reordered };
        }),
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  const handleMoveSubtask = (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    direction: 'up' | 'down'
  ) => {
    if (!currentObjective) return;

    const milestone = currentObjective.milestones.find((m) => m.id === milestoneId);
    const task = milestone?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const index = task.subtasks.findIndex((s) => s.id === subtaskId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= task.subtasks.length) return;

    handleReorderSubtasks(milestoneId, taskId, index, targetIndex);
  };

  // Dependency Status Update (Compatibilidade)
  const handleUpdateDependencyStatus = (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    status: Dependency['status']
  ) => {
    handleUpdateDependencyDetails(milestoneId, taskId, dependencyId, {
      status,
      state:
        status === 'cleared'
          ? 'ATENDIDA'
          : status === 'blocked'
          ? 'EM_RISCO'
          : 'AGUARDANDO',
      bloqueandoFluxo: status === 'cleared' ? false : true,
      resolvedAt: status === 'cleared' ? new Date().toISOString().slice(0, 10) : undefined,
    });
  };

  // Atualização Detalhada da Dependência com Histórico Operacional (Itens 1, 2 e 6)
  const handleUpdateDependencyDetails = (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    updates: Partial<Dependency>
  ) => {
    if (!currentObjective) return;

    const timestamp =
      new Date().toLocaleDateString('pt-BR') +
      ' ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        tasks: m.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            dependencies: t.dependencies.map((d) => {
              if (d.id !== dependencyId) return d;

              const prevState = d.state || 'AGUARDANDO';
              const nextState = updates.state || prevState;
              const wasBlocking = typeof d.bloqueandoFluxo === 'boolean' ? d.bloqueandoFluxo : true;
              let isBlocking =
                typeof updates.bloqueandoFluxo === 'boolean'
                  ? updates.bloqueandoFluxo
                  : wasBlocking;

              if (nextState === 'ATENDIDA') {
                isBlocking = false;
                updates.bloqueandoFluxo = false;
                updates.status = 'cleared';
                if (!updates.resolvedAt && !d.resolvedAt) {
                  updates.resolvedAt = new Date().toISOString().slice(0, 10);
                }
              }

              const historyEntry: DependencyHistoryEntry = {
                id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp,
                previousState: prevState,
                newState: nextState,
                wasBlocking,
                isBlocking,
                note:
                  updates.notes ||
                  `Estado atualizado para ${nextState} (Bloqueando fluxo: ${
                    isBlocking ? 'SIM' : 'NÃO'
                  })`,
                author: 'Operações',
              };

              return {
                ...d,
                ...updates,
                history: [...(d.history || []), historyEntry],
              };
            }),
          };
        }),
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Atualização de Status Financeiro da Subtask / OC (Item 7)
  const handleUpdateSubtaskFinancialStatus = (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    financialStatus: FinancialStatus
  ) => {
    if (!currentObjective) return;

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        tasks: m.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: t.subtasks.map((s) => {
              if (s.id !== subtaskId) return s;
              return { ...s, financialStatus };
            }),
          };
        }),
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Advance multi-stage approval (Gerência -> Superintendência -> Diretoria -> CEO)
  const handleAdvanceApprovalStage = (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    stageIndex: number
  ) => {
    if (!currentObjective) return;

    const timestamp =
      new Date().toLocaleDateString('pt-BR') +
      ' ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        tasks: m.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            dependencies: t.dependencies.map((d) => {
              if (d.id !== dependencyId) return d;
              let stages = d.approvalStages ? [...d.approvalStages] : [];
              if (stages.length === 0) {
                const cost = t.subtasks.find((s) => s.orderCost)?.orderCost || 0;
                stages = createDefaultApprovalStages(cost);
              }

              if (stages[stageIndex]) {
                stages[stageIndex] = {
                  ...stages[stageIndex],
                  approved: true,
                  approvedAt: timestamp,
                  approverName: stages[stageIndex].level,
                };
              }

              const allDone = stages.every((s) => s.approved);
              const nextUnapproved = stages.find((s) => !s.approved);
              const nextState = allDone ? 'ATENDIDA' : 'AGUARDANDO';

              const historyEntry: DependencyHistoryEntry = {
                id: `h-${Date.now()}`,
                timestamp,
                previousState: d.state || 'AGUARDANDO',
                newState: nextState,
                wasBlocking: !allDone,
                isBlocking: !allDone,
                note: `Alçada '${stages[stageIndex]?.level}' aprovada. ${
                  allDone ? 'Todas as alçadas concluídas.' : `Próxima alçada: ${nextUnapproved?.level}`
                }`,
                author: stages[stageIndex]?.level || 'Aprovador',
              };

              return {
                ...d,
                approvalStages: stages,
                departmentOrOwner: nextUnapproved ? nextUnapproved.level : d.departmentOrOwner,
                status: (allDone ? 'cleared' : 'waiting_approval') as Dependency['status'],
                state: (allDone ? 'ATENDIDA' : 'AGUARDANDO') as DependencyLifecycleState,
                bloqueandoFluxo: !allDone,
                resolvedAt: allDone ? new Date().toISOString().slice(0, 10) : undefined,
                history: [...(d.history || []), historyEntry],
              };
            }),
          };
        }),
      };
    });

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Follow-up modal
  const handleOpenFollowUpModal = (dependency: Dependency, taskTitle: string) => {
    setSelectedDependency(dependency);
    setSelectedTaskTitle(taskTitle);
    setIsFollowUpModalOpen(true);
  };

  const handleSaveFollowUp = (
    dependencyId: string,
    note: string,
    author?: string,
    additionalData?: {
      nextFollowUpDate?: string;
      followUpRecurrence?: 'daily' | 'every_2_days' | 'weekly' | 'none';
      reminderNotes?: string;
    }
  ) => {
    if (!currentObjective) return;

    const timestamp =
      new Date().toLocaleDateString('pt-BR') +
      ' ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newLog = {
      id: `flw-${Date.now()}`,
      date: timestamp,
      note,
      author: author || 'Operações',
    };

    const updatedMilestones = currentObjective.milestones.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) => ({
        ...t,
        dependencies: t.dependencies.map((d) => {
          if (d.id !== dependencyId) return d;
          const historyEntry: DependencyHistoryEntry = {
            id: `h-${Date.now()}`,
            timestamp,
            previousState: d.state || 'AGUARDANDO',
            newState: d.state || 'AGUARDANDO',
            wasBlocking: d.bloqueandoFluxo,
            isBlocking: d.bloqueandoFluxo,
            note: `Cobrança/Follow-up registrado: ${note}`,
            author: author || 'Operações',
          };

          return {
            ...d,
            followUps: [...(d.followUps || []), newLog],
            history: [...(d.history || []), historyEntry],
            ...(additionalData?.nextFollowUpDate !== undefined && {
              nextFollowUpDate: additionalData.nextFollowUpDate,
            }),
            ...(additionalData?.followUpRecurrence !== undefined && {
              followUpRecurrence: additionalData.followUpRecurrence,
            }),
            ...(additionalData?.reminderNotes !== undefined && {
              reminderNotes: additionalData.reminderNotes,
            }),
          };
        }),
      })),
    }));

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Milestone Actions
  const handleOpenMilestoneModal = (milestone?: Milestone) => {
    setEditingMilestone(milestone || null);
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestone = (milestone: Milestone) => {
    if (!currentObjective) return;

    const existingIdx = currentObjective.milestones.findIndex((m) => m.id === milestone.id);
    let updatedMilestones: Milestone[];

    if (existingIdx >= 0) {
      updatedMilestones = currentObjective.milestones.map((m) =>
        m.id === milestone.id ? { ...milestone, tasks: m.tasks } : m
      );
    } else {
      updatedMilestones = [...currentObjective.milestones, milestone];
    }

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: updatedMilestones,
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    if (!confirm('Deseja realmente remover este marco e todas as suas tarefas?')) return;
    if (!currentObjective) return;

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: currentObjective.milestones.filter((m) => m.id !== milestoneId),
    };

    setObjectives((prev) =>
      prev.map((o) => (o.id === updatedObjective.id ? updatedObjective : o))
    );
  };

  // Objective Modal
  const handleOpenNewObjective = () => {
    setEditingObjective(null);
    setIsObjectiveModalOpen(true);
  };

  const handleSaveObjective = (obj: Objective) => {
    const existing = objectives.find((o) => o.id === obj.id);
    if (existing) {
      setObjectives(objectives.map((o) => (o.id === obj.id ? obj : o)));
    } else {
      setObjectives([obj, ...objectives]);
      setCurrentObjectiveId(obj.id);
    }
  };

  // Quick addition from GranularityChecker
  const handleCheckerAddSubtask = (taskId: string, title: string) => {
    if (!currentObjective) return;
    const updatedMilestones = currentObjective.milestones.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const newSub: Subtask = {
          id: `sub-${Date.now()}`,
          title,
          status: 'pending',
        };
        return { ...t, subtasks: [...t.subtasks, newSub] };
      }),
    }));

    setObjectives((prev) =>
      prev.map((o) => (o.id === currentObjective.id ? { ...o, milestones: updatedMilestones } : o))
    );
  };

  const handleCheckerAddDependency = (
    taskId: string,
    title: string,
    department: string,
    bloqueandoFluxo = true
  ) => {
    if (!currentObjective) return;
    const nowStr = new Date().toISOString().slice(0, 10);
    const newDep: Dependency = {
      id: `dep-${Date.now()}`,
      title,
      departmentOrOwner: department,
      status: 'waiting_approval',
      state: 'AGUARDANDO',
      bloqueandoFluxo,
      openedAt: nowStr,
      startDate: nowStr,
      requestDate: nowStr,
      severity: bloqueandoFluxo ? 'critical' : 'normal',
      impactNextAction: 'Liberar avanço da tarefa vinculada',
      followUps: [],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          newState: 'AGUARDANDO',
          wasBlocking: false,
          isBlocking: bloqueandoFluxo,
          note: 'Dependência cadastrada via Checador de Granularidade.',
          author: 'Checador',
        },
      ],
    };

    const updatedMilestones = currentObjective.milestones.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, dependencies: [...t.dependencies, newDep] };
      }),
    }));

    setObjectives((prev) =>
      prev.map((o) => (o.id === currentObjective.id ? { ...o, milestones: updatedMilestones } : o))
    );
  };

  // Utilities
  const handleResetDefault = () => {
    if (
      confirm(
        'Deseja restaurar os dados com os projetos de exemplo (Encerramento CFM e Congresso Nacional)?'
      )
    ) {
      const def = resetToDefault();
      setObjectives(def);
      setCurrentObjectiveId(def[0].id);
    }
  };

  const handleExportJson = () => {
    exportDataAsJson(objectives);
  };

  // Collect all tasks for the checker dropdown
  const allCurrentTasks = currentObjective
    ? currentObjective.milestones.flatMap((m) => m.tasks)
    : [];

  const currentMilestone = currentObjective?.milestones.find((m) => m.id === targetMilestoneId);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        objectives={objectives}
        currentObjectiveId={currentObjective?.id || ''}
        onSelectObjective={setCurrentObjectiveId}
        onOpenNewObjective={handleOpenNewObjective}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenChecker={() => setIsCheckerModalOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onExportJson={handleExportJson}
        onResetDefault={handleResetDefault}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner with the Operational Granularity Rule (hidden on Gantt to maximize viewport) */}
        {activeTab !== 'gantt' && (
          <GranularityRuleBanner onOpenChecker={() => setIsCheckerModalOpen(true)} />
        )}

        {/* Tab 1: Gantt Chart (Multi-Projects cross-timeline) */}
        {activeTab === 'gantt' && (
          <MultiProjectGanttView
            objectives={objectives}
            currentObjectiveId={currentObjective?.id || ''}
            onSelectObjective={setCurrentObjectiveId}
            onOpenTaskModal={handleOpenTaskModal}
            onOpenMilestoneModal={handleOpenMilestoneModal}
          />
        )}

        {/* Tab 2: TreeView (Árvore Hierárquica Operacional) */}
        {activeTab === 'tree' && currentObjective && (
          <TreeView
            objective={currentObjective}
            onOpenTaskModal={handleOpenTaskModal}
            onDeleteTask={handleDeleteTask}
            onToggleSubtask={handleToggleSubtask}
            onReorderSubtasks={handleReorderSubtasks}
            onMoveSubtask={handleMoveSubtask}
            onOpenFollowUpModal={handleOpenFollowUpModal}
            onUpdateDependencyStatus={handleUpdateDependencyStatus}
            onUpdateDependencyDetails={handleUpdateDependencyDetails}
            onAdvanceApprovalStage={handleAdvanceApprovalStage}
            onAddMilestone={() => handleOpenMilestoneModal()}
            onEditMilestone={handleOpenMilestoneModal}
            onDeleteMilestone={handleDeleteMilestone}
          />
        )}

        {/* Tab 3: Dependencies Radar */}
        {activeTab === 'radar' && currentObjective && (
          <DependenciesRadar
            objective={currentObjective}
            onOpenFollowUpModal={handleOpenFollowUpModal}
            onUpdateStatus={handleUpdateDependencyStatus}
            onUpdateDependencyDetails={handleUpdateDependencyDetails}
            onAdvanceApprovalStage={handleAdvanceApprovalStage}
          />
        )}

        {/* Tab 4: Kanban Board */}
        {activeTab === 'board' && currentObjective && (
          <TaskBoardView
            objective={currentObjective}
            onOpenTaskModal={handleOpenTaskModal}
            onOpenFollowUpModal={handleOpenFollowUpModal}
          />
        )}

        {/* Tab 5: OCs & Financial Central */}
        {activeTab === 'ocs' && currentObjective && (
          <OcManager
            objective={currentObjective}
            onOpenFollowUpModal={handleOpenFollowUpModal}
            onAdvanceApprovalStage={handleAdvanceApprovalStage}
            onUpdateSubtaskFinancialStatus={handleUpdateSubtaskFinancialStatus}
          />
        )}

        {/* Tab 6: Agenda & Cobranças Operacionais (Etapa 4) */}
        {activeTab === 'schedule' && currentObjective && (
          <OperationalScheduleView
            objective={currentObjective}
            onOpenFollowUpModal={(milestoneId, taskId, dep) => {
              handleOpenFollowUpModal(dep, 'Cobrança');
            }}
            onSelectTab={setActiveTab}
          />
        )}

        {!currentObjective && activeTab !== 'gantt' && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">Nenhum objetivo encontrado</h2>
            <button
              onClick={handleOpenNewObjective}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
            >
              Criar Novo Objetivo
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          Matriz Operacional &bull; Critério de Gestão: Ação executável direta + estado próprio +
          acompanhamento operacional.
        </p>
      </footer>

      {/* Modals */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          milestoneId={targetMilestoneId}
          milestoneTitle={currentMilestone?.title || 'Marco Operacional'}
          initialTask={editingTask}
          onSaveTask={handleSaveTask}
        />
      )}

      {isMilestoneModalOpen && (
        <MilestoneModal
          isOpen={isMilestoneModalOpen}
          onClose={() => setIsMilestoneModalOpen(false)}
          onSave={handleSaveMilestone}
          initialMilestone={editingMilestone}
        />
      )}

      <ObjectiveModal
        isOpen={isObjectiveModalOpen}
        onClose={() => setIsObjectiveModalOpen(false)}
        onSave={handleSaveObjective}
        initialObjective={editingObjective}
      />

      <GranularityCheckerModal
        isOpen={isCheckerModalOpen}
        onClose={() => setIsCheckerModalOpen(false)}
        tasks={allCurrentTasks}
        onAddSubtask={handleCheckerAddSubtask}
        onAddDependency={handleCheckerAddDependency}
      />

      <FollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        dependency={selectedDependency}
        taskTitle={selectedTaskTitle}
        objectiveTitle={currentObjective?.title}
        onSaveFollowUp={handleSaveFollowUp}
        onUpdateStatus={(depId, newStatus) => {
          if (!currentObjective) return;
          currentObjective.milestones.forEach((m) => {
            m.tasks.forEach((t) => {
              if (t.dependencies.some((d) => d.id === depId)) {
                handleUpdateDependencyStatus(m.id, t.id, depId, newStatus);
              }
            });
          });
        }}
      />

      {currentObjective && (
        <ExecutiveSummaryModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          objective={currentObjective}
        />
      )}
    </div>
  );
}
