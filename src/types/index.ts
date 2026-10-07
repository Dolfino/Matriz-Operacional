export type DependencyStatus = 'pending' | 'waiting_approval' | 'blocked' | 'cleared';
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

export interface Dependency {
  id: string;
  title: string; // Ex: "Aprovação da OC pela Superintendência"
  departmentOrOwner: string; // Ex: "Charles / Superintendência", "CEOP"
  status: DependencyStatus;
  severity: DependencySeverity;
  requestDate?: string;
  slaDeadline?: string;
  notes?: string;
  followUps: FollowUpLog[];
  linkedSubtaskId?: string; // Subtarefa que depende disto
  approvalStages?: ApprovalStage[]; // Cadeia de aprovação por alçadas
}

export type SubtaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string; // Ex: "Solicitar orçamento", "Definir fornecedor", "Abrir OC", "Confirmar contratação"
  status: SubtaskStatus;
  assignee?: string;
  ocNumber?: string;
  orderCost?: number;
  dueDate?: string;
  notes?: string;
  isExternalDependency?: boolean; // Se marcado, avisa para migrar para dependência
}

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';
export type TaskCategory = 'Fornecedor & OC' | 'Infraestrutura & Montagem' | 'Audiovisual & Técnica' | 'Operacional' | 'Outro';

export interface Task {
  id: string;
  title: string; // Ex: "Climatizadores", "Montagem do Piso Branco"
  description?: string;
  category: TaskCategory;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  subtasks: Subtask[];
  dependencies: Dependency[];
}

export interface Milestone {
  id: string;
  title: string; // Ex: "Infraestrutura contratada", "Espaço pronto"
  targetDate?: string;
  description?: string;
  tasks: Task[];
}

export interface Objective {
  id: string;
  title: string; // Ex: "Encerramento CFM — 03/10"
  eventDate: string; // "2026-10-03"
  description?: string;
  category: string;
  status: 'active' | 'archived' | 'completed';
  milestones: Milestone[];
}
