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
  Lock,
  Unlock,
  Check,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Objective,
  Milestone,
  Task,
  Subtask,
  Dependency,
  DependencyLifecycleState,
  FinancialStatus,
} from '../types';
import {
  getObjectiveStats,
  getMilestoneOperationalMetrics,
  getTaskOperationalStats,
  getDependencyLifecycle,
  getDependencyWaitingTimeDays,
  formatCurrencyBRL,
  getSeverityLabel,
} from '../utils/helpers';
import { ApprovalChainBadge } from './ApprovalChainBadge';

interface TreeViewProps {
  objective: Objective;
  onOpenTaskModal: (milestoneId: string, task?: Task) => void;
  onDeleteTask: (milestoneId: string, taskId: string) => void;
  onToggleSubtask: (milestoneId: string, taskId: string, subtaskId: string) => void;
  onReorderSubtasks?: (milestoneId: string, taskId: string, startIndex: number, endIndex: number) => void;
  onMoveSubtask?: (milestoneId: string, taskId: string, subtaskId: string, direction: 'up' | 'down') => void;
  onOpenFollowUpModal: (dependency: Dependency, taskTitle: string) => void;
  onUpdateDependencyStatus: (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    status: Dependency['status']
  ) => void;
  onUpdateDependencyDetails?: (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    updates: Partial<Dependency>
  ) => void;
  onAdvanceApprovalStage?: (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    stageIndex: number
  ) => void;
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
  onUpdateDependencyDetails,
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

  // Indicadores operacionais derivados dinamicamente
  const stats = getObjectiveStats(objective);

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
              <span className="text-xs text-indigo-200/80">{objective.category}</span>
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

        {/* PAINEL DE RESUMO OPERACIONAL INTEGRADO (Item 8) */}
        <div className="bg-slate-900/95 border-t border-b border-indigo-900/50 p-4 sm:p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Resumo Operacional do Objetivo
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Indicadores calculados dinamicamente da matriz
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Marcos */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Marcos
              </span>
              <div className="text-lg font-black text-white">
                {stats.completedMilestones}
                <span className="text-sm font-medium text-slate-400">/{stats.totalMilestones}</span>
              </div>
              <div className="text-[10px] text-indigo-300 font-medium mt-0.5">
                {stats.totalMilestones > 0
                  ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100)
                  : 0}
                % concluídos
              </div>
            </div>

            {/* Tarefas */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Tarefas
              </span>
              <div className="text-lg font-black text-white">
                {stats.completedTasks}
                <span className="text-sm font-medium text-slate-400">/{stats.totalTasks}</span>
              </div>
              <div className="text-[10px] text-indigo-300 font-medium mt-0.5">
                {stats.totalTasks > 0
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                  : 0}
                % concluídas
              </div>
            </div>

            {/* Subtarefas */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Subtarefas
              </span>
              <div className="text-lg font-black text-white">
                {stats.completedSubtasks}
                <span className="text-sm font-medium text-slate-400">/{stats.totalSubtasks}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                {stats.progressPercent}% executadas
              </div>
            </div>

            {/* Dependências Externas Breakdown */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-0.5">
                Dependências ({stats.totalDependencies})
              </span>
              <div className="text-xs space-y-0.5 mt-1 font-medium text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 font-bold">{stats.aguardandoDependencies} aguardando</span>
                  <span className="text-amber-300 font-bold">{stats.emRiscoDependencies} em risco</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">
                    {stats.bloqueandoDependencies} bloqueando
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {stats.atendidasDependencies} atendidas
                  </span>
                </div>
              </div>
            </div>

            {/* Financeiro Consolidado */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block mb-0.5">
                Financeiro
              </span>
              <div className="text-xs space-y-0.5 mt-1 font-medium">
                <div className="flex justify-between text-slate-300">
                  <span>Previsto:</span>
                  <strong className="text-white">
                    {formatCurrencyBRL(stats.financial.totalPrevisto)}
                  </strong>
                </div>
                <div className="flex justify-between text-blue-300">
                  <span>Aprovado:</span>
                  <strong>{formatCurrencyBRL(stats.financial.aprovado)}</strong>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Pago:</span>
                  <strong>{formatCurrencyBRL(stats.financial.pago)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones list (MARCO) */}
        <div className="p-4 sm:p-6 space-y-8 bg-slate-50/50">
          {objective.milestones.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-white">
              <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-semibold text-sm">Nenhum marco cadastrado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">
                Adicione entregáveis como &ldquo;Infraestrutura contratada&rdquo; ou &ldquo;Espaço
                pronto&rdquo;.
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
              const mMetrics = getMilestoneOperationalMetrics(milestone);
              const isCollapsed = collapsedMilestones[milestone.id];

              return (
                <div
                  key={milestone.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* Marco Header - Evoluído (Item 4) */}
                  <div className="p-4 sm:p-5 bg-slate-100/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleMilestone(milestone.id)}
                        className="p-1 mt-0.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-100">
                            MARCO {mIdx + 1}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              mMetrics.status === 'Concluído'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : mMetrics.status === 'Atrasado'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            Status: {mMetrics.status}
                          </span>

                          {/* Situação do Prazo */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              mMetrics.deadlineSituation.includes('Atrasado')
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : mMetrics.deadlineSituation.includes('risco')
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Situação: {mMetrics.deadlineSituation}
                          </span>

                          {/* Prazo planejado e Conclusão */}
                          {(milestone.startDate || milestone.targetDate) && (
                            <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              Prazo:{' '}
                              <strong>
                                {milestone.targetDate || milestone.endDate || 'A definir'}
                              </strong>
                              {milestone.completedAt && (
                                <span className="text-emerald-700 ml-1">
                                  • Concluído em: <strong>{milestone.completedAt}</strong>
                                </span>
                              )}
                            </span>
                          )}

                          {/* Alerta de Bloqueio Ativo no Marco */}
                          {mMetrics.hasBlocker && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {mMetrics.activeBlockers} Bloqueio(s) ativo(s)
                            </span>
                          )}
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          {milestone.title}
                        </h2>
                        {milestone.description && (
                          <p className="text-xs text-slate-500">{milestone.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-8 lg:pl-0 flex-wrap justify-between lg:justify-end">
                      {/* Resumo Rápido de Tarefas e Dependências do Marco */}
                      <div className="text-right text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Progresso das tarefas:</span>
                          <strong className="text-slate-800">
                            {mMetrics.completedTasks}/{mMetrics.totalTasks} tarefas (
                            {mMetrics.progressPercent}%)
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span>Dependências ativas: </span>
                          <strong className="text-amber-800">
                            {mMetrics.activeDependencies}
                          </strong>{' '}
                          • <span>Bloqueios: </span>
                          <strong
                            className={
                              mMetrics.activeBlockers > 0 ? 'text-rose-600' : 'text-slate-700'
                            }
                          >
                            {mMetrics.activeBlockers}
                          </strong>
                        </div>
                      </div>

                      {/* Milestone Progress bar */}
                      <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            mMetrics.progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${mMetrics.progressPercent}%` }}
                        />
                      </div>

                      {onEditMilestone && (
                        <button
                          onClick={() => onEditMilestone(milestone)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Editar marco e prazo planejado"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Editar</span>
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
                          const taskStats = getTaskOperationalStats(task);

                          return (
                            <div
                              key={task.id}
                              className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden"
                            >
                              {/* Task Card Header - Atualizado (Item 3) */}
                              <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
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

                                    {taskStats.hasActiveBlocker && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                                        Bloqueando Fluxo ({taskStats.bloqueando})
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    {task.title}
                                  </h3>
                                  {task.description && (
                                    <p className="text-xs text-slate-600">{task.description}</p>
                                  )}

                                  {/* Resumo Rápido da Tarefa: Subtarefas + Dependências (Item 3) */}
                                  <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                                    <span className="font-semibold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded">
                                      {taskStats.completedSubtasks}/{taskStats.totalSubtasks}{' '}
                                      subtarefas
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span className="font-medium text-slate-600">
                                      Dependências:
                                    </span>
                                    <span className="text-blue-700 font-bold">
                                      {taskStats.aguardando} aguardando
                                    </span>
                                    {taskStats.emRisco > 0 && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-amber-700 font-bold">
                                          {taskStats.emRisco} em risco
                                        </span>
                                      </>
                                    )}
                                    {taskStats.bloqueando > 0 && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-rose-700 font-bold">
                                          {taskStats.bloqueando} bloqueando
                                        </span>
                                      </>
                                    )}
                                    <span className="text-slate-300">•</span>
                                    <span className="text-emerald-700 font-bold">
                                      {taskStats.atendidas} atendidas
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center">
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

                              {/* Task Inner: Subtarefas Executáveis de um lado + Dependências Externas do outro */}
                              <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Left Col: SUBTAREFAS EXECUTÁVEIS (7 cols) */}
                                <div className="lg:col-span-7 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      SUBTAREFAS EXECUTÁVEIS (Ação direta da equipe)
                                    </span>
                                    {task.subtasks.length > 1 && (
                                      <span className="text-[10px] text-indigo-600/80 font-medium hidden sm:inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                        <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                                        Arraste ou use ↑↓
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
                                                {isInProg && (
                                                  <span className="text-[9px] font-bold">~</span>
                                                )}
                                              </button>

                                              {/* Title & metadata */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span
                                                    className={`font-medium ${
                                                      isDone
                                                        ? 'line-through text-slate-400'
                                                        : 'text-slate-900'
                                                    }`}
                                                  >
                                                    {sub.title}
                                                  </span>

                                                  {/* Date period */}
                                                  {(sub.startDate || sub.dueDate) && (
                                                    <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                                      {sub.startDate ? `${sub.startDate} ➔ ` : ''}
                                                      {sub.dueDate || sub.endDate}
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

                                                  {/* Indication of linked dependency */}
                                                  {(() => {
                                                    const linkedDep = task.dependencies.find(
                                                      (d) => d.linkedSubtaskId === sub.id
                                                    );
                                                    if (!linkedDep) return null;
                                                    const { state, isBlocking } =
                                                      getDependencyLifecycle(linkedDep);
                                                    const isAttended = state === 'ATENDIDA';

                                                    return (
                                                      <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                          isAttended
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                            : isBlocking
                                                            ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                                            : 'bg-amber-100 text-amber-900 border-amber-300'
                                                        }`}
                                                        title={`Dependência: ${linkedDep.title} (${linkedDep.departmentOrOwner})`}
                                                      >
                                                        {isAttended ? (
                                                          <>
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                            Liberado por: {linkedDep.departmentOrOwner}
                                                          </>
                                                        ) : isBlocking ? (
                                                          <>
                                                            <Lock className="w-3 h-3 text-rose-600" />
                                                            Bloqueado por: {linkedDep.departmentOrOwner}
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                            Aguarda: {linkedDep.departmentOrOwner}
                                                          </>
                                                        )}
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
                                                    onMoveSubtask(
                                                      milestone.id,
                                                      task.id,
                                                      sub.id,
                                                      'down'
                                                    )
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

                                {/* Right Col: DEPENDÊNCIAS EXTERNAS - Atualizado (Itens 1 e 2) */}
                                <div className="lg:col-span-5 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                        DEPENDÊNCIAS EXTERNAS
                                      </span>
                                      <span className="text-[10px] text-amber-900/70 block">
                                        Relação operacional transversal • Não pertence à hierarquia
                                      </span>
                                    </div>
                                  </div>

                                  {task.dependencies.length === 0 ? (
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                                      <p className="text-xs text-slate-400">
                                        Nenhuma dependência externa vinculada.
                                      </p>
                                      <button
                                        onClick={() => onOpenTaskModal(milestone.id, task)}
                                        className="mt-1 text-[11px] text-indigo-600 font-semibold hover:underline"
                                      >
                                        + Vincular Dependência Externa
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {task.dependencies.map((dep) => {
                                        const { state, isBlocking, badgeClass, label } =
                                          getDependencyLifecycle(dep);
                                        const waitingDays = getDependencyWaitingTimeDays(dep);
                                        const followUpsCount = dep.followUps?.length || 0;
                                        const linkedSub = task.subtasks.find(
                                          (s) => s.id === dep.linkedSubtaskId
                                        );

                                        return (
                                          <div
                                            key={dep.id}
                                            className={`p-3.5 rounded-xl border text-xs transition-all relative ${
                                              state === 'ATENDIDA'
                                                ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                                                : isBlocking
                                                ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200 text-slate-900'
                                                : state === 'EM_RISCO'
                                                ? 'bg-amber-50/70 border-amber-300 text-slate-900'
                                                : 'bg-blue-50/40 border-blue-200 text-slate-900'
                                            }`}
                                          >
                                            {/* Top badges: Estado + Bloqueando Fluxo */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                {/* Estado do Ciclo de Vida */}
                                                <span
                                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}
                                                >
                                                  Estado: {label}
                                                </span>

                                                {/* Bloqueando Fluxo: SIM | NÃO */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const nextBlocking = !isBlocking;
                                                    onUpdateDependencyDetails?.(
                                                      milestone.id,
                                                      task.id,
                                                      dep.id,
                                                      { bloqueandoFluxo: nextBlocking }
                                                    );
                                                  }}
                                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all ${
                                                    isBlocking
                                                      ? 'bg-rose-600 text-white border-rose-700 shadow-2xs hover:bg-rose-700'
                                                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                                  }`}
                                                  title="Clique para alternar se esta dependência está bloqueando o fluxo operacional"
                                                >
                                                  {isBlocking ? (
                                                    <>
                                                      <Lock className="w-3 h-3 text-white" />
                                                      Bloqueando fluxo: SIM
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Unlock className="w-3 h-3 text-slate-500" />
                                                      Bloqueando fluxo: NÃO
                                                    </>
                                                  )}
                                                </button>
                                              </div>

                                              <button
                                                onClick={() => onOpenFollowUpModal(dep, task.title)}
                                                className="text-[10px] text-indigo-700 hover:text-indigo-900 font-semibold underline shrink-0"
                                              >
                                                Histórico ({followUpsCount})
                                              </button>
                                            </div>

                                            {/* Nome / Descrição */}
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">
                                              {dep.title}
                                            </h4>

                                            {/* Responsável ou setor externo */}
                                            <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-1.5">
                                              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                              <span>
                                                Responsável/Setor:{' '}
                                                <strong>{dep.departmentOrOwner}</strong>
                                              </span>
                                            </div>

                                            {/* Vínculo explícito com subtarefa */}
                                            {linkedSub ? (
                                              <div className="p-1.5 bg-amber-100/70 border border-amber-300 rounded-lg text-[11px] text-amber-950 mb-1.5 flex items-center gap-1.5">
                                                <LinkIcon className="w-3 h-3 text-amber-700 shrink-0" />
                                                <span>
                                                  Vinculada à subtarefa:{' '}
                                                  <strong className="text-slate-900">
                                                    &ldquo;{linkedSub.title}&rdquo;
                                                  </strong>
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="text-[11px] text-slate-500 mb-1.5">
                                                Vinculada à tarefa geral: <em>{task.title}</em>
                                              </div>
                                            )}

                                            {/* Impacto / Próxima Ação */}
                                            {dep.impactNextAction && (
                                              <div className="p-1.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg text-[11px] text-indigo-950 mb-1.5">
                                                <span className="font-bold block text-[10px] text-indigo-700 uppercase">
                                                  Impacto / Próxima Ação que Libera:
                                                </span>
                                                <span>{dep.impactNextAction}</span>
                                              </div>
                                            )}

                                            {/* Observações */}
                                            {dep.notes && (
                                              <p className="text-[11px] text-slate-600 italic bg-white/70 p-1.5 rounded border border-slate-200/60 mb-2">
                                                &ldquo;{dep.notes}&rdquo;
                                              </p>
                                            )}

                                            {/* Datas, SLA, Tempo de Espera e Cobranças */}
                                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-100/70 p-2 rounded-lg border border-slate-200/80 mb-2.5">
                                              <div>
                                                <span className="text-slate-500 block text-[10px]">
                                                  Data de Abertura:
                                                </span>
                                                <strong className="text-slate-800">
                                                  {dep.openedAt || dep.startDate || 'Não inf.'}
                                                </strong>
                                              </div>
                                              <div>
                                                <span className="text-slate-500 block text-[10px]">
                                                  Prazo SLA:
                                                </span>
                                                <strong className="text-slate-800">
                                                  {dep.slaDeadline || dep.endDate || 'Sem SLA'}
                                                </strong>
                                              </div>
                                              <div>
                                                <span className="text-slate-500 block text-[10px]">
                                                  Tempo de Espera:
                                                </span>
                                                <strong className="text-indigo-700">
                                                  {waitingDays} dia(s)
                                                </strong>
                                              </div>
                                              <div>
                                                <span className="text-slate-500 block text-[10px]">
                                                  Data Atendida:
                                                </span>
                                                <strong
                                                  className={
                                                    dep.resolvedAt ? 'text-emerald-700' : 'text-slate-400'
                                                  }
                                                >
                                                  {dep.resolvedAt || 'Ainda não atendida'}
                                                </strong>
                                              </div>
                                            </div>

                                            {/* Approval Stages Stepper if present */}
                                            {dep.approvalStages && dep.approvalStages.length > 0 && (
                                              <div className="pt-2 pb-2 border-t border-slate-200/60">
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

                                            {/* Action Bar: Mudança de Estado Rápida e Cobrança */}
                                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                                              {/* Seletor de Estado */}
                                              <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-500 font-semibold">
                                                  Mudar Estado:
                                                </span>
                                                <select
                                                  value={state}
                                                  onChange={(e) => {
                                                    const newState = e.target
                                                      .value as DependencyLifecycleState;
                                                    const isNowAttended = newState === 'ATENDIDA';
                                                    onUpdateDependencyDetails?.(
                                                      milestone.id,
                                                      task.id,
                                                      dep.id,
                                                      {
                                                        state: newState,
                                                        status: isNowAttended
                                                          ? 'cleared'
                                                          : newState === 'EM_RISCO'
                                                          ? 'blocked'
                                                          : 'waiting_approval',
                                                        bloqueandoFluxo: isNowAttended
                                                          ? false
                                                          : dep.bloqueandoFluxo,
                                                        resolvedAt: isNowAttended
                                                          ? new Date().toISOString().slice(0, 10)
                                                          : undefined,
                                                      }
                                                    );
                                                  }}
                                                  className="px-2 py-0.5 rounded border border-slate-300 text-[11px] font-bold bg-white text-slate-800"
                                                >
                                                  <option value="AGUARDANDO">AGUARDANDO</option>
                                                  <option value="EM_RISCO">EM RISCO</option>
                                                  <option value="ATENDIDA">ATENDIDA</option>
                                                </select>
                                              </div>

                                              <button
                                                onClick={() => onOpenFollowUpModal(dep, task.title)}
                                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs"
                                              >
                                                <MessageSquare className="w-3 h-3 text-amber-400" />
                                                <span>Cobrar ({followUpsCount})</span>
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
