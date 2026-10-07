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
  startDate?: string; // Data Início / Solicitação da dependência
  requestDate?: string; // Alias/retrocompatibilidade
  endDate?: string; // Data Fim / Prazo SLA
  slaDeadline?: string; // Alias/retrocompatibilidade
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
  startDate?: string; // Data Início da subtarefa
  dueDate?: string; // Data Fim / Prazo da subtarefa
  endDate?: string; // Alias para sincronização de período
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
  startDate?: string; // Data Início da tarefa
  deadline?: string; // Data Fim / Prazo final
  endDate?: string; // Alias de período
  subtasks: Subtask[];
  dependencies: Dependency[];
}

export interface Milestone {
  id: string;
  title: string; // Ex: "Infraestrutura contratada", "Espaço pronto"
  startDate?: string; // Data Início do marco
  targetDate?: string; // Data Fim / Meta do marco
  endDate?: string; // Alias de período
  description?: string;
  tasks: Task[];
}

export interface Objective {
  id: string;
  title: string; // Ex: "Encerramento CFM — 03/10"
  startDate?: string; // Data Início do projeto/objetivo
  eventDate: string; // "2026-10-03" (Data Fim / Evento)
  endDate?: string; // Alias de período
  description?: string;
  category: string;
  status: 'active' | 'archived' | 'completed';
  milestones: Milestone[];
}
