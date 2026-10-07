import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarRange,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Search,
  Filter,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Calendar,
  User,
  DollarSign,
  FileText,
  Building2,
  ArrowRight,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { Objective, Task, Milestone, Subtask, Dependency } from '../types';
import {
  GanttRowItem,
  GanttScale,
  buildGanttRows,
  getTimelineBounds,
  calculateDaysBetween,
  formatDateBR,
  formatDateISO,
  PT_MONTHS,
  PT_MONTHS_SHORT,
  PT_WEEKDAYS,
} from '../utils/ganttHelpers';
import { formatCurrencyBRL } from '../utils/helpers';

interface MultiProjectGanttViewProps {
  objectives: Objective[];
  currentObjectiveId: string;
  onSelectObjective: (id: string) => void;
  onOpenTaskModal: (milestoneId: string, task?: Task) => void;
  onOpenMilestoneModal?: (milestone: Milestone) => void;
}

export const MultiProjectGanttView: React.FC<MultiProjectGanttViewProps> = ({
  objectives,
  currentObjectiveId,
  onSelectObjective,
  onOpenTaskModal,
  onOpenMilestoneModal,
}) => {
  // Filter settings
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [scale, setScale] = useState<GanttScale>('day');
  const [depthFilter, setDepthFilter] = useState<'all' | 'tasks' | 'milestones'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Row collapse state
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});

  // Selected item for descriptive detail drawer
  const [selectedItem, setSelectedItem] = useState<GanttRowItem | null>(null);

  // Timeline container ref for horizontal scrolling
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Active objectives based on selection
  const activeObjectives = useMemo(() => {
    if (selectedProjectId === 'all') return objectives;
    return objectives.filter((o) => o.id === selectedProjectId);
  }, [objectives, selectedProjectId]);

  // Flattened hierarchical rows
  const rows = useMemo(() => {
    return buildGanttRows(
      activeObjectives,
      collapsedKeys,
      depthFilter,
      searchQuery,
      statusFilter
    );
  }, [activeObjectives, collapsedKeys, depthFilter, searchQuery, statusFilter]);

  // Timeline bounds across rows
  const bounds = useMemo(() => {
    return getTimelineBounds(rows);
  }, [rows]);

  // Column width based on zoom scale
  const colWidth = useMemo(() => {
    switch (scale) {
      case 'day':
        return 44; // 44px per day
      case 'week':
        return 80; // 80px per week
      case 'month':
        return 140; // 140px per month
    }
  }, [scale]);

  // Generate date points for the timeline header
  const timeUnits = useMemo(() => {
    const units: { date: Date; label: string; subLabel: string; isWeekend?: boolean; isFirstOfMonth?: boolean }[] = [];
    const current = new Date(bounds.minDate);
    const end = new Date(bounds.maxDate);

    if (scale === 'day') {
      while (current <= end) {
        const dayOfWeek = current.getDay();
        units.push({
          date: new Date(current),
          label: `${current.getDate()}`,
          subLabel: PT_WEEKDAYS[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isFirstOfMonth: current.getDate() === 1,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (scale === 'week') {
      // Advance by 7 days
      while (current <= end) {
        units.push({
          date: new Date(current),
          label: `Sem ${Math.ceil(current.getDate() / 7)}`,
          subLabel: `${current.getDate()}/${current.getMonth() + 1}`,
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Month
      const monthCur = new Date(current.getFullYear(), current.getMonth(), 1);
      while (monthCur <= end) {
        units.push({
          date: new Date(monthCur),
          label: PT_MONTHS_SHORT[monthCur.getMonth()],
          subLabel: `${monthCur.getFullYear()}`,
        });
        monthCur.setMonth(monthCur.getMonth() + 1);
      }
    }

    return units;
  }, [bounds, scale]);

  const totalTimelineWidth = useMemo(() => {
    if (scale === 'day') {
      return bounds.totalDays * colWidth;
    }
    return timeUnits.length * colWidth;
  }, [scale, bounds.totalDays, colWidth, timeUnits.length]);

  // Calculate pixel position of a date
  const getDatePixelOffset = (date: Date): number => {
    const startMs = bounds.minDate.getTime();
    const dateMs = date.getTime();
    const diffDays = (dateMs - startMs) / (1000 * 60 * 60 * 24);

    if (scale === 'day') {
      return Math.max(0, diffDays * colWidth);
    } else if (scale === 'week') {
      return Math.max(0, (diffDays / 7) * colWidth);
    } else {
      // month
      return Math.max(0, (diffDays / 30.4) * colWidth);
    }
  };

  // Calculate bar width in pixels
  const getBarPixelWidth = (start: Date, end: Date): number => {
    const days = calculateDaysBetween(start, end);
    if (scale === 'day') {
      return Math.max(colWidth - 4, days * colWidth - 6);
    } else if (scale === 'week') {
      return Math.max(24, (days / 7) * colWidth - 4);
    } else {
      return Math.max(20, (days / 30.4) * colWidth - 4);
    }
  };

  // Today position
  const today = useMemo(() => new Date(), []);
  const todayOffset = useMemo(() => getDatePixelOffset(today), [today, bounds, scale, colWidth]);

  // Scroll to Today on mount or button click
  const scrollToToday = () => {
    if (timelineScrollRef.current) {
      const scrollPos = Math.max(0, todayOffset - 250);
      timelineScrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Initial scroll near the active work area
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollLeft = 80;
    }
  }, [scale, selectedProjectId]);

  // Toggle Collapse
  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    setCollapsedKeys({});
  };

  const collapseAll = () => {
    const allKeys: Record<string, boolean> = {};
    rows.forEach((r) => {
      if (r.hasChildren) allKeys[r.uniqueKey] = true;
    });
    setCollapsedKeys(allKeys);
  };

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    let tasksCount = 0;
    let completedTasks = 0;
    let blockersCount = 0;
    let totalOcSum = 0;

    rows.forEach((r) => {
      if (r.type === 'task') {
        tasksCount++;
        if (r.status === 'completed') completedTasks++;
      }
      if (r.type === 'dependency' && (r.status === 'blocked' || r.status === 'waiting_approval')) {
        blockersCount++;
      }
      if (r.cost) totalOcSum += r.cost;
    });

    return {
      totalProjects: activeObjectives.length,
      tasksCount,
      completedTasks,
      blockersCount,
      totalOcSum,
      dateSpanDays: bounds.totalDays,
    };
  }, [rows, activeObjectives, bounds.totalDays]);

  // Print schedule
  const handlePrintGantt = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                <CalendarRange className="w-3 h-3 text-indigo-600" />
                Cronograma Integrado de Operações
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {activeObjectives.length} projeto(s) mapeado(s)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Gráfico de Gantt Multi-Projetos</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualização temporal completa por períodos: Objetivos ➔ Marcos ➔ Tarefas ➔ Subtarefas & Bloqueios Externos.
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={scrollToToday}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95"
              title="Centralizar linha do tempo no dia de hoje"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Ir para Hoje</span>
            </button>

            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              title="Expandir todas as ramificações"
            >
              Expandir Tudo
            </button>

            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              title="Recolher ramificações"
            >
              Recolher Tudo
            </button>

            <button
              onClick={handlePrintGantt}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Imprimir visualização do cronograma"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
          {/* Project Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Projetos no Gráfico
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 text-xs bg-white font-semibold focus:ring-2 focus:ring-indigo-500 truncate"
            >
              <option value="all">🌟 Todos os Projetos (Multi-Projetos)</option>
              {objectives.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.title}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom / Scale Switcher */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Escala Temporal
            </label>
            <div className="flex rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setScale('day')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  scale === 'day' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dias
              </button>
              <button
                type="button"
                onClick={() => setScale('week')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  scale === 'week' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semanas
              </button>
              <button
                type="button"
                onClick={() => setScale('month')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  scale === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Meses
              </button>
            </div>
          </div>

          {/* Hierarchy Depth */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Profundidade
            </label>
            <select
              value={depthFilter}
              onChange={(e) => setDepthFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
            >
              <option value="all">Completo (Até Subtarefas & Bloqueios)</option>
              <option value="tasks">Até Tarefas Operacionais</option>
              <option value="milestones">Apenas Marcos & Objetivos</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Filtro de Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
            >
              <option value="all">Todos os Status</option>
              <option value="in_progress">Em Andamento</option>
              <option value="blocked">🚨 Com Bloqueio / Aguardando Aprovação</option>
              <option value="completed">Concluídos</option>
            </select>
          </div>

          {/* Search bar */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Buscar Item
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, responsável, OC..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Janela do Cronograma
          </span>
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            {formatDateBR(bounds.minDate)} ➔ {formatDateBR(bounds.maxDate)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {bounds.totalDays} dias cobertos
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Tarefas Mapeadas
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {summaryMetrics.tasksCount} tarefas
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {summaryMetrics.completedTasks} concluída(s)
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Bloqueios no Caminho
          </span>
          <span className="text-base font-black text-amber-700 mt-0.5 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            {summaryMetrics.blockersCount} dependência(s)
          </span>
          <span className="text-[11px] text-slate-500">
            Aguardando terceiros / alçadas
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Comprometimento em OCs
          </span>
          <span className="text-base font-black text-purple-700 mt-0.5 block font-mono">
            {formatCurrencyBRL(summaryMetrics.totalOcSum)}
          </span>
          <span className="text-[11px] text-slate-500">
            Total previsto no período
          </span>
        </div>
      </div>

      {/* Main Gantt Split Container: Table Left + Timeline Right */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Gantt Interactive Area */}
        <div className="flex overflow-hidden relative">
          {/* Left Fixed Hierarchy Column (340px) */}
          <div className="w-[310px] sm:w-[380px] shrink-0 border-r border-slate-200 bg-white z-20 flex flex-col shadow-xs">
            {/* Table Header */}
            <div className="h-16 px-4 py-2 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between font-bold text-xs text-slate-700">
              <span>Estrutura & Itens do Cronograma</span>
              <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
                {rows.length} itens
              </span>
            </div>

            {/* Hierarchy Rows */}
            <div className="divide-y divide-slate-100 overflow-y-hidden">
              {rows.map((row) => {
                const isSelected = selectedItem?.uniqueKey === row.uniqueKey;

                return (
                  <div
                    key={row.uniqueKey}
                    onClick={() => setSelectedItem(row)}
                    style={{ paddingLeft: `${row.level * 16 + 12}px` }}
                    className={`h-11 pr-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/90 border-l-4 border-indigo-600 text-indigo-950 font-bold'
                        : row.type === 'objective'
                        ? 'bg-slate-900 text-white font-black hover:bg-slate-800'
                        : row.type === 'milestone'
                        ? 'bg-slate-100 font-bold text-slate-900 hover:bg-slate-200'
                        : row.type === 'dependency'
                        ? 'bg-amber-50/50 text-amber-950 hover:bg-amber-100/60'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                      {row.hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(row.uniqueKey);
                          }}
                          className={`p-0.5 rounded transition-colors ${
                            row.type === 'objective'
                              ? 'text-slate-300 hover:text-white'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {row.isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}

                      {/* Level Icon Badge */}
                      {row.type === 'objective' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      )}
                      {row.type === 'milestone' && (
                        <span className="w-2 h-2 rotate-45 bg-blue-600 shrink-0" />
                      )}
                      {row.type === 'task' && (
                        <span className="w-2 h-2 rounded-sm bg-emerald-600 shrink-0" />
                      )}
                      {row.type === 'subtask' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      )}
                      {row.type === 'dependency' && (
                        <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                      )}

                      <span className="truncate select-none">{row.title}</span>
                    </div>

                    {/* Progress / Status Tag */}
                    <div className="shrink-0 flex items-center gap-1">
                      {row.type === 'task' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {row.progressPercent}%
                        </span>
                      )}
                      {row.type === 'dependency' && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            row.status === 'cleared'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-200 text-amber-900 animate-pulse'
                          }`}
                        >
                          {row.status === 'cleared' ? 'Liberado' : 'SLA'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Scrollable Timeline Grid */}
          <div
            ref={timelineScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden select-none relative bg-slate-50/30"
          >
            <div style={{ width: `${totalTimelineWidth}px` }} className="relative">
              {/* Timeline Header (Months & Days) */}
              <div className="h-16 border-b border-slate-200 bg-slate-100 sticky top-0 z-10 flex flex-col">
                {/* Scale Row */}
                <div className="flex-1 flex border-b border-slate-200/80 divide-x divide-slate-200 text-[11px] font-bold text-slate-700 bg-slate-100/90">
                  {timeUnits.map((unit, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${colWidth}px` }}
                      className={`h-full flex flex-col items-center justify-center shrink-0 ${
                        unit.isWeekend ? 'bg-slate-200/40 text-slate-400' : ''
                      }`}
                    >
                      <span className="text-[10px] font-bold leading-tight">{unit.label}</span>
                      <span className="text-[9px] text-slate-400 font-normal leading-tight">
                        {unit.subLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical Today Line */}
              {todayOffset >= 0 && todayOffset <= totalTimelineWidth && (
                <div
                  style={{ left: `${todayOffset}px` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none shadow-sm"
                >
                  <div className="sticky top-1 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    HOJE
                  </div>
                </div>
              )}

              {/* Grid Background Lines */}
              <div className="absolute inset-0 flex pointer-events-none divide-x divide-slate-200/40">
                {timeUnits.map((u, i) => (
                  <div
                    key={i}
                    style={{ width: `${colWidth}px` }}
                    className={`h-full shrink-0 ${u.isWeekend ? 'bg-slate-100/40' : ''}`}
                  />
                ))}
              </div>

              {/* Gantt Bars Rows */}
              <div className="relative divide-y divide-slate-100">
                {rows.map((row) => {
                  const barLeft = getDatePixelOffset(row.startDate);
                  const barWidth = getBarPixelWidth(row.startDate, row.endDate);
                  const isSelected = selectedItem?.uniqueKey === row.uniqueKey;

                  return (
                    <div
                      key={row.uniqueKey}
                      onClick={() => setSelectedItem(row)}
                      className={`h-11 relative flex items-center transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-100/50'
                      }`}
                    >
                      {/* Interactive Gantt Bar */}
                      <div
                        style={{
                          left: `${barLeft}px`,
                          width: `${barWidth}px`,
                        }}
                        className={`absolute h-7 rounded-lg shadow-2xs flex items-center px-2 transition-all group overflow-hidden ${
                          row.type === 'objective'
                            ? 'bg-slate-900 border border-slate-700 text-white font-bold'
                            : row.type === 'milestone'
                            ? 'bg-indigo-600 border border-indigo-500 text-white font-bold'
                            : row.type === 'task'
                            ? row.status === 'completed'
                              ? 'bg-emerald-600 border border-emerald-500 text-white'
                              : row.status === 'blocked'
                              ? 'bg-rose-600 border border-rose-500 text-white'
                              : 'bg-indigo-600 border border-indigo-400 text-white'
                            : row.type === 'dependency'
                            ? 'bg-amber-400 border border-amber-500 text-amber-950 font-bold'
                            : 'bg-slate-200 border border-slate-300 text-slate-800'
                        } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 scale-[1.02]' : ''}`}
                        title={`${row.title}\nPeríodo: ${formatDateBR(row.startDate)} até ${formatDateBR(
                          row.endDate
                        )} (${row.durationDays} dias)\nStatus: ${row.status}`}
                      >
                        {/* Progress Fill Indicator */}
                        {row.progressPercent > 0 && row.progressPercent < 100 && (
                          <div
                            style={{ width: `${row.progressPercent}%` }}
                            className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none"
                          />
                        )}

                        {/* Bar Content */}
                        <div className="relative z-10 flex items-center justify-between w-full min-w-0 text-[11px] gap-1">
                          <span className="truncate font-semibold drop-shadow-xs">
                            {row.title}
                          </span>
                          <span className="text-[10px] opacity-90 shrink-0 font-mono">
                            {row.durationDays}d
                          </span>
                        </div>
                      </div>

                      {/* Floating Date Label beside the bar for small bars */}
                      {barWidth < 120 && (
                        <div
                          style={{ left: `${barLeft + barWidth + 8}px` }}
                          className="absolute text-[10px] text-slate-500 font-medium whitespace-nowrap pointer-events-none"
                        >
                          {formatDateBR(row.startDate)} ➔ {formatDateBR(row.endDate)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-700">Legenda do Cronograma:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-900 border border-slate-700" />
              <span>Projeto / Objetivo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600" />
              <span>Marco / Tarefa Ativa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600" />
              <span>Concluído (100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-600" />
              <span>Tarefa Bloqueada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500" />
              <span>Dependência / Espera SLA</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Clique em qualquer barra ou linha para abrir a ficha descritiva completa.
          </div>
        </div>
      </div>

      {/* Descriptive Item Drawer / Modal when an item is selected */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Drawer Header */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                selectedItem.type === 'objective'
                  ? 'bg-slate-900'
                  : selectedItem.type === 'milestone'
                  ? 'bg-indigo-900'
                  : selectedItem.type === 'dependency'
                  ? 'bg-amber-600'
                  : selectedItem.status === 'blocked'
                  ? 'bg-rose-900'
                  : 'bg-indigo-950'
              }`}
            >
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                  {selectedItem.type === 'objective'
                    ? 'PROJETO / OBJETIVO'
                    : selectedItem.type === 'milestone'
                    ? 'MARCO / ENTREGÁVEL'
                    : selectedItem.type === 'task'
                    ? 'TAREFA OPERACIONAL'
                    : selectedItem.type === 'subtask'
                    ? 'SUBTAREFA EXECUTÁVEL'
                    : 'DEPENDÊNCIA / BLOQUEIO EXTERNO'}
                </span>
                <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Hierarchy Context */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Vínculo Hierárquico
                </span>
                <div className="text-slate-800 font-medium">
                  <strong>Projeto:</strong> {selectedItem.objectiveTitle}
                </div>
                {selectedItem.milestoneTitle && (
                  <div className="text-slate-700">
                    <strong>Marco:</strong> {selectedItem.milestoneTitle}
                  </div>
                )}
                {selectedItem.taskTitle && selectedItem.type !== 'task' && (
                  <div className="text-slate-700">
                    <strong>Tarefa:</strong> {selectedItem.taskTitle}
                  </div>
                )}
              </div>

              {/* Date Period Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-900 block">
                    Data de Início
                  </span>
                  <span className="text-sm font-bold text-indigo-950 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    {formatDateBR(selectedItem.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-900 block">
                    Data de Término / Prazo
                  </span>
                  <span className="text-sm font-bold text-indigo-950 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    {formatDateBR(selectedItem.endDate)}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-indigo-900 font-semibold">
                  <span>Duração Estimada:</span>
                  <span className="text-xs bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {selectedItem.durationDays} dias corridos
                  </span>
                </div>
              </div>

              {/* Status & Progress */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Status Atual
                  </span>
                  <span className="text-xs font-bold text-slate-900 capitalize mt-0.5 block">
                    {selectedItem.status}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Progresso Concluído
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${selectedItem.progressPercent}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-900">{selectedItem.progressPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Responsible / Assignee / OC */}
              {(selectedItem.assigneeOrOwner || selectedItem.cost || selectedItem.ocNumber) && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Responsabilidade & Dados Financeiros
                  </span>
                  {selectedItem.assigneeOrOwner && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Responsável / Alçada: <strong>{selectedItem.assigneeOrOwner}</strong></span>
                    </div>
                  )}
                  {selectedItem.ocNumber && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ordem de Compra: <strong className="font-mono">{selectedItem.ocNumber}</strong></span>
                    </div>
                  )}
                  {selectedItem.cost && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Valor Previsto: <strong>{formatCurrencyBRL(selectedItem.cost)}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Description / Notes */}
              {selectedItem.notes && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Descrição & Observações Operacionais
                  </span>
                  <p className="text-slate-700 leading-relaxed">{selectedItem.notes}</p>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>

              {selectedItem.type === 'task' && selectedItem.milestoneId && (
                <button
                  type="button"
                  onClick={() => {
                    const mId = selectedItem.milestoneId!;
                    const t = selectedItem.originalItem as Task;
                    setSelectedItem(null);
                    onOpenTaskModal(mId, t);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Editar Tarefa & Subtarefas
                </button>
              )}

              {selectedItem.type === 'milestone' && onOpenMilestoneModal && (
                <button
                  type="button"
                  onClick={() => {
                    const m = selectedItem.originalItem as Milestone;
                    setSelectedItem(null);
                    onOpenMilestoneModal(m);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Editar Período do Marco
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
