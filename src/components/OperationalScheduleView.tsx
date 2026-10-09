import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  User,
  Building2,
  ArrowRight,
  Filter,
  CalendarRange,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Repeat,
  BellRing,
  Check,
  Target,
  Play,
  Pause,
  Plus,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { Objective, Dependency, ExecutionSession, ExecutionSessionStatus } from '../types';
import {
  buildOperationalSchedule,
  TemporalFollowUpItem,
  TemporalOwnerQueue,
  TemporalExecutionSessionItem,
} from '../utils/scheduleProjection';
import { formatMinutes } from '../utils/helpers';

interface OperationalScheduleViewProps {
  objective: Objective;
  onOpenFollowUpModal: (
    milestoneId: string,
    taskId: string,
    dep: Dependency,
    actionType?: 'cobrar' | 'followup'
  ) => void;
  onSelectTab: (tab: 'tree' | 'radar' | 'board' | 'ocs' | 'gantt' | 'schedule') => void;
  onOpenTaskModal?: (milestoneId: string, task?: any) => void;
  onOpenMilestoneModal?: (milestone?: any) => void;
  onOpenSessionModal?: (
    milestoneId?: string,
    taskId?: string,
    subtaskId?: string,
    session?: ExecutionSession
  ) => void;
  onUpdateSessionStatus?: (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    sessionId: string,
    newStatus: ExecutionSessionStatus,
    actualMinutes?: number
  ) => void;
}

export const OperationalScheduleView: React.FC<OperationalScheduleViewProps> = ({
  objective,
  onOpenFollowUpModal,
  onSelectTab,
  onOpenTaskModal,
  onOpenMilestoneModal,
  onOpenSessionModal,
  onUpdateSessionStatus,
}) => {
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState<'all' | 'ATRASADO' | 'HOJE' | 'AMANHA' | 'PROXIMOS_7_DIAS'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'dependency' | 'task' | 'milestone'>('all');
  const [activeViewMode, setActiveViewMode] = useState<'timeline' | 'by_owner' | 'focus_blocks'>('timeline');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');

  // Constrói a projeção temporal canônica com referência determinística (data civil: 08/10/2026)
  const schedule = buildOperationalSchedule(objective, '2026-10-08');

  // Filtragem estrita dos itens da linha do tempo
  const filterItems = (items: TemporalFollowUpItem[]) => {
    return items.filter((item) => {
      if (selectedUrgencyFilter !== 'all' && item.category !== selectedUrgencyFilter) return false;

      if (selectedTypeFilter === 'dependency' && item.sourceType !== 'dependency_followup') return false;
      if (selectedTypeFilter === 'task' && item.sourceType !== 'task_deadline' && item.sourceType !== 'subtask_due')
        return false;
      if (selectedTypeFilter === 'milestone' && item.sourceType !== 'milestone_target') return false;

      if (selectedOwner !== 'all' && item.departmentOrOwner !== selectedOwner) return false;

      return true;
    });
  };

  const atrasadosFiltered = filterItems(schedule.queues.atrasado);
  const hojeFiltered = filterItems(schedule.queues.hoje);
  const amanhaFiltered = filterItems(schedule.queues.amanha);
  const prox7DiasFiltered = filterItems(schedule.queues.prox7Dias);
  const horizonteFuturoFiltered = filterItems(schedule.queues.horizonteFuturo);

  const totalFilteredCount =
    atrasadosFiltered.length +
    hojeFiltered.length +
    amanhaFiltered.length +
    prox7DiasFiltered.length +
    horizonteFuturoFiltered.length;

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. CABEÇALHO EXECUTIVO DA AGENDA TEMPORAL                  */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-200">
                <CalendarRange className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ETAPA 4 — PLANEJAMENTO TEMPORAL
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Hoje: 08/10/2026</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                  Agenda Operacional, Follow-ups e Linha de Cobrança
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projeção temporal da matriz: O que fazer hoje, o que vence amanhã e quem precisa ser cobrado agora.
                </p>
              </div>
            </div>
          </div>

          {/* Toggle de Modos de Exibição */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setActiveViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Linha do Tempo</span>
            </button>
            <button
              onClick={() => setActiveViewMode('by_owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewMode === 'by_owner'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Por Responsável / Área</span>
            </button>
            <button
              onClick={() => setActiveViewMode('focus_blocks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewMode === 'focus_blocks'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Minha Operação (Time Blocking)</span>
              {schedule.sessionsQueue.hoje.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeViewMode === 'focus_blocks'
                      ? 'bg-white text-indigo-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {schedule.sessionsQueue.hoje.length}
                </span>
              )}
            </button>

            {onOpenSessionModal && (
              <button
                onClick={() => onOpenSessionModal()}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all ml-1 shadow-2xs"
                title="Reservar novo Bloco de Foco para uma Subtarefa"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Bloco</span>
              </button>
            )}
          </div>
        </div>

        {/* Big Numbers de Tomada de Decisão */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'ATRASADO' ? 'all' : 'ATRASADO');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'ATRASADO'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Atrasadas / Vencidas</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-600 mt-1 block">
              {schedule.summary.atrasadoCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Requer ação imediata</span>
          </button>

          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'HOJE' ? 'all' : 'HOJE');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'HOJE'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Cobrar / Agir Hoje</span>
              <BellRing className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {schedule.summary.hojeCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Foco do dia</span>
          </button>

          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'AMANHA' ? 'all' : 'AMANHA');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'AMANHA'
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Vence Amanhã</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {schedule.summary.amanhaCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Atenção prévia</span>
          </button>

          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'PROXIMOS_7_DIAS' ? 'all' : 'PROXIMOS_7_DIAS');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'PROXIMOS_7_DIAS'
                ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Próximos 7 Dias</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">
              {schedule.summary.prox7DiasCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">SLAs e entregas</span>
          </button>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Impacto no Fluxo</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {schedule.summary.blockingCount}
              </span>
              <span className="text-xs font-bold text-rose-600">bloqueando agora</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {schedule.summary.slaVencidoCount > 0 && `${schedule.summary.slaVencidoCount} fora do SLA • `}
              {schedule.summary.totalPendingActions} ações na fila
            </span>
          </div>
        </div>

        {/* Filtros de Tipo e Área */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Tipo:
            </span>
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                selectedTypeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({schedule.summary.totalPendingActions})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('dependency')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                selectedTypeFilter === 'dependency'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cobranças de Terceiros
            </button>
            <button
              onClick={() => setSelectedTypeFilter('task')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                selectedTypeFilter === 'task'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Prazos de Tarefas
            </button>
            <button
              onClick={() => setSelectedTypeFilter('milestone')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                selectedTypeFilter === 'milestone'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Marcos
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-500">Filtrar por Área:</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas as Áreas / Responsáveis</option>
              {schedule.byOwner.map((owner) => (
                <option key={owner.ownerName} value={owner.ownerName}>
                  {owner.ownerName} ({owner.totalItems})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CARD DE DESTAQUE: AGORA / BLOCO DE FOCO ATIVO             */}
      {/* ========================================================= */}
      {schedule.sessionsQueue.activeNowSession && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl border-2 border-indigo-500/40 p-5 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                  <Play className="w-2.5 h-2.5 fill-current" /> AGORA / BLOCO DO DIA
                </span>
                <span className="text-xs font-mono font-bold text-indigo-300">
                  {schedule.sessionsQueue.activeNowSession.startTime} –{' '}
                  {schedule.sessionsQueue.activeNowSession.endTime} (
                  {schedule.sessionsQueue.activeNowSession.plannedDurationMinutes} min)
                </span>
                <span className="text-xs text-slate-400 font-medium">Data: 08/10/2026</span>
              </div>
              <h3 className="text-lg font-black text-white">
                {schedule.sessionsQueue.activeNowSession.subtaskTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                <span>
                  Tarefa:{' '}
                  <strong className="text-indigo-200">
                    {schedule.sessionsQueue.activeNowSession.taskTitle}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Marco: <span>{schedule.sessionsQueue.activeNowSession.milestoneTitle}</span>
                </span>
              </div>
              {schedule.sessionsQueue.activeNowSession.sessionGoal && (
                <div className="mt-2 text-xs bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 text-indigo-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                    Meta deste bloco:
                  </span>
                  {schedule.sessionsQueue.activeNowSession.sessionGoal}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              {schedule.sessionsQueue.activeNowSession.status === 'in_progress' ? (
                <button
                  onClick={() => {
                    if (onUpdateSessionStatus) {
                      onUpdateSessionStatus(
                        schedule.sessionsQueue.activeNowSession!.milestoneId,
                        schedule.sessionsQueue.activeNowSession!.taskId,
                        schedule.sessionsQueue.activeNowSession!.subtaskId,
                        schedule.sessionsQueue.activeNowSession!.id,
                        'completed',
                        schedule.sessionsQueue.activeNowSession!.plannedDurationMinutes
                      );
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir Bloco</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onUpdateSessionStatus) {
                      onUpdateSessionStatus(
                        schedule.sessionsQueue.activeNowSession!.milestoneId,
                        schedule.sessionsQueue.activeNowSession!.taskId,
                        schedule.sessionsQueue.activeNowSession!.subtaskId,
                        schedule.sessionsQueue.activeNowSession!.id,
                        'in_progress'
                      );
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Foco</span>
                </button>
              )}

              {onOpenSessionModal && (
                <button
                  onClick={() => {
                    onOpenSessionModal(
                      schedule.sessionsQueue.activeNowSession!.milestoneId,
                      schedule.sessionsQueue.activeNowSession!.taskId,
                      schedule.sessionsQueue.activeNowSession!.subtaskId,
                      schedule.sessionsQueue.activeNowSession!.session
                    );
                  }}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  Ver Bloco
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MODO LINHA DO TEMPO: O QUE AGIR AGORA, AMANHÃ E DEPOIS  */}
      {/* ========================================================= */}
      {activeViewMode === 'timeline' && (
        <div className="space-y-6">
          {totalFilteredCount === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma ação pendente para os filtros selecionados
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Não há cobranças vencidas, tarefas atrasadas ou follow-ups agendados nesta categoria.
              </p>
              <button
                onClick={() => {
                  setSelectedUrgencyFilter('all');
                  setSelectedTypeFilter('all');
                  setSelectedOwner('all');
                }}
                className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <>
              {/* SEÇÃO 1: ATRASADAS / VENCIDAS (URGÊNCIA MÁXIMA) */}
              {atrasadosFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-rose-100 text-rose-700 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-rose-900">
                          🚨 Ações e Cobranças Vencidas ({atrasadosFiltered.length})
                        </h3>
                        <p className="text-xs text-rose-600 font-medium">
                          Follow-ups ou prazos que já ultrapassaram a data limite estipulada.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {atrasadosFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        objective={objective}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                        onOpenTaskModal={onOpenTaskModal}
                        onOpenMilestoneModal={onOpenMilestoneModal}
                        onOpenSessionModal={onOpenSessionModal}
                        onSelectTab={onSelectTab}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: HOJE (FOCO OPERACIONAL DO DIA) */}
              {hojeFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-300 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-amber-100 text-amber-800 rounded-lg">
                        <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          ⚡ O que Precisa ser Feito ou Cobrado Hoje ({hojeFiltered.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Pauta diária de follow-up ativo e entregas programadas para hoje.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {hojeFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        objective={objective}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                        onOpenTaskModal={onOpenTaskModal}
                        onOpenMilestoneModal={onOpenMilestoneModal}
                        onOpenSessionModal={onOpenSessionModal}
                        onSelectTab={onSelectTab}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 3: AMANHÃ (PREVISÃO E PREPARAÇÃO) */}
              {amanhaFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-blue-100 text-blue-800 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          ⏳ Vencimentos e Cobranças de Amanhã ({amanhaFiltered.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Antecipe cobranças para evitar que itens de amanhã se tornem bloqueios críticos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {amanhaFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        objective={objective}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                        onOpenTaskModal={onOpenTaskModal}
                        onOpenMilestoneModal={onOpenMilestoneModal}
                        onOpenSessionModal={onOpenSessionModal}
                        onSelectTab={onSelectTab}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 4: PRÓXIMOS 7 DIAS */}
              {prox7DiasFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-indigo-100 text-indigo-800 rounded-lg">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          📅 Próximos 7 Dias ({prox7DiasFiltered.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Visão semanal antecipada de SLAs, prazos e entregas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {prox7DiasFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        objective={objective}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                        onOpenTaskModal={onOpenTaskModal}
                        onOpenMilestoneModal={onOpenMilestoneModal}
                        onOpenSessionModal={onOpenSessionModal}
                        onSelectTab={onSelectTab}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 5: HORIZONTE EXPANDIDO (> 7 DIAS) */}
              {horizonteFuturoFiltered.length > 0 && selectedUrgencyFilter === 'all' && (
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Horizonte Posterior (&gt; 7 dias) &bull; {horizonteFuturoFiltered.length} item(ns)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {horizonteFuturoFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        objective={objective}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                        onOpenTaskModal={onOpenTaskModal}
                        onOpenMilestoneModal={onOpenMilestoneModal}
                        onOpenSessionModal={onOpenSessionModal}
                        onSelectTab={onSelectTab}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODO POR RESPONSÁVEL / ÁREA: QUEM EU PRECISO COBRAR    */}
      {/* ========================================================= */}
      {activeViewMode === 'by_owner' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <h3 className="text-sm font-black text-slate-900">
              Fila de Cobrança por Setor & Responsável
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifica exatamente quem retém entregas e quais cobranças estão pendentes com cada terceiro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule.byOwner.map((owner) => (
              <div
                key={owner.ownerName}
                className={`rounded-2xl border p-4 bg-white shadow-xs space-y-3 flex flex-col justify-between ${
                  owner.blockingCount > 0
                    ? 'border-rose-300 ring-1 ring-rose-100'
                    : owner.atrasadoCount > 0
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                        <Building2 className="w-4 h-4 text-slate-600" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {owner.ownerName}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          {owner.totalItems} ação(ões) atribuída(s)
                        </span>
                      </div>
                    </div>
                    {owner.blockingCount > 0 ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                        {owner.blockingCount} bloqueando
                      </span>
                    ) : owner.atrasadoCount > 0 ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                        {owner.atrasadoCount} vencida(s)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold text-[10px]">
                        Regular
                      </span>
                    )}
                  </div>

                  {/* Lista de Itens do Responsável */}
                  <div className="mt-3 space-y-2">
                    {owner.items.map((item) => {
                      const milestone = objective.milestones.find((m) => m.id === item.milestoneId);
                      const task = milestone?.tasks.find((t) => t.id === item.taskId);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.sourceType === 'dependency_followup' && item.rawDependency) {
                              onOpenFollowUpModal(item.milestoneId, item.taskId, item.rawDependency, 'cobrar');
                            } else if ((item.sourceType === 'task_deadline' || item.sourceType === 'subtask_due') && task && onOpenTaskModal) {
                              onOpenTaskModal(item.milestoneId, task);
                            } else if (item.sourceType === 'milestone_target' && milestone && onOpenMilestoneModal) {
                              onOpenMilestoneModal(milestone);
                            }
                          }}
                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-xs text-xs space-y-1 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {item.title}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${item.urgencyBadgeClass}`}>
                              {item.urgencyLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {item.nextActionOrImpact}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1" onClick={(e) => e.stopPropagation()}>
                            <span>Data: {item.targetDate}</span>
                            <div className="flex items-center gap-1.5">
                              {item.sourceType === 'dependency_followup' && item.rawDependency ? (
                                <button
                                  onClick={() => {
                                    onOpenFollowUpModal(
                                      item.milestoneId,
                                      item.taskId,
                                      item.rawDependency!,
                                      'cobrar'
                                    );
                                  }}
                                  className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  <PhoneCall className="w-3 h-3" /> Cobrar
                                </button>
                              ) : task && onOpenTaskModal ? (
                                <button
                                  onClick={() => onOpenTaskModal(item.milestoneId, task)}
                                  className="text-indigo-600 font-bold hover:underline"
                                >
                                  Ver Tarefa
                                </button>
                              ) : null}

                              {onSelectTab && (
                                <button
                                  onClick={() => onSelectTab('tree')}
                                  className="text-slate-400 hover:text-slate-700 ml-1"
                                  title="Ver na Árvore Hierárquica"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Sincronizado com Matriz</span>
                  <span className="font-bold text-slate-600">Core v1.0.0</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODO MINHA OPERAÇÃO: TIME BLOCKING & BLOCOS DE FOCO    */}
      {/* ========================================================= */}
      {activeViewMode === 'focus_blocks' && (
        <div className="space-y-6">
          {/* Header do Time Boxing & Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                  <Target className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Minha Operação — Time Boxing & Sessões de Execução
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Subtarefas executáveis transformadas em blocos de trabalho com horário reservado e cronômetro.
              </p>
            </div>

            {onOpenSessionModal && (
              <button
                onClick={() => onOpenSessionModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Reservar Bloco de Foco</span>
              </button>
            )}
          </div>

          {/* Tríade de Gestão de Tempo do Objetivo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* 1. Trabalho Total (Estimado) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                1. Quanto Trabalho Tenho?
              </span>
              <span className="text-2xl font-black text-slate-900 block">
                {formatMinutes(schedule.timeSummary.totalEstimatedMinutes)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Tempo estimado total</span>
            </div>

            {/* 2. Tempo Reservado */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">
                2. Quanto Tempo Reservei?
              </span>
              <span className="text-2xl font-black text-indigo-900 block">
                {formatMinutes(schedule.timeSummary.totalReservedMinutes)}
              </span>
              <span className="text-[10px] text-indigo-700 font-medium">
                {schedule.timeSummary.totalSessionsCount} bloco(s) ativo(s)
              </span>
            </div>

            {/* 3. Tempo Realizado */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-1">
                3. Quanto Consumiu?
              </span>
              <span className="text-2xl font-black text-emerald-900 block">
                {formatMinutes(schedule.timeSummary.totalActualMinutes)}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">
                {schedule.timeSummary.completedSessionsCount} bloco(s) concluído(s)
              </span>
            </div>

            {/* Cobertura & Gap de Planejamento */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Cobertura & Gap de Planejamento
              </span>
              <div>
                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Taxa de Reserva</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black ${schedule.timeSummary.coveragePercent > 100 ? 'text-emerald-700' : 'text-indigo-600'}`}>
                      {schedule.timeSummary.coveragePercent}%
                    </span>
                    {schedule.timeSummary.totalPlanningGapMinutes > 0 ? (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200" title="Gap de planejamento: trabalho sem horário reservado">
                        Gap: {formatMinutes(schedule.timeSummary.totalPlanningGapMinutes)}
                      </span>
                    ) : schedule.timeSummary.totalPlanningGapMinutes < 0 ? (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title="Tempo reservado além da estimativa inicial">
                        +{formatMinutes(Math.abs(schedule.timeSummary.totalPlanningGapMinutes))}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      schedule.timeSummary.coveragePercent > 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, schedule.timeSummary.coveragePercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Alerta de Conflitos de Planejamento (Sobreposições de Horário na Agenda) */}
          {schedule.sessionsQueue.conflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h4 className="text-sm font-black text-amber-950">
                  ⚠️ Conflitos de Planejamento na Agenda ({schedule.sessionsQueue.conflicts.length})
                </h4>
              </div>
              <p className="text-xs text-amber-800">
                A Matriz identificou sobreposição de horários entre blocos de foco. O planejamento foi mantido para não travar sua operação, mas recomendamos redistribuir as sessões:
              </p>
              <div className="space-y-1.5 pt-1">
                {schedule.sessionsQueue.conflicts.map((c, idx) => (
                  <div key={idx} className="text-xs bg-white/80 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900">{c.sessionATitle}</strong> vs <strong className="text-slate-900">{c.sessionBTitle}</strong>
                      <span className="text-amber-700 block text-[11px] mt-0.5">{c.message}</span>
                    </div>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-black shrink-0 ml-2">
                      {c.overlapMinutes} min de colisão
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerta de Sessões Perdidas (MISSED / Não Executadas no Passado) */}
          {schedule.sessionsQueue.missedSessions.length > 0 && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5 text-rose-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-rose-950">
                      ⏳ Sessões Passadas Não Executadas ({schedule.sessionsQueue.missedSessions.length})
                    </h4>
                    <p className="text-xs text-rose-800">
                      Blocos de foco com horário ultrapassado que não foram iniciados. Reprograme para hoje ou cancele.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {schedule.sessionsQueue.missedSessions.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-xl border border-rose-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 block">
                        Previsto para: {item.date} ({item.startTime}–{item.endTime})
                      </span>
                      <strong className="text-xs text-slate-900 block mt-0.5">{item.subtaskTitle}</strong>
                    </div>
                    {onOpenSessionModal && (
                      <button
                        onClick={() => onOpenSessionModal(item.milestoneId, item.taskId, item.subtaskId, item.session)}
                        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Reprogramar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Blocos de Foco de Hoje (08/10/2026)
                </h4>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {schedule.sessionsQueue.hoje.length}
                </span>
              </div>
            </div>

            {schedule.sessionsQueue.hoje.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  Nenhum bloco de foco reservado para hoje
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reserve 30 a 60 minutos para avançar em uma subtarefa sem distrações.
                </p>
                {onOpenSessionModal && (
                  <button
                    onClick={() => onOpenSessionModal()}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Agendar Bloco Hoje
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {schedule.sessionsQueue.hoje.map((sessionItem) => (
                  <ExecutionSessionBlockCard
                    key={sessionItem.id}
                    sessionItem={sessionItem}
                    onOpenSessionModal={onOpenSessionModal}
                    onUpdateSessionStatus={onUpdateSessionStatus}
                  />
                ))}
              </div>
            )}
          </div>

          {/* BLOCOS DE AMANHÃ E PRÓXIMOS DIAS */}
          {(schedule.sessionsQueue.amanha.length > 0 ||
            schedule.sessionsQueue.prox7Dias.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Próximos Blocos Agendados
                </h4>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  {schedule.sessionsQueue.amanha.length + schedule.sessionsQueue.prox7Dias.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...schedule.sessionsQueue.amanha, ...schedule.sessionsQueue.prox7Dias].map(
                  (sessionItem) => (
                    <ExecutionSessionBlockCard
                      key={sessionItem.id}
                      sessionItem={sessionItem}
                      onOpenSessionModal={onOpenSessionModal}
                      onUpdateSessionStatus={onUpdateSessionStatus}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* BLOCOS CONCLUÍDOS */}
          {schedule.sessionsQueue.concluidas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Blocos Concluídos Recentemente
                </h4>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {schedule.sessionsQueue.concluidas.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {schedule.sessionsQueue.concluidas.map((sessionItem) => (
                  <ExecutionSessionBlockCard
                    key={sessionItem.id}
                    sessionItem={sessionItem}
                    onOpenSessionModal={onOpenSessionModal}
                    onUpdateSessionStatus={onUpdateSessionStatus}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Card individual de Bloco de Foco / Sessão de Execução
 */
interface ExecutionSessionBlockCardProps {
  sessionItem: TemporalExecutionSessionItem;
  onOpenSessionModal?: (
    milestoneId?: string,
    taskId?: string,
    subtaskId?: string,
    session?: ExecutionSession
  ) => void;
  onUpdateSessionStatus?: (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    sessionId: string,
    newStatus: ExecutionSessionStatus,
    actualMinutes?: number
  ) => void;
}

const ExecutionSessionBlockCard: React.FC<ExecutionSessionBlockCardProps> = ({
  sessionItem,
  onOpenSessionModal,
  onUpdateSessionStatus,
}) => {
  const isCompleted = sessionItem.status === 'completed';
  const isInProgress = sessionItem.status === 'in_progress';

  return (
    <div
      className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
        isInProgress
          ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200'
          : isCompleted
          ? 'bg-slate-50/80 border-slate-200 opacity-90'
          : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-2xs'
      }`}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg border ${
              isInProgress
                ? 'bg-indigo-600 text-white border-indigo-600'
                : isCompleted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            {sessionItem.startTime} – {sessionItem.endTime}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {sessionItem.plannedDurationMinutes} min planejados
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isInProgress && (
            <span className="px-2 py-0.5 bg-rose-500 text-white font-black text-[10px] rounded-md animate-pulse">
              EM FOCO
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {sessionItem.actualDurationMinutes || sessionItem.plannedDurationMinutes}m feito
            </span>
          )}
          {!isCompleted && !isInProgress && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
              Agendada
            </span>
          )}
        </div>
      </div>

      {/* Subtarefa associada */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">{sessionItem.subtaskTitle}</span>
          {sessionItem.subtaskDueDate && (
            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Prazo: {sessionItem.subtaskDueDate}
            </span>
          )}
        </div>

        {/* Meta da Sessão */}
        {sessionItem.sessionGoal && (
          <p className="text-xs text-indigo-900 bg-indigo-50/60 border border-indigo-100 rounded-lg p-2 mt-1.5">
            <strong>Objetivo:</strong> {sessionItem.sessionGoal}
          </p>
        )}
      </div>

      {/* Breadcrumb e Ações */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
        <div className="text-[10px] text-slate-500 truncate">
          <span>{sessionItem.milestoneTitle}</span>
          <span className="mx-1">›</span>
          <span className="font-semibold text-slate-700">{sessionItem.taskTitle}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCompleted && (
            <>
              {isInProgress ? (
                <button
                  onClick={() => {
                    if (onUpdateSessionStatus) {
                      onUpdateSessionStatus(
                        sessionItem.milestoneId,
                        sessionItem.taskId,
                        sessionItem.subtaskId,
                        sessionItem.id,
                        'completed',
                        sessionItem.plannedDurationMinutes
                      );
                    }
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Concluir</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onUpdateSessionStatus) {
                      onUpdateSessionStatus(
                        sessionItem.milestoneId,
                        sessionItem.taskId,
                        sessionItem.subtaskId,
                        sessionItem.id,
                        'in_progress'
                      );
                    }
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Focar</span>
                </button>
              )}
            </>
          )}

          {onOpenSessionModal && (
            <button
              onClick={() => {
                onOpenSessionModal(
                  sessionItem.milestoneId,
                  sessionItem.taskId,
                  sessionItem.subtaskId,
                  sessionItem.session
                );
              }}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Card individual de Ação Temporal / Cobrança
 */
interface TimelineItemCardProps {
  item: TemporalFollowUpItem;
  objective: Objective;
  onOpenFollowUpModal: (
    milestoneId: string,
    taskId: string,
    dep: Dependency,
    actionType?: 'cobrar' | 'followup'
  ) => void;
  onOpenTaskModal?: (milestoneId: string, task?: any) => void;
  onOpenMilestoneModal?: (milestone?: any) => void;
  onOpenSessionModal?: (
    milestoneId?: string,
    taskId?: string,
    subtaskId?: string,
    session?: ExecutionSession
  ) => void;
  onSelectTab?: (tab: 'tree' | 'radar' | 'board' | 'ocs' | 'gantt' | 'schedule') => void;
}

const TimelineItemCard: React.FC<TimelineItemCardProps> = ({
  item,
  objective,
  onOpenFollowUpModal,
  onOpenTaskModal,
  onOpenMilestoneModal,
  onOpenSessionModal,
  onSelectTab,
}) => {
  // Localiza entidades na matriz
  const milestone = objective.milestones.find((m) => m.id === item.milestoneId);
  const task = milestone?.tasks.find((t) => t.id === item.taskId);

  // Ação primária ao clicar no card
  const handleCardClick = () => {
    if (item.sourceType === 'dependency_followup' && item.rawDependency) {
      onOpenFollowUpModal(item.milestoneId, item.taskId, item.rawDependency, 'cobrar');
    } else if (item.sourceType === 'task_deadline' || item.sourceType === 'subtask_due') {
      if (task && onOpenTaskModal) {
        onOpenTaskModal(item.milestoneId, task);
      }
    } else if (item.sourceType === 'milestone_target') {
      if (milestone && onOpenMilestoneModal) {
        onOpenMilestoneModal(milestone);
      }
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group p-4 rounded-xl border text-xs space-y-2.5 transition-all cursor-pointer relative shadow-2xs hover:shadow-md ${
        item.isBlocking
          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400 hover:bg-rose-50/70'
          : item.category === 'HOJE'
          ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:bg-amber-50/60'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70'
      }`}
    >
      {/* Topo do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.urgencyBadgeClass}`}>
              {item.urgencyLabel}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {item.statusLabel}
            </span>
            {item.slaDeadline && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  item.slaStatus === 'SLA_VENCIDO'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
                title={`SLA Limite Operacional: ${item.slaDeadline}`}
              >
                SLA: {item.slaDeadline} ({item.slaStatus === 'SLA_VENCIDO' ? 'Vencido' : 'No Prazo'})
              </span>
            )}
            {item.recurrence && item.recurrence !== 'none' && (
              <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-semibold" title="Cadência de cobrança">
                <Repeat className="w-3 h-3" />
                {item.recurrence === 'daily' ? 'Diária' : item.recurrence === 'every_2_days' ? 'A cada 2d' : 'Semanal'}
              </span>
            )}
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
            <span>{item.title}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 shrink-0" />
          </h4>
        </div>
      </div>

      {/* Próxima Ação ou Impacto Operacional */}
      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Próxima Ação Operacional
        </span>
        <p className="text-xs text-slate-700 font-medium">
          {item.nextActionOrImpact}
        </p>
      </div>

      {/* Metadados e Ações Diretas */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {item.departmentOrOwner}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Clock className="w-3 h-3 text-slate-400" />
            {item.targetDate}
          </span>
        </div>

        {/* Botões de Ação Imediata (Cobrança, Bloco ou Edição) */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {item.sourceType === 'dependency_followup' && item.rawDependency ? (
            <button
              onClick={() => {
                onOpenFollowUpModal(
                  item.milestoneId,
                  item.taskId,
                  item.rawDependency!,
                  'cobrar'
                );
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors shrink-0"
              title="Registrar contato/cobrança e recalcular próxima data"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Registrar Cobrança</span>
            </button>
          ) : (item.sourceType === 'task_deadline' || item.sourceType === 'subtask_due') && task ? (
            <div className="flex items-center gap-1.5">
              {onOpenSessionModal && (
                <button
                  onClick={() => {
                    onOpenSessionModal(
                      item.milestoneId,
                      item.taskId,
                      item.subtaskId || (task.subtasks[0]?.id)
                    );
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-xs transition-colors shrink-0"
                  title="Agendar Bloco de Foco no calendário para esta tarefa"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Bloco</span>
                </button>
              )}
              {onOpenTaskModal && (
                <button
                  onClick={() => onOpenTaskModal(item.milestoneId, task)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-colors shrink-0"
                >
                  Ver Tarefa
                </button>
              )}
            </div>
          ) : item.sourceType === 'milestone_target' && milestone && onOpenMilestoneModal ? (
            <button
              onClick={() => onOpenMilestoneModal(milestone)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-xs transition-colors shrink-0"
            >
              Ver Marco
            </button>
          ) : null}

          {onSelectTab && (
            <button
              onClick={() => onSelectTab('tree')}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Ir para a Árvore Hierárquica"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Rastreabilidade hierárquica clicável */}
      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1 truncate">
          <span className="hover:text-slate-700 font-medium">{item.milestoneTitle}</span>
          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-600 truncate hover:text-indigo-600">{item.taskTitle}</span>
        </div>
        <span className="text-[9px] text-slate-400 shrink-0 italic">Clique para abrir detalhes</span>
      </div>
    </div>
  );
};
