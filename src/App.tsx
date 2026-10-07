/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Objective, Milestone, Task, Subtask, Dependency } from './types';
import { loadObjectives, saveObjectives, resetToDefault, exportDataAsJson } from './utils/storage';
import { getObjectiveStats } from './utils/helpers';
import { createDefaultApprovalStages } from './utils/approvalRules';
import { Navbar } from './components/Navbar';
import { GranularityRuleBanner } from './components/GranularityRuleBanner';
import { TreeView } from './components/TreeView';
import { DependenciesRadar } from './components/DependenciesRadar';
import { TaskBoardView } from './components/TaskBoardView';
import { OcManager } from './components/OcManager';
import { TaskModal } from './components/TaskModal';
import { ObjectiveModal } from './components/ObjectiveModal';
import { GranularityCheckerModal } from './components/GranularityCheckerModal';
import { FollowUpModal } from './components/FollowUpModal';
import { ExecutiveSummaryModal } from './components/ExecutiveSummaryModal';

export default function App() {
  const [objectives, setObjectives] = useState<Objective[]>(() => loadObjectives());
  const [currentObjectiveId, setCurrentObjectiveId] = useState<string>(() => {
    const list = loadObjectives();
    return list[0]?.id || 'obj-cfm-0310';
  });
  const [activeTab, setActiveTab] = useState<'tree' | 'radar' | 'board' | 'ocs'>('tree');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [targetMilestoneId, setTargetMilestoneId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  const [isCheckerModalOpen, setIsCheckerModalOpen] = useState(false);

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<Dependency | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Persist to localStorage whenever objectives change
  useEffect(() => {
    saveObjectives(objectives);
  }, [objectives]);

  const currentObjective =
    objectives.find((o) => o.id === currentObjectiveId) || objectives[0] || null;

  // Task Management
  const handleOpenTaskModal = (milestoneId: string, task?: Task) => {
    setTargetMilestoneId(milestoneId);
    setEditingTask(task || null);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (milestoneId: string, task: Task) => {
    if (!currentObjective) return;

    const updatedMilestones = currentObjective.milestones.map((m) => {
      if (m.id !== milestoneId) return m;

      const existingIdx = m.tasks.findIndex((t) => t.id === task.id);
      let updatedTasks = [...m.tasks];
      if (existingIdx >= 0) {
        updatedTasks[existingIdx] = task;
      } else {
        updatedTasks.push(task);
      }
      return { ...m, tasks: updatedTasks };
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

  // Reorder Subtasks (after saved)
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

  // Dependency Status Update
  const handleUpdateDependencyStatus = (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    status: Dependency['status']
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
            dependencies: t.dependencies.map((d) => {
              if (d.id !== dependencyId) return d;
              return { ...d, status };
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

              return {
                ...d,
                approvalStages: stages,
                departmentOrOwner: nextUnapproved ? nextUnapproved.level : d.departmentOrOwner,
                status: (allDone ? 'cleared' : 'waiting_approval') as Dependency['status'],
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

  const handleSaveFollowUp = (dependencyId: string, note: string, author?: string) => {
    if (!currentObjective) return;

    const newLog = {
      id: `flw-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      note,
      author: author || 'Operações',
    };

    const updatedMilestones = currentObjective.milestones.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) => ({
        ...t,
        dependencies: t.dependencies.map((d) => {
          if (d.id !== dependencyId) return d;
          return {
            ...d,
            followUps: [...(d.followUps || []), newLog],
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
  const handleAddMilestone = () => {
    const title = prompt('Digite o nome do novo marco / entregável (ex: Credenciamento liberado):');
    if (!title?.trim() || !currentObjective) return;

    const newM: Milestone = {
      id: `mil-${Date.now()}`,
      title: title.trim(),
      tasks: [],
    };

    const updatedObjective: Objective = {
      ...currentObjective,
      milestones: [...currentObjective.milestones, newM],
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

  const handleCheckerAddDependency = (taskId: string, title: string, department: string) => {
    if (!currentObjective) return;
    const updatedMilestones = currentObjective.milestones.map((m) => ({
      ...m,
      tasks: m.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const newDep: Dependency = {
          id: `dep-${Date.now()}`,
          title,
          departmentOrOwner: department,
          status: 'waiting_approval',
          severity: 'critical',
          followUps: [],
        };
        return { ...t, dependencies: [...t.dependencies, newDep] };
      }),
    }));

    setObjectives((prev) =>
      prev.map((o) => (o.id === currentObjective.id ? { ...o, milestones: updatedMilestones } : o))
    );
  };

  // Utilities
  const handleResetDefault = () => {
    if (confirm('Deseja restaurar os dados para o exemplo inicial do Encerramento CFM — 03/10?')) {
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
        {/* Banner with the Operational Granularity Rule */}
        <GranularityRuleBanner onOpenChecker={() => setIsCheckerModalOpen(true)} />

        {currentObjective ? (
          <>
            {activeTab === 'tree' && (
              <TreeView
                objective={currentObjective}
                onOpenTaskModal={handleOpenTaskModal}
                onDeleteTask={handleDeleteTask}
                onToggleSubtask={handleToggleSubtask}
                onReorderSubtasks={handleReorderSubtasks}
                onMoveSubtask={handleMoveSubtask}
                onOpenFollowUpModal={handleOpenFollowUpModal}
                onUpdateDependencyStatus={handleUpdateDependencyStatus}
                onAdvanceApprovalStage={handleAdvanceApprovalStage}
                onAddMilestone={handleAddMilestone}
                onDeleteMilestone={handleDeleteMilestone}
              />
            )}

            {activeTab === 'radar' && (
              <DependenciesRadar
                objective={currentObjective}
                onOpenFollowUpModal={handleOpenFollowUpModal}
                onUpdateStatus={handleUpdateDependencyStatus}
                onAdvanceApprovalStage={handleAdvanceApprovalStage}
              />
            )}

            {activeTab === 'board' && (
              <TaskBoardView
                objective={currentObjective}
                onOpenTaskModal={handleOpenTaskModal}
                onOpenFollowUpModal={handleOpenFollowUpModal}
              />
            )}

            {activeTab === 'ocs' && (
              <OcManager
                objective={currentObjective}
                onOpenFollowUpModal={handleOpenFollowUpModal}
                onAdvanceApprovalStage={handleAdvanceApprovalStage}
              />
            )}
          </>
        ) : (
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
          Matriz Operacional &bull; Critério de Gestão: Ação executável direta + estado próprio + acompanhamento ou potencial de bloqueio.
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
          // Locate dependency in objective and update
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
