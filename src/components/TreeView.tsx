import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  DollarSign,
  User,
  ArrowRight,
  MessageSquare,
  Sparkles,
  GripVertical,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { Objective, Milestone, Task, Subtask, Dependency } from '../types';
import { getMilestoneProgress, getDependencyStatusLabel, getSeverityLabel, formatCurrencyBRL } from '../utils/helpers';
import { ApprovalChainBadge } from './ApprovalChainBadge';

interface TreeViewProps {
  objective: Objective;
  onOpenTaskModal: (milestoneId: string, task?: Task) => void;
  onDeleteTask: (milestoneId: string, taskId: string) => void;
  onToggleSubtask: (milestoneId: string, taskId: string, subtaskId: string) => void;
  onReorderSubtasks?: (milestoneId: string, taskId: string, startIndex: number, endIndex: number) => void;
  onMoveSubtask?: (milestoneId: string, taskId: string, subtaskId: string, direction: 'up' | 'down') => void;
  onOpenFollowUpModal: (dependency: Dependency, taskTitle: string) => void;
  onUpdateDependencyStatus: (milestoneId: string, taskId: string, dependencyId: string, status: Dependency['status']) => void;
  onAdvanceApprovalStage?: (milestoneId: string, taskId: string, dependencyId: string, stageIndex: number) => void;
  onAddMilestone: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone: (milestoneId: string) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  objective,
  onOpenTaskModal,
  onDeleteTask,
  onToggleSubtask,
  onReorderSubtasks,
  onMoveSubtask,
  onOpenFollowUpModal,
  onUpdateDependencyStatus,
  onAdvanceApprovalStage,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
}) => {
  // Collapsible state for milestones
  const [collapsedMilestones, setCollapsedMilestones] = useState<Record<string, boolean>>({});

  // Drag and drop state for subtasks reordering
  const [dragItem, setDragItem] = useState<{ milestoneId: string; taskId: string; index: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const toggleMilestone = (milestoneId: string) => {
    setCollapsedMilestones((prev) => ({
      ...prev,
      [milestoneId]: !prev[milestoneId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Root Node: OBJETIVO */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Objective Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                NÍVEL 1: OBJETIVO OPERACIONAL
              </span>
              <span className="text-xs text-indigo-200/80">
                {objective.category}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{objective.title}</span>
            </h1>
            {objective.description && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                {objective.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-start md:self-center shrink-0 flex-wrap">
            <div className="px-3.5 py-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-right">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                Período do Projeto
              </span>
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 justify-end">
                <Calendar className="w-4 h-4 text-amber-400" />
                {objective.startDate ? `${objective.startDate} ➔ ` : ''}
                {objective.eventDate ? objective.eventDate : 'Sem data'}
              </span>
            </div>

            <button
              onClick={onAddMilestone}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Marco</span>
            </button>
          </div>
        </div>

        {/* Milestones list (MARCO) */}
        <div className="p-4 sm:p-6 space-y-8 bg-slate-50/50">
          {objective.milestones.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-white">
              <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-semibold text-sm">Nenhum marco cadastrado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">
                Adicione entregáveis como &ldquo;Infraestrutura contratada&rdquo; ou &ldquo;Espaço pronto&rdquo;.
              </p>
              <button
                onClick={onAddMilestone}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                + Adicionar Primeiro Marco
              </button>
            </div>
          ) : (
            objective.milestones.map((milestone, mIdx) => {
              const progress = getMilestoneProgress(milestone);
              const isCollapsed = collapsedMilestones[milestone.id];

              return (
                <div
                  key={milestone.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* Marco Header */}
                  <div className="p-4 sm:p-5 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleMilestone(milestone.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-100">
                            MARCO {mIdx + 1}
                          </span>
                          {(milestone.startDate || milestone.targetDate) && (
                            <span className="text-xs text-slate-600 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              {milestone.startDate ? `${milestone.startDate} ➔ ` : ''}
                              Meta: {milestone.targetDate || milestone.endDate || 'Sem meta'}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                          {milestone.title}
                        </h2>
                        {milestone.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{milestone.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-8 sm:pl-0 flex-wrap">
                      {/* Milestone Progress pill */}
                      <div className="flex items-center gap-2 mr-2">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 min-w-8">
                          {progress}%
                        </span>
                      </div>

                      {onEditMilestone && (
                        <button
                          onClick={() => onEditMilestone(milestone)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Editar período e dados do marco"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Editar Marco</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenTaskModal(milestone.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova Tarefa</span>
                      </button>

                      <button
                        onClick={() => onDeleteMilestone(milestone.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Excluir marco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tasks inside this Marco */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-5 space-y-5">
                      {milestone.tasks.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                          <p className="text-xs text-slate-500">Nenhuma tarefa neste marco.</p>
                          <button
                            onClick={() => onOpenTaskModal(milestone.id)}
                            className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            + Criar Tarefa Operacional (ex: Climatizadores)
                          </button>
                        </div>
                      ) : (
                        milestone.tasks.map((task) => {
                          const completedSubs = task.subtasks.filter((s) => s.status === 'completed').length;
                          const totalSubs = task.subtasks.length;
                          const hasActiveBlocker = task.dependencies.some(
                            (d) => d.status === 'blocked' || d.status === 'waiting_approval'
                          );

                          return (
                            <div
                              key={task.id}
                              className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden"
                            >
                              {/* Task Card Header */}
                              <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      TAREFA
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">
                                      {task.category}
                                    </span>

                                    {/* Task period badge */}
                                    {(task.startDate || task.deadline) && (
                                      <span className="text-[11px] font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-indigo-600" />
                                        {task.startDate ? `${task.startDate} ➔ ` : ''}
                                        {task.deadline || task.endDate}
                                      </span>
                                    )}

                                    {hasActiveBlocker && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Possui Bloqueio Externo
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    {task.title}
                                  </h3>
                                  {task.description && (
                                    <p className="text-xs text-slate-600">{task.description}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <span className="text-xs font-semibold text-slate-500">
                                    {completedSubs}/{totalSubs} subtarefas
                                  </span>
                                  <button
                                    onClick={() => onOpenTaskModal(milestone.id, task)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                                    title="Editar tarefa"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteTask(milestone.id, task.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                    title="Excluir tarefa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Task Inner: Subtarefas Executáveis + Dependências */}
                              <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Left Col: SUBTAREFAS (7 cols) */}
                                <div className="lg:col-span-7 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      SUBTAREFAS EXECUTÁVEIS (Estado Independente)
                                    </span>
                                    {task.subtasks.length > 1 && (
                                      <span className="text-[10px] text-indigo-600/80 font-medium hidden sm:inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                        <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                                        Arraste ou use ↑↓ para reordenar
                                      </span>
                                    )}
                                  </div>

                                  {task.subtasks.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">
                                      Nenhuma subtarefa criada.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {task.subtasks.map((sub, sIdx) => {
                                        const isDone = sub.status === 'completed';
                                        const isInProg = sub.status === 'in_progress';
                                        const isCurrentDragging =
                                          dragItem?.milestoneId === milestone.id &&
                                          dragItem?.taskId === task.id &&
                                          dragItem?.index === sIdx;
                                        const isCurrentOver =
                                          dragItem?.milestoneId === milestone.id &&
                                          dragItem?.taskId === task.id &&
                                          dragOverIdx === sIdx &&
                                          dragItem?.index !== sIdx;

                                        return (
                                          <div
                                            key={sub.id}
                                            draggable
                                            onDragStart={(e) => {
                                              setDragItem({
                                                milestoneId: milestone.id,
                                                taskId: task.id,
                                                index: sIdx,
                                              });
                                              e.dataTransfer.setData('text/plain', sIdx.toString());
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              if (dragOverIdx !== sIdx) setDragOverIdx(sIdx);
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              if (
                                                dragItem &&
                                                dragItem.milestoneId === milestone.id &&
                                                dragItem.taskId === task.id &&
                                                dragItem.index !== sIdx
                                              ) {
                                                onReorderSubtasks?.(
                                                  milestone.id,
                                                  task.id,
                                                  dragItem.index,
                                                  sIdx
                                                );
                                              }
                                              setDragItem(null);
                                              setDragOverIdx(null);
                                            }}
                                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                                              isCurrentDragging
                                                ? 'opacity-40 border-indigo-400 bg-indigo-50/60 scale-[0.99]'
                                                : isCurrentOver
                                                ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/40'
                                                : isDone
                                                ? 'bg-slate-50/80 border-slate-200 text-slate-500'
                                                : isInProg
                                                ? 'bg-blue-50/50 border-blue-200 text-slate-800'
                                                : 'bg-white border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              {/* Drag handle */}
                                              <div
                                                className="text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 transition-colors shrink-0"
                                                title="Arraste para reordenar esta subtarefa"
                                              >
                                                <GripVertical className="w-3.5 h-3.5" />
                                              </div>

                                              {/* Sequence number */}
                                              <span className="text-[11px] font-bold text-slate-400 w-4 text-left shrink-0">
                                                {sIdx + 1}.
                                              </span>

                                              {/* Checkbox status toggle */}
                                              <button
                                                onClick={() =>
                                                  onToggleSubtask(milestone.id, task.id, sub.id)
                                                }
                                                className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 border transition-all ${
                                                  isDone
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : isInProg
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'border-slate-300 hover:border-indigo-500'
                                                }`}
                                                title="Clique para alternar estado (Pendente -> Concluído)"
                                              >
                                                {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                {isInProg && <span className="text-[9px] font-bold">~</span>}
                                              </button>

                                              {/* Title & metadata */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span
                                                    className={`font-medium ${
                                                      isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                                    }`}
                                                  >
                                                    {sub.title}
                                                  </span>

                                                  {/* Date period on subtask */}
                                                  {(sub.startDate || sub.dueDate) && (
                                                    <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                                      {sub.startDate ? `${sub.startDate} ➔ ` : ''}{sub.dueDate || sub.endDate}
                                                    </span>
                                                  )}

                                                  {sub.ocNumber && (
                                                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-semibold border border-purple-200">
                                                      {sub.ocNumber}
                                                    </span>
                                                  )}

                                                  {sub.orderCost && (
                                                    <span className="text-[10px] text-emerald-700 font-bold">
                                                      {formatCurrencyBRL(sub.orderCost)}
                                                    </span>
                                                  )}

                                                  {/* Indication of blocking dependency */}
                                                  {(() => {
                                                    const blockingDep = task.dependencies.find(
                                                      (d) => d.linkedSubtaskId === sub.id
                                                    );
                                                    if (!blockingDep) return null;
                                                    const isCleared = blockingDep.status === 'cleared';
                                                    return (
                                                      <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                          isCleared
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                            : 'bg-amber-100 text-amber-900 border-amber-300'
                                                        }`}
                                                        title={`Dependência: ${blockingDep.title} (${blockingDep.departmentOrOwner})`}
                                                      >
                                                        {isCleared ? '✓ Desbloqueado por:' : '🔒 Aguarda:'}{' '}
                                                        {blockingDep.departmentOrOwner}
                                                      </span>
                                                    );
                                                  })()}
                                                </div>

                                                {sub.notes && (
                                                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                                    {sub.notes}
                                                  </p>
                                                )}
                                              </div>
                                            </div>

                                            {/* Micro-actions: up/down controls */}
                                            {onMoveSubtask && (
                                              <div className="flex items-center gap-0.5 shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                                                <button
                                                  disabled={sIdx === 0}
                                                  onClick={() =>
                                                    onMoveSubtask(milestone.id, task.id, sub.id, 'up')
                                                  }
                                                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                                                  title="Subir na sequência"
                                                >
                                                  <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                  disabled={sIdx === task.subtasks.length - 1}
                                                  onClick={() =>
                                                    onMoveSubtask(milestone.id, task.id, sub.id, 'down')
                                                  }
                                                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                                                  title="Descer na sequência"
                                                >
                                                  <ChevronDown className="w-3 h-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Right Col: DEPENDÊNCIAS & BLOQUEIOS (5 cols) */}
                                <div className="lg:col-span-5 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                      DEPENDÊNCIAS & BLOQUEIOS (Terceiros / Alçadas)
                                    </span>
                                  </div>

                                  {task.dependencies.length === 0 ? (
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                                      <p className="text-xs text-slate-400">
                                        Nenhum bloqueio ou dependência externa ativa.
                                      </p>
                                      <button
                                        onClick={() => onOpenTaskModal(milestone.id, task)}
                                        className="mt-1 text-[11px] text-indigo-600 font-semibold hover:underline"
                                      >
                                        + Adicionar Dependência Externa
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {task.dependencies.map((dep) => {
                                        const statusInfo = getDependencyStatusLabel(dep.status);
                                        const isCleared = dep.status === 'cleared';

                                        return (
                                          <div
                                            key={dep.id}
                                            className={`p-3 rounded-xl border text-xs transition-all ${
                                              isCleared
                                                ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                                                : dep.status === 'blocked'
                                                ? 'bg-rose-50/70 border-rose-300 text-slate-900'
                                                : 'bg-amber-50/60 border-amber-300/80 text-slate-900'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                              <span className="font-bold text-slate-900">
                                                {dep.title}
                                              </span>
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusInfo.badgeClass}`}
                                              >
                                                {statusInfo.label}
                                              </span>
                                            </div>

                                            <div className="space-y-1 text-slate-600 mb-2">
                                              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                                <Building2 className="w-3 h-3 text-indigo-500" />
                                                <span>{dep.departmentOrOwner}</span>
                                              </div>
                                              {(dep.startDate || dep.requestDate || dep.slaDeadline || dep.endDate) && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                  <Clock className="w-3 h-3 text-amber-500" />
                                                  <span>
                                                    Período SLA: <strong className="text-slate-800">{dep.startDate || dep.requestDate || 'Início'} ➔ {dep.endDate || dep.slaDeadline || 'Prazo'}</strong>
                                                  </span>
                                                </div>
                                              )}
                                              {dep.notes && (
                                                <p className="text-[11px] text-slate-600 mt-1 italic">
                                                  &ldquo;{dep.notes}&rdquo;
                                                </p>
                                              )}

                                              {/* Explicit link to locked subtask */}
                                              {(() => {
                                                const linkedSub = task.subtasks.find(
                                                  (s) => s.id === dep.linkedSubtaskId
                                                );
                                                if (!linkedSub) return null;
                                                return (
                                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-900 bg-amber-100/80 px-2 py-1 rounded-md border border-amber-300 mt-1">
                                                    <span>🔒 Bloqueia especificamente:</span>
                                                    <strong className="text-slate-900">
                                                      &ldquo;{linkedSub.title}&rdquo;
                                                    </strong>
                                                  </div>
                                                );
                                              })()}
                                            </div>

                                            {/* Approval Stages Stepper if present */}
                                            {dep.approvalStages && dep.approvalStages.length > 0 && (
                                              <div className="pt-2 pb-1 border-t border-slate-200/60">
                                                <ApprovalChainBadge
                                                  stages={dep.approvalStages}
                                                  interactive={true}
                                                  onAdvanceStage={(stageIdx) => {
                                                    onAdvanceApprovalStage?.(
                                                      milestone.id,
                                                      task.id,
                                                      dep.id,
                                                      stageIdx
                                                    );
                                                  }}
                                                />
                                              </div>
                                            )}

                                            {/* Action bar for dependency */}
                                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                              <button
                                                onClick={() => onOpenFollowUpModal(dep, task.title)}
                                                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-md border border-slate-300 font-semibold text-[11px] shadow-2xs transition-colors"
                                              >
                                                <MessageSquare className="w-3 h-3 text-indigo-600" />
                                                <span>Cobrança / Follow-up ({dep.followUps?.length || 0})</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  const nextStatus =
                                                    dep.status === 'cleared'
                                                      ? 'waiting_approval'
                                                      : 'cleared';
                                                  onUpdateDependencyStatus(
                                                    milestone.id,
                                                    task.id,
                                                    dep.id,
                                                    nextStatus
                                                  );
                                                }}
                                                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                                                  isCleared
                                                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                }`}
                                              >
                                                {isCleared ? 'Reabrir Bloqueio' : 'Marcar Liberado'}
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
