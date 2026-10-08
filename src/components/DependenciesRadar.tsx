import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Search,
  Filter,
  Lock,
  Unlock,
  History,
  TrendingUp,
  Link as LinkIcon,
  Layers,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Objective, Dependency, Task, Milestone, DependencyLifecycleState } from '../types';
import {
  getDependencyLifecycle,
  getDependencyWaitingTimeDays,
  getSeverityLabel,
} from '../utils/helpers';
import { ApprovalChainBadge } from './ApprovalChainBadge';

interface FlatDependencyItem {
  dependency: Dependency;
  task: Task;
  milestone: Milestone;
}

interface DependenciesRadarProps {
  objective: Objective;
  onOpenFollowUpModal: (dependency: Dependency, taskTitle: string) => void;
  onUpdateStatus: (
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
}

export const DependenciesRadar: React.FC<DependenciesRadarProps> = ({
  objective,
  onOpenFollowUpModal,
  onUpdateStatus,
  onUpdateDependencyDetails,
  onAdvanceApprovalStage,
}) => {
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'all_grouped' | 'blocking' | 'risk' | 'waiting' | 'resolved'
  >('all_grouped');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect all dependencies
  const flatDependencies: FlatDependencyItem[] = [];
  objective.milestones.forEach((milestone) => {
    milestone.tasks.forEach((task) => {
      task.dependencies.forEach((dep) => {
        flatDependencies.push({
          dependency: dep,
          task,
          milestone,
        });
      });
    });
  });

  // Extract unique departments/owners
  const departments = Array.from(
    new Set(flatDependencies.map((d) => d.dependency.departmentOrOwner.trim()))
  );

  // Group into the 4 explicit user categories (Item 5):
  // 1. Bloqueando agora (bloqueandoFluxo === true && state !== 'ATENDIDA')
  // 2. Em risco (state === 'EM_RISCO' && !bloqueandoFluxo)
  // 3. Aguardando terceiros (state === 'AGUARDANDO' && !bloqueandoFluxo)
  // 4. Resolvidas recentemente (state === 'ATENDIDA')

  const blockingItems: FlatDependencyItem[] = [];
  const riskItems: FlatDependencyItem[] = [];
  const waitingItems: FlatDependencyItem[] = [];
  const resolvedItems: FlatDependencyItem[] = [];

  flatDependencies.forEach((item) => {
    const { state, isBlocking } = getDependencyLifecycle(item.dependency);
    if (state === 'ATENDIDA') {
      resolvedItems.push(item);
    } else if (isBlocking) {
      blockingItems.push(item);
    } else if (state === 'EM_RISCO') {
      riskItems.push(item);
    } else {
      waitingItems.push(item);
    }
  });

  // Métricas do histórico operacional
  const totalWaitingDays = flatDependencies.reduce(
    (acc, curr) => acc + getDependencyWaitingTimeDays(curr.dependency),
    0
  );
  const avgWaitingDays =
    flatDependencies.length > 0 ? Math.round(totalWaitingDays / flatDependencies.length) : 0;
  const totalFollowUps = flatDependencies.reduce(
    (acc, curr) => acc + (curr.dependency.followUps?.length || 0),
    0
  );

  // Filter helper
  const applyFilters = (list: FlatDependencyItem[]) => {
    return list.filter((item) => {
      if (filterDept !== 'all' && item.dependency.departmentOrOwner.trim() !== filterDept) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = item.dependency.title.toLowerCase().includes(term);
        const matchOwner = item.dependency.departmentOrOwner.toLowerCase().includes(term);
        const matchTask = item.task.title.toLowerCase().includes(term);
        const matchNotes = item.dependency.notes?.toLowerCase().includes(term);
        if (!matchTitle && !matchOwner && !matchTask && !matchNotes) return false;
      }
      return true;
    });
  };

  const filteredBlocking = applyFilters(blockingItems);
  const filteredRisk = applyFilters(riskItems);
  const filteredWaiting = applyFilters(waitingItems);
  const filteredResolved = applyFilters(resolvedItems);

  // Card renderer
  const renderDependencyCard = (
    item: FlatDependencyItem,
    categoryType: 'blocking' | 'risk' | 'waiting' | 'resolved'
  ) => {
    const { dependency: dep, task, milestone } = item;
    const { state, isBlocking, badgeClass, label } = getDependencyLifecycle(dep);
    const waitingDays = getDependencyWaitingTimeDays(dep);
    const followUpsCount = dep.followUps?.length || 0;
    const linkedSub = task.subtasks.find((s) => s.id === dep.linkedSubtaskId);

    return (
      <div
        key={dep.id}
        className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
          categoryType === 'blocking'
            ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/15'
            : categoryType === 'risk'
            ? 'border-amber-300 bg-amber-50/15'
            : categoryType === 'resolved'
            ? 'border-emerald-200 bg-emerald-50/20'
            : 'border-blue-200 bg-blue-50/10'
        }`}
      >
        <div className="space-y-3">
          {/* Top badges bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Estado do Ciclo de Vida */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                {label}
              </span>

              {/* Botão de Toggle Bloqueando Fluxo */}
              <button
                type="button"
                onClick={() => {
                  const nextBlocking = !isBlocking;
                  onUpdateDependencyDetails?.(milestone.id, task.id, dep.id, {
                    bloqueandoFluxo: nextBlocking,
                  });
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all ${
                  isBlocking
                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs hover:bg-rose-700'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
                title="Clique para definir se esta dependência trava o fluxo da próxima ação"
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

            <span className="text-[10px] text-slate-500 font-medium">
              Espera: <strong className="text-indigo-700">{waitingDays} dias</strong>
            </span>
          </div>

          {/* Título e Responsável */}
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-snug">{dep.title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{dep.departmentOrOwner}</span>
            </div>
          </div>

          {/* Vínculo contextual com Tarefa / Subtarefa */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <div className="text-slate-500 flex items-center justify-between">
              <span>Vinculada à Tarefa:</span>
              <strong className="text-slate-800">{task.title}</strong>
            </div>
            {linkedSub ? (
              <div className="text-amber-900 flex items-center justify-between pt-1 border-t border-slate-200/60 font-medium">
                <span>Trava especificamente:</span>
                <strong className="text-slate-900">&ldquo;{linkedSub.title}&rdquo;</strong>
              </div>
            ) : (
              <div className="text-slate-400 text-[10px] text-right">
                Impacta a tarefa como um todo
              </div>
            )}
          </div>

          {/* Impacto / Próxima Ação */}
          {dep.impactNextAction && (
            <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                Impacto / Próxima Ação que Libera:
              </span>
              <span>{dep.impactNextAction}</span>
            </div>
          )}

          {/* Observações */}
          {dep.notes && (
            <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200 italic">
              &ldquo;{dep.notes}&rdquo;
            </p>
          )}

          {/* Datas e SLA */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 block">Data de Abertura:</span>
              <strong className="text-slate-800 font-semibold">
                {dep.openedAt || dep.startDate || 'Sem data'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Prazo / SLA Limite:</span>
              <strong className="text-slate-800 font-semibold">
                {dep.slaDeadline || dep.endDate || 'Sem prazo'}
              </strong>
            </div>
            {dep.resolvedAt && (
              <div className="col-span-2 pt-1 border-t border-slate-200/60 text-emerald-800">
                <span className="text-[10px] text-emerald-600 block">Data em que foi atendida:</span>
                <strong>{dep.resolvedAt}</strong>
              </div>
            )}
          </div>

          {/* Último follow-up / cobrança */}
          {dep.followUps && dep.followUps.length > 0 && (
            <div className="p-2 rounded bg-amber-50/70 border border-amber-200 text-[11px] text-amber-950">
              <strong className="block text-[10px] text-amber-800 uppercase tracking-wide">
                Última Cobrança ({dep.followUps[dep.followUps.length - 1].date}):
              </strong>
              <span>{dep.followUps[dep.followUps.length - 1].note}</span>
            </div>
          )}

          {/* Approval Stages Stepper if present */}
          {dep.approvalStages && dep.approvalStages.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <ApprovalChainBadge
                stages={dep.approvalStages}
                interactive={true}
                onAdvanceStage={(stageIdx) => {
                  onAdvanceApprovalStage?.(milestone.id, task.id, dep.id, stageIdx);
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          {/* Seletor de Estado */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-semibold">Estado:</span>
            <select
              value={state}
              onChange={(e) => {
                const newState = e.target.value as DependencyLifecycleState;
                const isNowAttended = newState === 'ATENDIDA';
                onUpdateDependencyDetails?.(milestone.id, task.id, dep.id, {
                  state: newState,
                  status: isNowAttended
                    ? 'cleared'
                    : newState === 'EM_RISCO'
                    ? 'blocked'
                    : 'waiting_approval',
                  bloqueandoFluxo: isNowAttended ? false : dep.bloqueandoFluxo,
                  resolvedAt: isNowAttended ? new Date().toISOString().slice(0, 10) : undefined,
                });
              }}
              className="px-2 py-0.5 rounded border border-slate-300 text-xs font-bold bg-white text-slate-800"
            >
              <option value="AGUARDANDO">AGUARDANDO</option>
              <option value="EM_RISCO">EM RISCO</option>
              <option value="ATENDIDA">ATENDIDA</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenFollowUpModal(dep, task.title)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Cobrar ({followUpsCount})</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner do Radar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-indigo-800/40 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Acompanhamento Operacional de Terceiros
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Radar de Dependências & Bloqueios Externos
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl">
              Distinção clara entre <strong>dependência</strong> (relação/espera externa) e{' '}
              <strong>bloqueio</strong> (quando a pendência efetivamente paralisa o fluxo da próxima ação).
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-800 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">
                Bloqueando Agora
              </span>
              <span className="text-xl font-black text-rose-100">{blockingItems.length}</span>
            </div>
            <div className="p-3 bg-amber-950/60 rounded-xl border border-amber-800 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">Em Risco</span>
              <span className="text-xl font-black text-amber-100">{riskItems.length}</span>
            </div>
            <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-800 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">
                Aguardando Terceiros
              </span>
              <span className="text-xl font-black text-blue-100">{waitingItems.length}</span>
            </div>
            <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-800 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                Atendidas / Resolvidas
              </span>
              <span className="text-xl font-black text-emerald-100">{resolvedItems.length}</span>
            </div>
          </div>
        </div>

        {/* Histórico Operacional Banner */}
        <div className="mt-4 pt-3 border-t border-indigo-800/60 flex items-center justify-between text-xs text-indigo-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>
              Tempo Médio de Espera: <strong className="text-white">{avgWaitingDays} dias</strong>
            </span>
            <span className="text-indigo-400">•</span>
            <span>
              Total de Cobranças Realizadas:{' '}
              <strong className="text-white">{totalFollowUps} cobranças</strong>
            </span>
          </div>
          <span className="text-[11px] text-indigo-300/80">
            * O Radar não considera toda dependência aberta como bloqueio.
          </span>
        </div>
      </div>

      {/* Tabs das 4 Categorias + Busca e Filtro (Item 5) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setActiveCategoryTab('all_grouped')}
            className={`px-3 py-2 rounded-lg transition-all shrink-0 ${
              activeCategoryTab === 'all_grouped'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Visão Geral (4 Categorias)
          </button>

          <button
            onClick={() => setActiveCategoryTab('blocking')}
            className={`px-3 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeCategoryTab === 'blocking'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloqueando agora ({filteredBlocking.length})</span>
          </button>

          <button
            onClick={() => setActiveCategoryTab('risk')}
            className={`px-3 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeCategoryTab === 'risk'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Em risco ({filteredRisk.length})</span>
          </button>

          <button
            onClick={() => setActiveCategoryTab('waiting')}
            className={`px-3 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeCategoryTab === 'waiting'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Aguardando terceiros ({filteredWaiting.length})</span>
          </button>

          <button
            onClick={() => setActiveCategoryTab('resolved')}
            className={`px-3 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeCategoryTab === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolvidas recentemente ({filteredResolved.length})</span>
          </button>
        </div>

        {/* Search & Sector Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, responsável, impacto ou tarefa..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            >
              <option value="all">Todos os Setores / Responsáveis</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RENDER VIEW: ALL GROUPED OU ABA INDIVIDUAL */}
      {activeCategoryTab === 'all_grouped' ? (
        <div className="space-y-8">
          {/* Seção 1: Bloqueando agora */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-rose-100 text-rose-700">
                <Lock className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-rose-950">
                Bloqueando agora ({filteredBlocking.length})
              </h3>
              <span className="text-xs text-rose-800/80">
                — Impedem diretamente o avanço da próxima ação operacional
              </span>
            </div>
            {filteredBlocking.length === 0 ? (
              <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200 text-xs text-rose-700">
                Nenhum bloqueio ativo no momento. O fluxo operacional está livre.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBlocking.map((item) => renderDependencyCard(item, 'blocking'))}
              </div>
            )}
          </div>

          {/* Seção 2: Em risco */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-amber-950">
                Em risco ({filteredRisk.length})
              </h3>
              <span className="text-xs text-amber-900/80">
                — Próximas ou além do prazo SLA, mas sem bloqueio imediato do fluxo
              </span>
            </div>
            {filteredRisk.length === 0 ? (
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 text-xs text-amber-800">
                Nenhuma dependência classificada em risco.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRisk.map((item) => renderDependencyCard(item, 'risk'))}
              </div>
            )}
          </div>

          {/* Seção 3: Aguardando terceiros */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-100 text-blue-700">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-blue-950">
                Aguardando terceiros ({filteredWaiting.length})
              </h3>
              <span className="text-xs text-blue-900/80">
                — Abertas dentro do prazo e sem bloqueio direto
              </span>
            </div>
            {filteredWaiting.length === 0 ? (
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 text-xs text-blue-800">
                Nenhuma dependência aguardando terceiros.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWaiting.map((item) => renderDependencyCard(item, 'waiting'))}
              </div>
            )}
          </div>

          {/* Seção 4: Resolvidas recentemente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-emerald-950">
                Resolvidas recentemente ({filteredResolved.length})
              </h3>
              <span className="text-xs text-emerald-900/80">
                — Dependências que já foram atendidas por terceiros
              </span>
            </div>
            {filteredResolved.length === 0 ? (
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                Nenhuma dependência atendida cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResolved.map((item) => renderDependencyCard(item, 'resolved'))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Abas Individuais */
        <div>
          {activeCategoryTab === 'blocking' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBlocking.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center col-span-2">
                  Nenhum registro nesta categoria.
                </p>
              ) : (
                filteredBlocking.map((item) => renderDependencyCard(item, 'blocking'))
              )}
            </div>
          )}

          {activeCategoryTab === 'risk' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRisk.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center col-span-2">
                  Nenhum registro nesta categoria.
                </p>
              ) : (
                filteredRisk.map((item) => renderDependencyCard(item, 'risk'))
              )}
            </div>
          )}

          {activeCategoryTab === 'waiting' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWaiting.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center col-span-2">
                  Nenhum registro nesta categoria.
                </p>
              ) : (
                filteredWaiting.map((item) => renderDependencyCard(item, 'waiting'))
              )}
            </div>
          )}

          {activeCategoryTab === 'resolved' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResolved.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center col-span-2">
                  Nenhum registro nesta categoria.
                </p>
              ) : (
                filteredResolved.map((item) => renderDependencyCard(item, 'resolved'))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
