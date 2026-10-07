import React from 'react';
import { Task, Objective, Milestone, Dependency } from '../types';
import { getTaskEffectiveStatus, formatCurrencyBRL } from '../utils/helpers';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, Plus, MessageSquare } from 'lucide-react';

interface TaskBoardViewProps {
  objective: Objective;
  onOpenTaskModal: (milestoneId: string, task?: Task) => void;
  onOpenFollowUpModal: (dependency: Dependency, taskTitle: string) => void;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  objective,
  onOpenTaskModal,
  onOpenFollowUpModal,
}) => {
  // Collect tasks mapped with their milestone
  const notStartedTasks: { task: Task; milestone: Milestone }[] = [];
  const inProgressTasks: { task: Task; milestone: Milestone }[] = [];
  const blockedTasks: { task: Task; milestone: Milestone }[] = [];
  const completedTasks: { task: Task; milestone: Milestone }[] = [];

  objective.milestones.forEach((m) => {
    m.tasks.forEach((t) => {
      const status = getTaskEffectiveStatus(t);
      if (status === 'blocked') blockedTasks.push({ task: t, milestone: m });
      else if (status === 'completed') completedTasks.push({ task: t, milestone: m });
      else if (status === 'in_progress') inProgressTasks.push({ task: t, milestone: m });
      else notStartedTasks.push({ task: t, milestone: m });
    });
  });

  const columns = [
    {
      id: 'not_started',
      title: 'Não Iniciadas',
      count: notStartedTasks.length,
      items: notStartedTasks,
      borderTop: 'border-slate-400',
      badgeBg: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'in_progress',
      title: 'Em Andamento',
      count: inProgressTasks.length,
      items: inProgressTasks,
      borderTop: 'border-blue-500',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'blocked',
      title: 'Bloqueadas por Terceiros',
      count: blockedTasks.length,
      items: blockedTasks,
      borderTop: 'border-rose-500',
      badgeBg: 'bg-rose-100 text-rose-800',
      isWarning: true,
    },
    {
      id: 'completed',
      title: 'Concluídas',
      count: completedTasks.length,
      items: completedTasks,
      borderTop: 'border-emerald-500',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top note */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Quadro de Execução & Bloqueios</h2>
          <p className="text-xs text-slate-500">
            Tarefas agrupadas pelo estado real de entrega. Itens na coluna &ldquo;Bloqueadas por Terceiros&rdquo; aguardam aprovação ou liberação externa.
          </p>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`bg-slate-100/90 rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 ${
              col.isWarning ? 'ring-1 ring-rose-200 bg-rose-50/20' : ''
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.borderTop.replace('border-', 'bg-')}`} />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  {col.title}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}>
                {col.count}
              </span>
            </div>

            {/* Task Cards */}
            <div className="space-y-3 min-h-32">
              {col.items.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  Nenhuma tarefa nesta coluna
                </div>
              ) : (
                col.items.map(({ task, milestone }) => {
                  const waitingDeps = task.dependencies.filter(
                    (d) => d.status === 'waiting_approval' || d.status === 'blocked'
                  );
                  const completedSubs = task.subtasks.filter((s) => s.status === 'completed').length;

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onOpenTaskModal(milestone.id, task)}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-indigo-600 truncate max-w-[130px]">
                          {milestone.title}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {task.category}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {task.title}
                      </h4>

                      {(task.startDate || task.deadline) && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {task.startDate ? `${task.startDate} ➔ ` : ''}
                            {task.deadline || task.endDate}
                          </span>
                        </div>
                      )}

                      {/* Subtasks progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Subtarefas</span>
                          <span>
                            {completedSubs}/{task.subtasks.length}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all"
                            style={{
                              width: `${
                                task.subtasks.length > 0
                                  ? (completedSubs / task.subtasks.length) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Dependencies alerts */}
                      {waitingDeps.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                          <div className="flex items-center gap-1 font-bold text-amber-900 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Aguardando Terceiro:</span>
                          </div>
                          {waitingDeps.map((d) => (
                            <div key={d.id} className="text-[11px] text-amber-800">
                              • <strong>{d.departmentOrOwner}</strong> ({d.title})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
