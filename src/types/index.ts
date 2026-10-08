/**
 * Core Operacional v1.0.0
 * Schema: schema-v1.0
 * Contrato Invariante: 4 Níveis (Objetivo → Marco → Tarefa → Subtarefa) + Dependências Transversais
 */

export const CORE_OPERATIONAL_VERSION = 'v1.0.0';
export const CORE_SCHEMA_VERSION = 'schema-v1.0';

export type DependencyLifecycleState = 'AGUARDANDO' | 'ATENDIDA' | 'EM_RISCO';

// Status mantido para retrocompatibilidade
export type DependencyStatus = 'pending' | 'waiting_approval' | 'blocked' | 'cleared' | DependencyLifecycleState;
export type DependencySeverity = 'blocker' | 'critical' | 'normal' | 'low';

export type ApprovalLevel = 'Gerência' | 'Superintendência' | 'Diretoria' | 'CEO';

export interface ApprovalStage {
  level: ApprovalLevel;
  approved: boolean;
  approvedAt?: string;
  approverName?: string;
  notes?: string;
}

export interface FollowUpLog {
  id: string;
  date: string;
  note: string;
  author?: string;
}

export interface DependencyHistoryEntry {
  id: string;
  timestamp: string;
  previousState?: DependencyLifecycleState | string;
  newState: DependencyLifecycleState | string;
  wasBlocking: boolean;
  isBlocking: boolean;
  note?: string;
  author?: string;
}

export type FollowUpRecurrence = 'daily' | 'every_2_days' | 'weekly' | 'none';

export interface Dependency {
  id: string;
  title: string; // Ex: "Aprovação da OC pela Superintendência"
  departmentOrOwner: string; // Ex: "Charles / Superintendência", "CEOP"
  status: DependencyStatus; // Compatibilidade com versões anteriores
  severity?: DependencySeverity; // Criticidade operacional
  state?: DependencyLifecycleState; // Ciclo de vida próprio: AGUARDANDO | ATENDIDA | EM_RISCO
  bloqueandoFluxo: boolean; // Separação explícita: bloqueandoFluxo = true | false

  openedAt?: string; // Data de abertura da dependência
  startDate?: string; // Alias
  requestDate?: string; // Alias

  slaDeadline?: string; // Prazo / SLA limite
  endDate?: string; // Alias

  resolvedAt?: string; // Data em que foi efetivamente atendida
  impactNextAction?: string; // Impacto operacional / Próxima ação que ela libera
  notes?: string;

  // Etapa 4: Planejamento Temporal, Agenda e Follow-up Operacional
  nextFollowUpDate?: string; // Data planejada do próximo follow-up / cobrança (YYYY-MM-DD)
  followUpRecurrence?: FollowUpRecurrence; // Recorrência / cadência de cobrança
  responsibleOwner?: string; // Responsável interno por cobrar ou dar andamento
  reminderNotes?: string; // Observação ou estratégia da próxima cobrança

  followUps: FollowUpLog[]; // Histórico de cobranças / follow-ups
  history?: DependencyHistoryEntry[]; // Histórico de mudanças de estado operacional
  linkedSubtaskId?: string; // Subtarefa vinculada impactada
  approvalStages?: ApprovalStage[]; // Esteira de aprovações
}

export type SubtaskStatus = 'pending' | 'in_progress' | 'completed';

export type FinancialStatus =
  | 'PREVISTO'
  | 'EM_APROVACAO'
  | 'APROVADO'
  | 'CONTRATADO'
  | 'FATURADO'
  | 'ENCAMINHADO_PAGAMENTO'
  | 'PAGO';

export interface Subtask {
  id: string;
  title: string;
  status: SubtaskStatus;
  assignee?: string;
  ocNumber?: string;
  orderCost?: number;
  financialStatus?: FinancialStatus; // Novo: controle granular de status financeiro
  startDate?: string;
  dueDate?: string;
  endDate?: string;
  notes?: string;
  isExternalDependency?: boolean;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';
export type TaskCategory = 'Fornecedor & OC' | 'Infraestrutura & Montagem' | 'Audiovisual & Técnica' | 'Operacional' | 'Outro';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: 'high' | 'medium' | 'low';
  startDate?: string;
  deadline?: string;
  endDate?: string;
  subtasks: Subtask[];
  dependencies: Dependency[]; // Relações operacionais vinculadas (NÃO nível hierárquico)
}

export type MilestoneStatus = 'planejado' | 'em_andamento' | 'concluido' | 'atrasado';

export interface Milestone {
  id: string;
  title: string;
  status?: MilestoneStatus;
  completedAt?: string; // Data em que o marco foi efetivamente concluído
  startDate?: string;
  targetDate?: string; // Prazo planejado
  endDate?: string;
  description?: string;
  tasks: Task[];
}

export interface Objective {
  id: string;
  title: string;
  startDate?: string;
  eventDate: string;
  endDate?: string;
  description?: string;
  category: string;
  status: 'active' | 'archived' | 'completed';
  milestones: Milestone[];
}
