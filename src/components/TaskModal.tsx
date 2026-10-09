import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
  User,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ShieldCheck,
  Calendar,
  Lock,
  Unlock,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Task,
  Subtask,
  Dependency,
  TaskCategory,
  ApprovalStage,
  FinancialStatus,
  DependencyLifecycleState,
} from '../types';
import { getApprovalRuleForCost, createDefaultApprovalStages } from '../utils/approvalRules';
import { formatCurrencyBRL, getDependencyLifecycle } from '../utils/helpers';
import { ApprovalChainBadge } from './ApprovalChainBadge';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: string;
  milestoneTitle: string;
  initialTask?: Task | null;
  onSaveTask: (milestoneId: string, task: Task) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  milestoneId,
  milestoneTitle,
  initialTask,
  onSaveTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Fornecedor & OC');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');

  // Subtasks list
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [newSubtaskStartDate, setNewSubtaskStartDate] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskOc, setNewSubtaskOc] = useState('');
  const [newSubtaskCost, setNewSubtaskCost] = useState('');
  const [newSubtaskEstimate, setNewSubtaskEstimate] = useState('45');
  const [newSubtaskFinancialStatus, setNewSubtaskFinancialStatus] =
    useState<FinancialStatus>('PREVISTO');

  // Dependencies list
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [newDepTitle, setNewDepTitle] = useState('');
  const [newDepOwner, setNewDepOwner] = useState('');
  const [newDepStartDate, setNewDepStartDate] = useState('');
  const [newDepSla, setNewDepSla] = useState('');
  const [newDepSeverity, setNewDepSeverity] = useState<Dependency['severity']>('critical');
  const [newDepLinkedSubtaskId, setNewDepLinkedSubtaskId] = useState<string>('');
  const [newDepImpact, setNewDepImpact] = useState('');
  const [newDepState, setNewDepState] = useState<DependencyLifecycleState>('AGUARDANDO');
  const [newDepIsBlocking, setNewDepIsBlocking] = useState<boolean>(true);

  // Reorder Subtasks in Modal
  const [draggedSubtaskIndex, setDraggedSubtaskIndex] = useState<number | null>(null);
  const [dragOverSubtaskIndex, setDragOverSubtaskIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setCategory(initialTask.category);
      setPriority(initialTask.priority);
      setStartDate(initialTask.startDate || '');
      setDeadline(initialTask.deadline || initialTask.endDate || '');
      setSubtasks(initialTask.subtasks || []);
      setDependencies(initialTask.dependencies || []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Fornecedor & OC');
      setPriority('high');
      setStartDate('');
      setDeadline('');
      setSubtasks([]);
      setDependencies([]);
    }
    setNewSubtaskTitle('');
    setNewSubtaskAssignee('');
    setNewSubtaskStartDate('');
    setNewSubtaskDueDate('');
    setNewSubtaskOc('');
    setNewSubtaskCost('');
    setNewSubtaskFinancialStatus('PREVISTO');
    setNewDepTitle('');
    setNewDepOwner('');
    setNewDepStartDate('');
    setNewDepSla('');
    setNewDepLinkedSubtaskId('');
    setNewDepImpact('');
    setNewDepState('AGUARDANDO');
    setNewDepIsBlocking(true);
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSub: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newSubtaskTitle.trim(),
      status: 'pending',
      assignee: newSubtaskAssignee.trim() || undefined,
      startDate: newSubtaskStartDate || undefined,
      dueDate: newSubtaskDueDate || undefined,
      endDate: newSubtaskDueDate || undefined,
      ocNumber: newSubtaskOc.trim() || undefined,
      orderCost: newSubtaskCost ? parseFloat(newSubtaskCost) : undefined,
      financialStatus: newSubtaskCost || newSubtaskOc ? newSubtaskFinancialStatus : undefined,
      estimatedMinutes: newSubtaskEstimate ? Math.max(0, parseInt(newSubtaskEstimate, 10)) : 45,
    };

    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
    setNewSubtaskAssignee('');
    setNewSubtaskStartDate('');
    setNewSubtaskDueDate('');
    setNewSubtaskOc('');
    setNewSubtaskCost('');
    setNewSubtaskEstimate('45');
    setNewSubtaskFinancialStatus('PREVISTO');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleToggleSubtaskStatus = (id: string) => {
    setSubtasks(
      subtasks.map((s) => {
        if (s.id !== id) return s;
        const nextStatus: Subtask['status'] =
          s.status === 'completed'
            ? 'pending'
            : s.status === 'pending'
            ? 'in_progress'
            : 'completed';
        return { ...s, status: nextStatus };
      })
    );
  };

  const handleMoveSubtask = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;
    const reordered = [...subtasks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setSubtasks(reordered);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSubtaskIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSubtaskIndex !== index) {
      setDragOverSubtaskIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSubtaskIndex === null || draggedSubtaskIndex === targetIndex) {
      setDraggedSubtaskIndex(null);
      setDragOverSubtaskIndex(null);
      return;
    }
    const reordered = [...subtasks];
    const [moved] = reordered.splice(draggedSubtaskIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setSubtasks(reordered);
    setDraggedSubtaskIndex(null);
    setDragOverSubtaskIndex(null);
  };

  const handleAddDependency = () => {
    if (!newDepTitle.trim() || !newDepOwner.trim()) return;

    const isAttended = newDepState === 'ATENDIDA';

    const newDep: Dependency = {
      id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newDepTitle.trim(),
      departmentOrOwner: newDepOwner.trim(),
      status: isAttended ? 'cleared' : newDepState === 'EM_RISCO' ? 'blocked' : 'waiting_approval',
      state: newDepState,
      bloqueandoFluxo: isAttended ? false : newDepIsBlocking,
      openedAt: newDepStartDate || new Date().toISOString().slice(0, 10),
      startDate: newDepStartDate || undefined,
      requestDate: newDepStartDate || undefined,
      slaDeadline: newDepSla || undefined,
      endDate: newDepSla || undefined,
      resolvedAt: isAttended ? new Date().toISOString().slice(0, 10) : undefined,
      impactNextAction: newDepImpact.trim() || undefined,
      linkedSubtaskId: newDepLinkedSubtaskId || undefined,
      severity: newDepSeverity,
      followUps: [],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          newState: newDepState,
          wasBlocking: false,
          isBlocking: isAttended ? false : newDepIsBlocking,
          note: 'Dependência cadastrada na tarefa.',
          author: 'Operações',
        },
      ],
    };

    setDependencies([...dependencies, newDep]);
    setNewDepTitle('');
    setNewDepOwner('');
    setNewDepStartDate('');
    setNewDepSla('');
    setNewDepLinkedSubtaskId('');
    setNewDepImpact('');
    setNewDepState('AGUARDANDO');
    setNewDepIsBlocking(true);
  };

  const handleAutoAddApprovalDependency = (cost: number, ocNumber?: string) => {
    const rule = getApprovalRuleForCost(cost);
    const stages = createDefaultApprovalStages(cost);
    const ocLabel = ocNumber ? ` da ${ocNumber}` : '';
    const nowStr = new Date().toISOString().slice(0, 10);
    const newDep: Dependency = {
      id: `dep-oc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `Aprovação de OC${ocLabel} (${rule.requiredLevels.join(' → ')})`,
      departmentOrOwner: rule.maxTier,
      status: 'waiting_approval',
      state: 'AGUARDANDO',
      bloqueandoFluxo: true,
      openedAt: startDate || nowStr,
      startDate: startDate || nowStr,
      requestDate: startDate || nowStr,
      slaDeadline: deadline || undefined,
      endDate: deadline || undefined,
      severity: cost > 2000 ? 'critical' : 'normal',
      impactNextAction: 'Libera formalização do contrato e emissão de empenho',
      notes: `Valor: ${formatCurrencyBRL(cost)}. Exige esteira de alçadas: ${rule.description}`,
      followUps: [],
      approvalStages: stages,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          newState: 'AGUARDANDO',
          wasBlocking: false,
          isBlocking: true,
          note: 'Alçada de aprovação gerada automaticamente pelo valor da OC.',
          author: 'Compras',
        },
      ],
    };
    setDependencies([...dependencies, newDep]);
  };

  const handleRemoveDependency = (id: string) => {
    setDependencies(dependencies.filter((d) => d.id !== id));
  };

  const handleToggleDepBlocking = (id: string) => {
    setDependencies(
      dependencies.map((d) => {
        if (d.id !== id) return d;
        const currentBlocking = typeof d.bloqueandoFluxo === 'boolean' ? d.bloqueandoFluxo : true;
        return { ...d, bloqueandoFluxo: !currentBlocking };
      })
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const savedTask: Task = {
      id: initialTask?.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      endDate: deadline || undefined,
      subtasks,
      dependencies,
    };

    onSaveTask(milestoneId, savedTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
              <span>Marco: {milestoneTitle}</span>
            </div>
            <h3 className="font-bold text-lg text-white mt-0.5">
              {initialTask ? 'Editar Tarefa Operacional' : 'Nova Tarefa Operacional'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome da Tarefa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Climatizadores (Contratar 4), Montagem do Piso Branco"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Fornecedor & OC">Fornecedor & OC</option>
                <option value="Infraestrutura & Montagem">Infraestrutura & Montagem</option>
                <option value="Audiovisual & Técnica">Audiovisual & Técnica</option>
                <option value="Operacional">Operacional</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="high">Alta Prioridade</option>
                <option value="medium">Média Prioridade</option>
                <option value="low">Baixa Prioridade</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Data Início da Tarefa
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Prazo Final (Término)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição Operacional
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes, especificações e orientações para a equipe."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section: Subtarefas Executáveis */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Subtarefas Executáveis ({subtasks.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Apenas ações diretas da equipe interna com estado próprio.
                </p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {subtasks.map((sub, idx) => (
                <div
                  key={sub.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border text-xs transition-all ${
                    draggedSubtaskIndex === idx
                      ? 'opacity-40 border-indigo-400 bg-indigo-50'
                      : dragOverSubtaskIndex === idx
                      ? 'border-indigo-500 ring-2 ring-indigo-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab shrink-0" />
                    <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSubtaskStatus(sub.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        sub.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : sub.status === 'in_progress'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {sub.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <span
                      className={`truncate ${
                        sub.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {sub.title}
                    </span>
                    {sub.ocNumber && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                        {sub.ocNumber}
                      </span>
                    )}
                    {sub.orderCost && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {formatCurrencyBRL(sub.orderCost)}
                      </span>
                    )}
                    {sub.financialStatus && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                        {sub.financialStatus}
                      </span>
                    )}
                    {sub.estimatedMinutes && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200">
                        ⏱️ {sub.estimatedMinutes}m est.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSubtask(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === subtasks.length - 1}
                      onClick={() => handleMoveSubtask(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(sub.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inputs to Add Subtask */}
            <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Nome da subtarefa executável (ex: Abrir OC, Solicitar orçamento)"
                  className="sm:col-span-5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
                <input
                  type="text"
                  value={newSubtaskAssignee}
                  onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                  placeholder="Responsável interno"
                  className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
                <input
                  type="date"
                  value={newSubtaskStartDate}
                  onChange={(e) => setNewSubtaskStartDate(e.target.value)}
                  className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                  title="Data Início"
                />
                <input
                  type="date"
                  value={newSubtaskDueDate}
                  onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                  className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                  title="Data Fim / Prazo"
                />
              </div>

              {/* OC, Situação Financeira e Tempo Estimado */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={newSubtaskOc}
                  onChange={(e) => setNewSubtaskOc(e.target.value)}
                  placeholder="Nº da OC (ex: OC-2026/8941)"
                  className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-mono"
                />
                <input
                  type="number"
                  value={newSubtaskCost}
                  onChange={(e) => setNewSubtaskCost(e.target.value)}
                  placeholder="Valor R$ estimado"
                  className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
                />
                <select
                  value={newSubtaskFinancialStatus}
                  onChange={(e) => setNewSubtaskFinancialStatus(e.target.value as FinancialStatus)}
                  className="sm:col-span-3 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                >
                  <option value="PREVISTO">Situação: PREVISTO</option>
                  <option value="EM_APROVACAO">Situação: EM APROVAÇÃO</option>
                  <option value="APROVADO">Situação: APROVADO</option>
                  <option value="CONTRATADO">Situação: CONTRATADO</option>
                  <option value="FATURADO">Situação: FATURADO</option>
                  <option value="ENCAMINHADO_PAGAMENTO">Situação: ENC. PAGAMENTO</option>
                  <option value="PAGO">Situação: PAGO</option>
                </select>
                <div className="sm:col-span-3 flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={newSubtaskEstimate}
                    onChange={(e) => setNewSubtaskEstimate(e.target.value)}
                    placeholder="Tempo"
                    className="w-full text-xs text-slate-800 font-medium focus:outline-hidden"
                    title="Tempo total estimado em minutos para esta subtarefa"
                  />
                  <span className="text-[10px] text-slate-500 font-bold shrink-0">min est.</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="sm:col-span-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>

              {/* Smart Alçada Suggestion */}
              {newSubtaskCost && parseFloat(newSubtaskCost) > 0 && (() => {
                const costVal = parseFloat(newSubtaskCost);
                const rule = getApprovalRuleForCost(costVal);
                return (
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Alçada de OC ({formatCurrencyBRL(costVal)}):</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] ${rule.badgeColor}`}>
                          {rule.ruleTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-800 mt-0.5">
                        Fluxo exigido: <strong>{rule.requiredLevels.join(' → ')}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAutoAddApprovalDependency(costVal, newSubtaskOc)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs"
                    >
                      + Criar Dependência da Alçada
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Section: Dependências Externas (Relação Transversal) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Dependências Externas ({dependencies.length})
                </h4>
                <p className="text-xs text-amber-900/80">
                  Relação operacional com terceiros fora do controle direto (Superintendência, CEOP,
                  Fornecedor).
                </p>
              </div>
            </div>

            {/* Dependencies list */}
            <div className="space-y-2.5">
              {dependencies.map((dep) => {
                const { state, isBlocking, badgeClass, label } = getDependencyLifecycle(dep);
                const linkedSub = subtasks.find((s) => s.id === dep.linkedSubtaskId);

                return (
                  <div
                    key={dep.id}
                    className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-amber-200 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{dep.title}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${badgeClass}`}
                          >
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDepBlocking(dep.id)}
                            className={`px-2 py-0.2 rounded text-[10px] font-bold border flex items-center gap-1 ${
                              isBlocking
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {isBlocking ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                            Bloqueando fluxo: {isBlocking ? 'SIM' : 'NÃO'}
                          </button>
                        </div>

                        <div className="text-slate-600 text-[11px] flex items-center gap-2">
                          <span>
                            Setor/Responsável: <strong>{dep.departmentOrOwner}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Aberto: <strong>{dep.openedAt || dep.startDate || 'Sem data'}</strong>
                          </span>
                          <span>➔</span>
                          <span>
                            SLA: <strong>{dep.slaDeadline || dep.endDate || 'Sem SLA'}</strong>
                          </span>
                        </div>

                        {dep.impactNextAction && (
                          <div className="text-[11px] text-indigo-900 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-200">
                            <strong>Impacto/Próxima Ação:</strong> {dep.impactNextAction}
                          </div>
                        )}

                        {linkedSub && (
                          <div className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-amber-700" />
                            <span>
                              Trava especificamente: <strong>&ldquo;{linkedSub.title}&rdquo;</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dep.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {dep.approvalStages && dep.approvalStages.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <ApprovalChainBadge stages={dep.approvalStages} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Dependency Input */}
            <div className="pt-2 border-t border-amber-200/80 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newDepTitle}
                  onChange={(e) => setNewDepTitle(e.target.value)}
                  placeholder="Nome da dependência (ex: Fornecedor enviar proposta, Aprovação de OC...)"
                  className="sm:col-span-4 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
                <input
                  type="text"
                  value={newDepOwner}
                  onChange={(e) => setNewDepOwner(e.target.value)}
                  placeholder="Responsável / Setor externo (ex: Charles / Superintendência)"
                  className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
                <input
                  type="date"
                  value={newDepStartDate}
                  onChange={(e) => setNewDepStartDate(e.target.value)}
                  className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                  title="Data de Abertura"
                />
                <input
                  type="date"
                  value={newDepSla}
                  onChange={(e) => setNewDepSla(e.target.value)}
                  className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                  title="Prazo SLA"
                />
                <button
                  type="button"
                  onClick={handleAddDependency}
                  disabled={!newDepTitle.trim() || !newDepOwner.trim()}
                  className="sm:col-span-1 flex items-center justify-center p-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg transition-colors font-bold"
                  title="Adicionar Dependência"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Subtask link & Impact row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 items-center">
                <div className="sm:col-span-4">
                  <select
                    value={newDepLinkedSubtaskId}
                    onChange={(e) => setNewDepLinkedSubtaskId(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-amber-300 bg-white text-slate-800"
                  >
                    <option value="">Trava: Toda a tarefa operacional</option>
                    {subtasks.map((s, sIdx) => (
                      <option key={s.id} value={s.id}>
                        Trava subtarefa {sIdx + 1}: {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={newDepImpact}
                    onChange={(e) => setNewDepImpact(e.target.value)}
                    placeholder="Impacto / Próxima ação que ela libera"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-amber-300 bg-white text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <select
                    value={newDepState}
                    onChange={(e) => setNewDepState(e.target.value as DependencyLifecycleState)}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-amber-300 bg-white text-slate-800 font-semibold"
                  >
                    <option value="AGUARDANDO">AGUARDANDO</option>
                    <option value="EM_RISCO">EM RISCO</option>
                    <option value="ATENDIDA">ATENDIDA</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="chkBloqueando"
                    checked={newDepIsBlocking}
                    onChange={(e) => setNewDepIsBlocking(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300"
                  />
                  <label htmlFor="chkBloqueando" className="text-[11px] font-bold text-rose-900 cursor-pointer">
                    Bloqueando fluxo
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
            >
              {initialTask ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
