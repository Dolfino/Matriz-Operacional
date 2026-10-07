import React from 'react';
import { CheckCircle2, Clock, Circle, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { ApprovalStage, ApprovalLevel } from '../types';
import { getActiveApprovalLevel, getApprovalRuleForCost } from '../utils/approvalRules';

interface ApprovalChainBadgeProps {
  stages?: ApprovalStage[];
  cost?: number;
  onAdvanceStage?: (stageIndex: number) => void;
  interactive?: boolean;
}

export const ApprovalChainBadge: React.FC<ApprovalChainBadgeProps> = ({
  stages,
  cost,
  onAdvanceStage,
  interactive = false,
}) => {
  // If no explicit stages provided but cost is available, compute theoretical flow
  let displayStages: ApprovalStage[] = stages || [];
  if (displayStages.length === 0 && cost && cost > 0) {
    const rule = getApprovalRuleForCost(cost);
    displayStages = rule.requiredLevels.map((lvl) => ({
      level: lvl,
      approved: false,
    }));
  }

  if (displayStages.length === 0) return null;

  const { isFullyApproved, stepIndex, totalSteps, activeLevelName } = getActiveApprovalLevel(displayStages);
  const ruleInfo = cost ? getApprovalRuleForCost(cost) : null;

  return (
    <div className="space-y-1.5 w-full">
      {/* Header with rule title */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
        <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-indigo-600" />
          Alçada de Aprovação de OC
        </span>
        {ruleInfo && (
          <span className={`px-2 py-0.2 rounded-full font-bold border ${ruleInfo.badgeColor}`}>
            {ruleInfo.ruleTitle}
          </span>
        )}
      </div>

      {/* Stepper bar */}
      <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-slate-50 border border-slate-200">
        {displayStages.map((stage, idx) => {
          const isCurrent = !stage.approved && (idx === 0 || displayStages[idx - 1].approved);
          const isPendingFuture = !stage.approved && !isCurrent;
          const isDone = stage.approved;

          return (
            <React.Fragment key={stage.level}>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isCurrent
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-300/40 shadow-xs'
                    : 'bg-slate-200/60 text-slate-500 border border-slate-300/60'
                }`}
                title={
                  isDone
                    ? `Aprovado por ${stage.approverName || stage.level} em ${stage.approvedAt || 'data não informada'}`
                    : isCurrent
                    ? `Aguardando aprovação atual de ${stage.level}`
                    : `Aguardará aprovação prévia para chegar em ${stage.level}`
                }
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                ) : (
                  <Circle className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {stage.approverName ? `${stage.level} (${stage.approverName})` : stage.level}
                </span>

                {interactive && onAdvanceStage && isCurrent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvanceStage(idx);
                    }}
                    className="ml-1 px-1.5 py-0.2 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-2xs transition-colors"
                    title={`Aprovar etapa da ${stage.level}`}
                  >
                    Aprovar
                  </button>
                )}
              </div>

              {idx < displayStages.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress status caption */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
        <span>
          {isFullyApproved
            ? '✓ Todas as instâncias da alçada aprovaram a contratação.'
            : `Aguardando instância: ${activeLevelName} (Etapa ${stepIndex}/${totalSteps})`}
        </span>
      </div>
    </div>
  );
};
