import { ApprovalLevel, ApprovalStage } from '../types';

export interface ApprovalRuleInfo {
  maxTier: ApprovalLevel;
  requiredLevels: ApprovalLevel[];
  description: string;
  ruleTitle: string;
  badgeColor: string;
}

export const APPROVAL_TIERS: {
  range: string;
  maxCost: number;
  levels: ApprovalLevel[];
  flowText: string;
  tierName: string;
}[] = [
  {
    range: 'Até R$ 500,00',
    maxCost: 500,
    levels: ['Gerência'],
    flowText: 'Gerência',
    tierName: 'Alçada Gerência',
  },
  {
    range: 'R$ 500,01 a R$ 2.000,00',
    maxCost: 2000,
    levels: ['Gerência', 'Superintendência'],
    flowText: 'Gerência → Superintendência',
    tierName: 'Alçada Superintendência',
  },
  {
    range: 'R$ 2.000,01 a R$ 10.000,00',
    maxCost: 10000,
    levels: ['Gerência', 'Superintendência', 'Diretoria'],
    flowText: 'Gerência → Superintendência → Diretoria',
    tierName: 'Alçada Diretoria',
  },
  {
    range: 'Acima de R$ 10.000,00',
    maxCost: Infinity,
    levels: ['Gerência', 'Superintendência', 'Diretoria', 'CEO'],
    flowText: 'Gerência → Superintendência → Diretoria → CEO',
    tierName: 'Alçada CEO',
  },
];

export function getApprovalRuleForCost(cost: number): ApprovalRuleInfo {
  if (cost <= 500) {
    return {
      maxTier: 'Gerência',
      requiredLevels: ['Gerência'],
      ruleTitle: 'Até R$ 500,00',
      description: 'Aprovação da Gerência.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }
  if (cost <= 2000) {
    return {
      maxTier: 'Superintendência',
      requiredLevels: ['Gerência', 'Superintendência'],
      ruleTitle: 'Até R$ 2.000,00',
      description: 'Gerência aprova → depois vai para a Superintendência.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    };
  }
  if (cost <= 10000) {
    return {
      maxTier: 'Diretoria',
      requiredLevels: ['Gerência', 'Superintendência', 'Diretoria'],
      ruleTitle: 'Até R$ 10.000,00',
      description: 'Gerência aprova → Superintendência → Diretoria.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  return {
    maxTier: 'CEO',
    requiredLevels: ['Gerência', 'Superintendência', 'Diretoria', 'CEO'],
    ruleTitle: 'Acima de R$ 10.000,00',
    description: 'Gerência aprova → Superintendência → Diretoria → CEO.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  };
}

export function createDefaultApprovalStages(cost: number): ApprovalStage[] {
  const rule = getApprovalRuleForCost(cost);
  return rule.requiredLevels.map((lvl) => ({
    level: lvl,
    approved: false,
  }));
}

export function getActiveApprovalLevel(stages?: ApprovalStage[]): {
  activeStage: ApprovalStage | null;
  activeLevelName: ApprovalLevel | null;
  isFullyApproved: boolean;
  stepIndex: number;
  totalSteps: number;
} {
  if (!stages || stages.length === 0) {
    return {
      activeStage: null,
      activeLevelName: null,
      isFullyApproved: false,
      stepIndex: 0,
      totalSteps: 0,
    };
  }

  const unapprovedIdx = stages.findIndex((s) => !s.approved);
  if (unapprovedIdx === -1) {
    return {
      activeStage: null,
      activeLevelName: null,
      isFullyApproved: true,
      stepIndex: stages.length,
      totalSteps: stages.length,
    };
  }

  return {
    activeStage: stages[unapprovedIdx],
    activeLevelName: stages[unapprovedIdx].level,
    isFullyApproved: false,
    stepIndex: unapprovedIdx + 1,
    totalSteps: stages.length,
  };
}
