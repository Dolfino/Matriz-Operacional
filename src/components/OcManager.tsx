import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Plus,
  Search,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { Objective, Task, Subtask, Dependency, FinancialStatus } from '../types';
import {
  formatCurrencyBRL,
  getFinancialTotals,
  getFinancialStatusLabel,
  getDependencyLifecycle,
} from '../utils/helpers';
import { APPROVAL_TIERS, getApprovalRuleForCost } from '../utils/approvalRules';
import { ApprovalChainBadge } from './ApprovalChainBadge';

interface OcItem {
  ocNumber: string;
  cost?: number;
  subtask: Subtask;
  task: Task;
  milestoneId: string;
  milestoneTitle: string;
  dependencies: Dependency[];
  financialStatus: FinancialStatus;
}

interface OcManagerProps {
  objective: Objective;
  onOpenFollowUpModal: (dep: Dependency, taskTitle: string) => void;
  onAdvanceApprovalStage?: (
    milestoneId: string,
    taskId: string,
    dependencyId: string,
    stageIndex: number
  ) => void;
  onUpdateSubtaskFinancialStatus?: (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    financialStatus: FinancialStatus
  ) => void;
}

export const OcManager: React.FC<OcManagerProps> = ({
  objective,
  onOpenFollowUpModal,
  onAdvanceApprovalStage,
  onUpdateSubtaskFinancialStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Collect all subtasks with an OC or cost
  const ocs: OcItem[] = [];
  objective.milestones.forEach((m) => {
    m.tasks.forEach((t) => {
      t.subtasks.forEach((s) => {
        if (s.ocNumber || s.orderCost) {
          // Determinar status financeiro compatível
          let fStatus: FinancialStatus = s.financialStatus || 'PREVISTO';
          if (!s.financialStatus) {
            const hasWaitingDep = t.dependencies.some((d) => {
              const { state } = getDependencyLifecycle(d);
              return state !== 'ATENDIDA';
            });
            if (hasWaitingDep) {
              fStatus = 'EM_APROVACAO';
            } else if (s.status === 'completed') {
              fStatus = 'PAGO';
            } else {
              fStatus = 'APROVADO';
            }
          }

          ocs.push({
            ocNumber: s.ocNumber || 'Sem OC formal',
            cost: s.orderCost,
            subtask: s,
            task: t,
            milestoneId: m.id,
            milestoneTitle: m.title,
            dependencies: t.dependencies,
            financialStatus: fStatus,
          });
        }
      });
    });
  });

  // Totais por situação financeira real (Item 7)
  const totals = getFinancialTotals(objective);

  const filtered = ocs.filter((item) => {
    const cost = item.cost || 0;
    if (selectedTierFilter === 'tier1' && cost > 500) return false;
    if (selectedTierFilter === 'tier2' && (cost <= 500 || cost > 2000)) return false;
    if (selectedTierFilter === 'tier3' && (cost <= 2000 || cost > 10000)) return false;
    if (selectedTierFilter === 'tier4' && cost <= 10000) return false;

    if (selectedStatusFilter !== 'all' && item.financialStatus !== selectedStatusFilter) {
      return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.ocNumber.toLowerCase().includes(term) ||
      item.subtask.title.toLowerCase().includes(term) ||
      item.task.title.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner com Totais por Situação (Item 7) */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white border border-purple-800/40 shadow-md">
        <div className="space-y-1 mb-5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
            Gestão Financeira & Ordens de Compra
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Central de OCs, Alçadas & Situação Financeira
          </h2>
          <p className="text-xs sm:text-sm text-purple-100/80 max-w-3xl">
            Distinção rigorosa de estados financeiros: <strong>Previsto</strong>,{' '}
            <strong>Em Aprovação</strong>, <strong>Aprovado</strong>, <strong>Contratado</strong>,{' '}
            <strong>Faturado</strong>, <strong>Encaminhado Pagamento</strong> e <strong>Pago</strong>.
          </p>
        </div>

        {/* Grade de Totais por Situação (Item 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total Previsto
            </span>
            <span className="text-sm sm:text-base font-black text-white">
              {formatCurrencyBRL(totals.totalPrevisto)}
            </span>
          </div>

          <div className="p-3 bg-amber-950/60 rounded-xl border border-amber-800 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">
              Em Aprovação
            </span>
            <span className="text-sm sm:text-base font-black text-amber-200">
              {formatCurrencyBRL(totals.emAprovacao)}
            </span>
          </div>

          <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-800 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-300 block">Aprovado</span>
            <span className="text-sm sm:text-base font-black text-blue-200">
              {formatCurrencyBRL(totals.aprovado)}
            </span>
          </div>

          <div className="p-3 bg-indigo-950/60 rounded-xl border border-indigo-800 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Contratado</span>
            <span className="text-sm sm:text-base font-black text-indigo-200">
              {formatCurrencyBRL(totals.contratado)}
            </span>
          </div>

          <div className="p-3 bg-purple-950/60 rounded-xl border border-purple-800 text-center">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">Faturado</span>
            <span className="text-sm sm:text-base font-black text-purple-200">
              {formatCurrencyBRL(totals.faturado)}
            </span>
          </div>

          <div className="p-3 bg-teal-950/60 rounded-xl border border-teal-800 text-center">
            <span className="text-[10px] uppercase font-bold text-teal-300 block">
              Enc. Pagamento
            </span>
            <span className="text-sm sm:text-base font-black text-teal-200">
              {formatCurrencyBRL(totals.encaminhadoPagamento)}
            </span>
          </div>

          <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-800 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Pago</span>
            <span className="text-sm sm:text-base font-black text-emerald-200">
              {formatCurrencyBRL(totals.pago)}
            </span>
          </div>
        </div>
      </div>

      {/* Regra de Alçadas Oficial */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Regra Oficial de Alçadas de Aprovação de OC
          </h3>
          <span className="text-xs text-slate-400">Fluxo progressivo por faixa orçamentária</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {APPROVAL_TIERS.map((tier, idx) => {
            const isFilterActive =
              (idx === 0 && selectedTierFilter === 'tier1') ||
              (idx === 1 && selectedTierFilter === 'tier2') ||
              (idx === 2 && selectedTierFilter === 'tier3') ||
              (idx === 3 && selectedTierFilter === 'tier4');

            return (
              <div
                key={idx}
                onClick={() => {
                  const filterKeys = ['tier1', 'tier2', 'tier3', 'tier4'];
                  setSelectedTierFilter(isFilterActive ? 'all' : filterKeys[idx]);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isFilterActive
                    ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900">{tier.range}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {tier.tierName}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-indigo-700 mt-1 flex items-center gap-1">
                  <span>{tier.flowText}</span>
                </div>

                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                  {tier.levels.map((lvl, lIdx) => (
                    <React.Fragment key={lvl}>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-700">
                        {lvl}
                      </span>
                      {lIdx < tier.levels.length - 1 && <span>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Busca & Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número da OC, fornecedor ou tarefa..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 font-medium">Situação:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              <option value="all">Todas as Situações</option>
              <option value="PREVISTO">Previsto</option>
              <option value="EM_APROVACAO">Em Aprovação</option>
              <option value="APROVADO">Aprovado</option>
              <option value="CONTRATADO">Contratado</option>
              <option value="FATURADO">Faturado</option>
              <option value="ENCAMINHADO_PAGAMENTO">Encaminhado Pagamento</option>
              <option value="PAGO">Pago</option>
            </select>
          </div>

          {selectedTierFilter !== 'all' && (
            <button
              onClick={() => setSelectedTierFilter('all')}
              className="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
            >
              Limpar filtro de alçada
            </button>
          )}

          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {filtered.length} registro(s)
          </span>
        </div>
      </div>

      {/* Tabela de OCs e Situação Financeira */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Nenhuma Ordem de Compra encontrada.</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Ao adicionar subtarefas com número de OC ou valor, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Número da OC</th>
                  <th className="px-5 py-3">Tarefa / Demanda</th>
                  <th className="px-5 py-3">Valor Estimado</th>
                  <th className="px-5 py-3">Situação Financeira</th>
                  <th className="px-5 py-3 min-w-[280px]">Esteira de Aprovação (Alçadas)</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((item, idx) => {
                  const waitingDep = item.dependencies.find((d) => {
                    const { state, isBlocking } = getDependencyLifecycle(d);
                    return state !== 'ATENDIDA';
                  });
                  const activeDep = item.dependencies[0] || null;
                  const fLabel = getFinancialStatusLabel(item.financialStatus);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                        {item.ocNumber}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        <div className="font-bold">{item.task.title}</div>
                        <span className="text-[11px] text-slate-500">{item.subtask.title}</span>
                        <div className="text-[10px] text-slate-400">{item.milestoneTitle}</div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">
                        {item.cost ? formatCurrencyBRL(item.cost) : '—'}
                      </td>

                      {/* Seletor de Situação Financeira (Item 7) */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <select
                          value={item.financialStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value as FinancialStatus;
                            onUpdateSubtaskFinancialStatus?.(
                              item.milestoneId,
                              item.task.id,
                              item.subtask.id,
                              newStatus
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${fLabel.badgeClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        >
                          <option value="PREVISTO">PREVISTO</option>
                          <option value="EM_APROVACAO">EM APROVAÇÃO</option>
                          <option value="APROVADO">APROVADO</option>
                          <option value="CONTRATADO">CONTRATADO</option>
                          <option value="FATURADO">FATURADO</option>
                          <option value="ENCAMINHADO_PAGAMENTO">ENCAMINHADO PAGAMENTO</option>
                          <option value="PAGO">PAGO</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <ApprovalChainBadge
                          stages={activeDep?.approvalStages}
                          cost={item.cost}
                          interactive={!!activeDep && !!onAdvanceApprovalStage}
                          onAdvanceStage={(stageIdx) => {
                            if (activeDep && onAdvanceApprovalStage) {
                              onAdvanceApprovalStage(
                                item.milestoneId,
                                item.task.id,
                                activeDep.id,
                                stageIdx
                              );
                            }
                          }}
                        />
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {waitingDep ? (
                          <button
                            onClick={() => onOpenFollowUpModal(waitingDep, item.task.title)}
                            className="px-3 py-1.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-2xs"
                          >
                            Cobrar OC
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Alçada Concluída
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
