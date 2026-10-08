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
} from 'lucide-react';
import { Objective, Dependency } from '../types';
import {
  buildOperationalSchedule,
  TemporalFollowUpItem,
  TemporalOwnerQueue,
} from '../utils/scheduleProjection';

interface OperationalScheduleViewProps {
  objective: Objective;
  onOpenFollowUpModal: (
    milestoneId: string,
    taskId: string,
    dep: Dependency,
    actionType?: 'cobrar' | 'followup'
  ) => void;
  onSelectTab: (tab: 'tree' | 'radar' | 'board' | 'ocs' | 'gantt' | 'schedule') => void;
}

export const OperationalScheduleView: React.FC<OperationalScheduleViewProps> = ({
  objective,
  onOpenFollowUpModal,
}) => {
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'week'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'dependency' | 'task' | 'milestone'>('all');
  const [activeViewMode, setActiveViewMode] = useState<'timeline' | 'by_owner'>('timeline');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');

  // Constrói a projeção temporal a partir dos dados reais do objetivo (data civil de referência: 08/10/2026)
  const schedule = buildOperationalSchedule(objective, '2026-10-08');

  // Filtragem dos itens da linha do tempo
  const filterItems = (items: TemporalFollowUpItem[]) => {
    return items.filter((item) => {
      if (selectedUrgencyFilter === 'overdue' && item.urgency !== 'overdue') return false;
      if (selectedUrgencyFilter === 'today' && item.urgency !== 'today') return false;
      if (selectedUrgencyFilter === 'tomorrow' && item.urgency !== 'tomorrow') return false;
      if (
        selectedUrgencyFilter === 'week' &&
        item.urgency !== 'overdue' &&
        item.urgency !== 'today' &&
        item.urgency !== 'tomorrow' &&
        item.urgency !== 'upcoming'
      )
        return false;

      if (selectedTypeFilter === 'dependency' && item.sourceType !== 'dependency_followup') return false;
      if (selectedTypeFilter === 'task' && item.sourceType !== 'task_deadline' && item.sourceType !== 'subtask_due')
        return false;
      if (selectedTypeFilter === 'milestone' && item.sourceType !== 'milestone_target') return false;

      if (selectedOwner !== 'all' && item.departmentOrOwner !== selectedOwner) return false;

      return true;
    });
  };

  const overdueFiltered = filterItems(schedule.queues.overdue);
  const todayFiltered = filterItems(schedule.queues.today);
  const tomorrowFiltered = filterItems(schedule.queues.tomorrow);
  const next7DaysFiltered = filterItems(schedule.queues.next7Days);
  const upcomingFiltered = filterItems(schedule.queues.upcoming);

  const totalFilteredCount =
    overdueFiltered.length +
    todayFiltered.length +
    tomorrowFiltered.length +
    next7DaysFiltered.length +
    upcomingFiltered.length;

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
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
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
          </div>
        </div>

        {/* Big Numbers de Tomada de Decisão */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'overdue' ? 'all' : 'overdue');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'overdue'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Atrasadas / Vencidas</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-600 mt-1 block">
              {schedule.summary.overdueCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Requer ação imediata</span>
          </button>

          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'today' ? 'all' : 'today');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'today'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Cobrar / Agir Hoje</span>
              <BellRing className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {schedule.summary.todayCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Foco do dia</span>
          </button>

          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'tomorrow' ? 'all' : 'tomorrow');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'tomorrow'
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Vence Amanhã</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {schedule.summary.tomorrowCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Atenção prévia</span>
          </button>

          <button
            onClick={() => {
              setSelectedUrgencyFilter(selectedUrgencyFilter === 'week' ? 'all' : 'week');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedUrgencyFilter === 'week'
                ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300'
                : 'bg-slate-50 hover:bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Próximos 7 Dias</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">
              {schedule.summary.next7DaysCount}
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
              {schedule.summary.totalPendingActions} ações na fila temporal
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
              {overdueFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-rose-100 text-rose-700 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-rose-900">
                          🚨 Ações e Cobranças Vencidas ({overdueFiltered.length})
                        </h3>
                        <p className="text-xs text-rose-600 font-medium">
                          Follow-ups ou prazos que já ultrapassaram a data limite estipulada.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {overdueFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: HOJE (FOCO OPERACIONAL DO DIA) */}
              {todayFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-300 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-amber-100 text-amber-800 rounded-lg">
                        <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          ⚡ O que Precisa ser Feito ou Cobrado Hoje ({todayFiltered.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Pauta diária de follow-up ativo e entregas programadas para hoje.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {todayFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 3: AMANHÃ (PREVISÃO E PREPARAÇÃO) */}
              {tomorrowFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-blue-100 text-blue-800 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          ⏳ Vencimentos e Cobranças de Amanhã ({tomorrowFiltered.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Antecipe cobranças para evitar que itens de amanhã se tornem bloqueios críticos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {tomorrowFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 4: PRÓXIMOS 7 DIAS */}
              {next7DaysFiltered.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-indigo-100 text-indigo-800 rounded-lg">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          📅 Próximos 7 Dias ({next7DaysFiltered.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Visão semanal antecipada de SLAs, prazos e entregas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {next7DaysFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        onOpenFollowUpModal={onOpenFollowUpModal}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 5: HORIZONTE EXPANDIDO (> 7 DIAS) */}
              {upcomingFiltered.length > 0 && selectedUrgencyFilter === 'all' && (
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Horizonte Posterior (&gt; 7 dias) &bull; {upcomingFiltered.length} item(ns)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {upcomingFiltered.map((item) => (
                      <TimelineItemCard
                        key={item.id}
                        item={item}
                        onOpenFollowUpModal={onOpenFollowUpModal}
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
                    : owner.overdueCount > 0
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
                    ) : owner.overdueCount > 0 ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                        {owner.overdueCount} vencida(s)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold text-[10px]">
                        Regular
                      </span>
                    )}
                  </div>

                  {/* Lista de Itens do Responsável */}
                  <div className="mt-3 space-y-2">
                    {owner.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white text-xs space-y-1 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900 line-clamp-1">
                            {item.title}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${item.urgencyBadgeClass}`}>
                            {item.urgencyLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {item.nextActionOrImpact}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Data: {item.targetDate}</span>
                          {item.sourceType === 'dependency_followup' && item.rawDependency && (
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
                          )}
                        </div>
                      </div>
                    ))}
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
    </div>
  );
};

/**
 * Card individual de Ação Temporal / Cobrança
 */
interface TimelineItemCardProps {
  item: TemporalFollowUpItem;
  onOpenFollowUpModal: (
    milestoneId: string,
    taskId: string,
    dep: Dependency,
    actionType?: 'cobrar' | 'followup'
  ) => void;
}

const TimelineItemCard: React.FC<TimelineItemCardProps> = ({
  item,
  onOpenFollowUpModal,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
        item.isBlocking
          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
          : item.urgency === 'today'
          ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
          : 'bg-white border-slate-200 hover:border-slate-300'
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
            {item.recurrence && item.recurrence !== 'none' && (
              <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-semibold" title="Cadência de cobrança">
                <Repeat className="w-3 h-3" />
                {item.recurrence === 'daily' ? 'Diária' : item.recurrence === 'every_2_days' ? 'A cada 2d' : 'Semanal'}
              </span>
            )}
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
            {item.title}
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

      {/* Metadados e Breadcrumb Hierárquico */}
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

        {/* Botão de Cobrança / Follow-up */}
        {item.sourceType === 'dependency_followup' && item.rawDependency && (
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
          >
            <PhoneCall className="w-3 h-3" />
            <span>Registrar Cobrança</span>
          </button>
        )}
      </div>

      {/* Rastreabilidade hierárquica */}
      <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate pt-1 border-t border-slate-100">
        <span>{item.milestoneTitle}</span>
        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
        <span className="font-semibold text-slate-600 truncate">{item.taskTitle}</span>
      </div>
    </div>
  );
};
