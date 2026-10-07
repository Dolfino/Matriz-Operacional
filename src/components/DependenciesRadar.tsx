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
  ExternalLink,
  PhoneCall,
  Mail,
  Calendar,
} from 'lucide-react';
import { Objective, Dependency, Task, Milestone } from '../types';
import { getDependencyStatusLabel, getSeverityLabel } from '../utils/helpers';
import { ApprovalChainBadge } from './ApprovalChainBadge';

interface FlatDependencyItem {
  dependency: Dependency;
  task: Task;
  milestone: Milestone;
}

interface DependenciesRadarProps {
  objective: Objective;
  onOpenFollowUpModal: (dependency: Dependency, taskTitle: string) => void;
  onUpdateStatus: (milestoneId: string, taskId: string, dependencyId: string, status: Dependency['status']) => void;
  onAdvanceApprovalStage?: (milestoneId: string, taskId: string, dependencyId: string, stageIndex: number) => void;
}

export const DependenciesRadar: React.FC<DependenciesRadarProps> = ({
  objective,
  onOpenFollowUpModal,
  onUpdateStatus,
  onAdvanceApprovalStage,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect all dependencies across all milestones and tasks
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

  // Extract unique departments/owners for filtering
  const departments = Array.from(
    new Set(flatDependencies.map((d) => d.dependency.departmentOrOwner.trim()))
  );

  // Metrics
  const total = flatDependencies.length;
  const waitingApproval = flatDependencies.filter((d) => d.dependency.status === 'waiting_approval').length;
  const activeBlockers = flatDependencies.filter((d) => d.dependency.status === 'blocked').length;
  const cleared = flatDependencies.filter((d) => d.dependency.status === 'cleared').length;

  // Filter list
  const filtered = flatDependencies.filter((item) => {
    if (filterStatus === 'waiting' && item.dependency.status !== 'waiting_approval') return false;
    if (filterStatus === 'blocked' && item.dependency.status !== 'blocked') return false;
    if (filterStatus === 'cleared' && item.dependency.status !== 'cleared') return false;
    if (filterDept !== 'all' && item.dependency.departmentOrOwner.trim() !== filterDept) return false;
    if (searchTerm) {
      const matchTitle = item.dependency.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchOwner = item.dependency.departmentOrOwner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTask = item.task.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchTitle && !matchOwner && !matchTask) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner explaining the radar */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white border border-amber-800/40 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Acompanhamento Ativo de Terceiros
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Radar de Bloqueios & Dependências Externas
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/80 max-w-2xl">
              Tudo o que <strong>não depende da sua execução direta</strong>, mas pode travar a entrega (Superintendência, Charles, CEOP, Suprimentos, Financeiro). Faça cobranças ativas e garanta a liberação dos SLAs.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="p-3 bg-amber-900/40 rounded-xl border border-amber-700/50 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">Aguardando</span>
              <span className="text-xl font-black text-amber-100">{waitingApproval}</span>
            </div>
            <div className="p-3 bg-rose-900/40 rounded-xl border border-rose-700/50 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Bloqueadores</span>
              <span className="text-xl font-black text-rose-100">{activeBlockers}</span>
            </div>
            <div className="p-3 bg-emerald-900/40 rounded-xl border border-emerald-700/50 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Liberados</span>
              <span className="text-xl font-black text-emerald-100">{cleared}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por pendência, responsável (ex: Charles) ou tarefa..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            >
              <option value="all">Todos os Status ({total})</option>
              <option value="waiting">Aguardando Aprovação ({waitingApproval})</option>
              <option value="blocked">Bloqueador Ativo ({activeBlockers})</option>
              <option value="cleared">Liberados ({cleared})</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
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

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-base">Nenhuma dependência com os filtros atuais</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tudo limpo ou nenhuma dependência cadastrada sob esses critérios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(({ dependency: dep, task, milestone }) => {
            const statusInfo = getDependencyStatusLabel(dep.status);
            const severityInfo = getSeverityLabel(dep.severity);
            const isCleared = dep.status === 'cleared';

            return (
              <div
                key={dep.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isCleared
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : dep.status === 'blocked'
                    ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/10'
                    : 'border-amber-300 bg-amber-50/10'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityInfo.color}`}
                    >
                      {severityInfo.label}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {dep.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{dep.departmentOrOwner}</span>
                    </div>
                  </div>

                  {/* Task & Marco context */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>Vinculado à Tarefa:</span>
                      <strong className="text-slate-800">{task.title}</strong>
                    </div>
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>Marco:</span>
                      <span className="text-slate-700">{milestone.title}</span>
                    </div>
                  </div>

                  {/* Notes / Context */}
                  {dep.notes && (
                    <p className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 italic">
                      &ldquo;{dep.notes}&rdquo;
                    </p>
                  )}

                  {/* SLA Countdown & Requests */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                    {dep.slaDeadline ? (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Data Limite: {dep.slaDeadline}
                      </span>
                    ) : (
                      <span>Sem prazo SLA definido</span>
                    )}

                    <span className="text-slate-500">
                      {dep.followUps?.length || 0} cobrança(s) registrada(s)
                    </span>
                  </div>

                  {/* Latest follow-up preview */}
                  {dep.followUps && dep.followUps.length > 0 && (
                    <div className="p-2 rounded bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900">
                      <strong className="block text-[10px] text-indigo-700 uppercase tracking-wide">
                        Último Follow-up ({dep.followUps[dep.followUps.length - 1].date}):
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
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenFollowUpModal(dep, task.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cobrar / Follow-up</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = isCleared ? 'waiting_approval' : 'cleared';
                      onUpdateStatus(milestone.id, task.id, dep.id, next);
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isCleared
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isCleared ? 'Reabrir Bloqueio' : 'Marcar Liberado'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
