import React, { useState } from 'react';
import {
  Layers,
  ShieldAlert,
  Kanban,
  FileText,
  CalendarRange,
  Plus,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  Menu,
  X,
  Calendar,
  AlertTriangle,
  ChevronDown,
  Clock,
  BellRing,
} from 'lucide-react';
import { Objective } from '../types';
import { getObjectiveStats } from '../utils/helpers';
import { buildOperationalSchedule } from '../utils/scheduleProjection';

interface NavbarProps {
  objectives: Objective[];
  currentObjectiveId: string;
  onSelectObjective: (id: string) => void;
  onOpenNewObjective: () => void;
  activeTab: 'tree' | 'radar' | 'board' | 'ocs' | 'gantt' | 'schedule';
  onSelectTab: (tab: 'tree' | 'radar' | 'board' | 'ocs' | 'gantt' | 'schedule') => void;
  onOpenChecker: () => void;
  onOpenReport: () => void;
  onExportJson: () => void;
  onResetDefault: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  objectives,
  currentObjectiveId,
  onSelectObjective,
  onOpenNewObjective,
  activeTab,
  onSelectTab,
  onOpenChecker,
  onOpenReport,
  onExportJson,
  onResetDefault,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentObjective = objectives.find((o) => o.id === currentObjectiveId) || objectives[0];
  const stats = currentObjective ? getObjectiveStats(currentObjective) : null;
  const schedule = currentObjective ? buildOperationalSchedule(currentObjective, '2026-10-08') : null;
  const urgentActionsCount = schedule ? schedule.summary.overdueCount + schedule.summary.todayCount : 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-white">
                  Matriz Operacional
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Padrão de Gestão por Bloqueios
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Objetivo → Marco → Tarefa → Subtarefa → Dependência
              </p>
            </div>
          </div>

          {/* Objective Selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={currentObjectiveId}
                onChange={(e) => onSelectObjective(e.target.value)}
                className="appearance-none bg-slate-800/90 hover:bg-slate-800 text-white font-semibold text-xs py-2 pl-3 pr-8 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] sm:max-w-[280px] truncate"
              >
                {objectives.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={onOpenNewObjective}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors shrink-0"
              title="Criar Novo Objetivo"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Actions & Utilities */}
          <div className="hidden lg:flex items-center gap-2">
            {stats && (
              <div className="flex items-center gap-2 mr-2">
                {stats.blockedDependencies + stats.waitingDependencies > 0 && (
                  <button
                    onClick={() => onSelectTab('radar')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>{stats.blockedDependencies + stats.waitingDependencies} Bloqueio(s)</span>
                  </button>
                )}

                <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                  <span>{stats.progressPercent}% Concluído</span>
                </div>
              </div>
            )}

            <button
              onClick={onOpenChecker}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Checador</span>
            </button>

            <button
              onClick={onOpenReport}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório</span>
            </button>

            <button
              onClick={onExportJson}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Backup JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onResetDefault}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Restaurar Exemplo CFM (Padrão Operacional)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar">
          <button
            onClick={() => onSelectTab('tree')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'tree'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Árvore Hierárquica</span>
          </button>

          {/* NEW: Gráfico de Gantt Multi-Projetos Button */}
          <button
            onClick={() => onSelectTab('gantt')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'gantt'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-blue-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-amber-400" />
            <span>Gráfico de Gantt</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
              Multi-Projetos
            </span>
          </button>

          {/* NEW: Agenda & Cobranças (Etapa 4) */}
          <button
            onClick={() => onSelectTab('schedule')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Agenda & Cobranças</span>
            {urgentActionsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                {urgentActionsCount} hoje
              </span>
            ) : schedule && schedule.summary.totalPendingActions > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300 font-bold">
                {schedule.summary.totalPendingActions}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => onSelectTab('radar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'radar'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Radar de Bloqueios</span>
            {stats && stats.blockedDependencies + stats.waitingDependencies > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
                {stats.blockedDependencies + stats.waitingDependencies}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('board')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'board'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Quadro de Tarefas</span>
          </button>

          <button
            onClick={() => onSelectTab('ocs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'ocs'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Central de OCs & Valores</span>
          </button>
        </div>

        {/* Mobile Expanded Menu */}
        {isMenuOpen && (
          <div className="lg:hidden p-4 border-t border-slate-800 bg-slate-900 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  onSelectTab('schedule');
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-lg"
              >
                <Clock className="w-4 h-4 text-slate-950" />
                <span>Agenda & Cobranças ({urgentActionsCount > 0 ? `${urgentActionsCount} hoje` : 'Ativa'})</span>
              </button>
              <button
                onClick={() => {
                  onSelectTab('gantt');
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-lg"
              >
                <CalendarRange className="w-4 h-4 text-amber-400" />
                <span>Abrir Gráfico de Gantt (Multi-Projetos)</span>
              </button>
              <button
                onClick={() => {
                  onOpenChecker();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Checador de Granularidade</span>
              </button>
              <button
                onClick={() => {
                  onOpenReport();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-700"
              >
                <FileText className="w-4 h-4" />
                <span>Relatório Executivo</span>
              </button>
              <button
                onClick={() => {
                  onExportJson();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Backup JSON</span>
              </button>
              <button
                onClick={() => {
                  onResetDefault();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar Exemplo CFM</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
