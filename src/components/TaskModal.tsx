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
} from 'lucide-react';
import { Task, Subtask, Dependency, TaskCategory, ApprovalStage } from '../types';
import { getApprovalRuleForCost, createDefaultApprovalStages } from '../utils/approvalRules';
import { formatCurrencyBRL } from '../utils/helpers';
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

  // Dependencies list
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [newDepTitle, setNewDepTitle] = useState('');
  const [newDepOwner, setNewDepOwner] = useState('');
  const [newDepStartDate, setNewDepStartDate] = useState('');
  const [newDepSla, setNewDepSla] = useState('');
  const [newDepSeverity, setNewDepSeverity] = useState<Dependency['severity']>('critical');
  const [newDepLinkedSubtaskId, setNewDepLinkedSubtaskId] = useState<string>('');

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
    setNewDepTitle('');
    setNewDepOwner('');
    setNewDepStartDate('');
    setNewDepSla('');
    setNewDepLinkedSubtaskId('');
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
    };

    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
    setNewSubtaskAssignee('');
    setNewSubtaskStartDate('');
    setNewSubtaskDueDate('');
    setNewSubtaskOc('');
    setNewSubtaskCost('');
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

    const newDep: Dependency = {
      id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newDepTitle.trim(),
      departmentOrOwner: newDepOwner.trim(),
      status: 'waiting_approval',
      severity: newDepSeverity,
      startDate: newDepStartDate || undefined,
      requestDate: newDepStartDate || undefined,
      endDate: newDepSla || undefined,
      slaDeadline: newDepSla || undefined,
      linkedSubtaskId: newDepLinkedSubtaskId || undefined,
      followUps: [],
    };

    setDependencies([...dependencies, newDep]);
    setNewDepTitle('');
    setNewDepOwner('');
    setNewDepStartDate('');
    setNewDepSla('');
    setNewDepLinkedSubtaskId('');
  };

  const handleAutoAddApprovalDependency = (cost: number, ocNumber?: string) => {
    const rule = getApprovalRuleForCost(cost);
    const stages = createDefaultApprovalStages(cost);
    const ocLabel = ocNumber ? ` da ${ocNumber}` : '';
    const newDep: Dependency = {
      id: `dep-oc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `Aprovação de OC${ocLabel} (${rule.requiredLevels.join(' → ')})`,
      departmentOrOwner: rule.maxTier,
      status: 'waiting_approval',
      severity: cost > 2000 ? 'critical' : 'normal',
      startDate: startDate || new Date().toISOString().slice(0, 10),
      requestDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: deadline || undefined,
      slaDeadline: deadline || undefined,
      notes: `Valor: ${formatCurrencyBRL(cost)}. Exige esteira de alçadas: ${rule.description}`,
      followUps: [],
      approvalStages: stages,
    };
    setDependencies([...dependencies, newDep]);
  };

  const handleRemoveDependency = (id: string) => {
    setDependencies(dependencies.filter((d) => d.id !== id));
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white"
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
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white"
              >
                <option value="high">Alta / Crítica</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>

            {/* Período por Data da Tarefa */}
            <div className="md:col-span-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <span className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Período da Tarefa (Cronograma & Gantt)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Data de Fim / Prazo Final
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição ou Especificação Técnica
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Detalhes técnicos, contato do fornecedor ou orientações de montagem..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm"
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
                  Regra: Ação executável direta com estado independente que você ou sua equipe executa.
                </p>
              </div>
            </div>

            {/* Subtask list header */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
              <span className="flex items-center gap-1.5 font-medium text-indigo-900">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                Arraste pelo ícone ⋮⋮ ou use as setas ↑↓ para reordenar a sequência
              </span>
              <span className="text-slate-400 font-medium">
                {subtasks.length} item(ns)
              </span>
            </div>

            {/* Subtask list */}
            <div className="space-y-1.5">
              {subtasks.map((sub, idx) => {
                const isBeingDragged = draggedSubtaskIndex === idx;
                const isTargeted = dragOverSubtaskIndex === idx;

                return (
                  <div
                    key={sub.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border transition-all ${
                      isBeingDragged
                        ? 'opacity-40 border-indigo-400 bg-indigo-50/50 scale-[0.99]'
                        : isTargeted
                        ? 'border-indigo-600 border-2 bg-indigo-50/70 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSubtaskStatus(sub.id)}
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                          sub.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : sub.status === 'in_progress'
                            ? 'bg-amber-500 text-white'
                            : 'border border-slate-300 hover:border-slate-400'
                        }`}
                        title="Alternar status: Pendente ➔ Em Andamento ➔ Concluído"
                      >
                        {sub.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {sub.status === 'in_progress' && <Clock className="w-3 h-3" />}
                      </button>

                      <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                        <span
                          className={`text-xs font-medium truncate ${
                            sub.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {idx + 1}. {sub.title}
                        </span>

                        {/* Date period badge for subtask */}
                        {(sub.startDate || sub.dueDate) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {sub.startDate ? sub.startDate : 'Início'} ➔ {sub.dueDate || sub.endDate || 'Prazo'}
                          </span>
                        )}

                        {sub.assignee && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            <User className="w-3 h-3 text-slate-400" />
                            {sub.assignee}
                          </span>
                        )}
                        {sub.ocNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {sub.ocNumber}
                          </span>
                        )}
                        {sub.orderCost && (
                          <span className="text-[11px] text-emerald-700 font-semibold shrink-0">
                            {formatCurrencyBRL(sub.orderCost)}
                          </span>
                        )}

                        {/* Indication if this subtask is locked by a dependency */}
                        {(() => {
                          const blockingDep = dependencies.find((d) => d.linkedSubtaskId === sub.id);
                          if (!blockingDep) return null;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                blockingDep.status === 'cleared'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                              title={`Esta subtarefa depende de: ${blockingDep.title}`}
                            >
                              {blockingDep.status === 'cleared' ? '✓ Desbloqueada por:' : '🔒 Aguarda:'} {blockingDep.departmentOrOwner}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Controls: Up/Down arrows + Delete button */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSubtask(idx, 'up')}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === subtasks.length - 1}
                          onClick={() => handleMoveSubtask(idx, 'down')}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(sub.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Excluir subtarefa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Subtask Input */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Ex: Solicitar orçamento, Definir fornecedor, Abrir OC..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>

              {/* Fields for subtask: Dates, Assignee, OC, Cost */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <input
                    type="date"
                    value={newSubtaskStartDate}
                    onChange={(e) => setNewSubtaskStartDate(e.target.value)}
                    placeholder="Data Início"
                    className="w-full px-2.5 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-700"
                    title="Data de Início da Subtarefa"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={newSubtaskDueDate}
                    onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                    placeholder="Data Fim / Prazo"
                    className="w-full px-2.5 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-700"
                    title="Data Fim / Prazo da Subtarefa"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={newSubtaskAssignee}
                    onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                    placeholder="Responsável (opcional)"
                    className="w-full px-2.5 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-700"
                  />
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newSubtaskOc}
                    onChange={(e) => setNewSubtaskOc(e.target.value)}
                    placeholder="Nº OC"
                    className="w-1/2 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-700 font-mono"
                  />
                  <input
                    type="number"
                    value={newSubtaskCost}
                    onChange={(e) => setNewSubtaskCost(e.target.value)}
                    placeholder="R$ Valor"
                    className="w-1/2 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-700"
                  />
                </div>
              </div>

              {/* Smart Alçada Suggestion when cost is typed */}
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

          {/* Section: Dependências e Bloqueios Externos */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Dependências Externas & Bloqueios ({dependencies.length})
                </h4>
                <p className="text-xs text-amber-900/80">
                  Aprovações ou entregas que dependem de terceiros (Superintendência, CEOP, Financeiro).
                </p>
              </div>
            </div>

            {/* Dependencies list */}
            <div className="space-y-2">
              {dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-amber-200 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">{dep.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          {dep.departmentOrOwner}
                        </span>
                      </div>
                      {(dep.startDate || dep.requestDate || dep.slaDeadline || dep.endDate) && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>
                            Aberto: <strong>{dep.startDate || dep.requestDate || 'Sem data'}</strong>
                          </span>
                          <span>➔</span>
                          <span>
                            Prazo SLA: <strong className="text-slate-800">{dep.endDate || dep.slaDeadline || 'Sem prazo'}</strong>
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

                  {/* Explicit link to subtask */}
                  {(() => {
                    const linkedSub = subtasks.find((s) => s.id === dep.linkedSubtaskId);
                    if (!linkedSub) return null;
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        <span>🔒 Bloqueia especificamente a execução de:</span>
                        <strong className="text-slate-900">&ldquo;{linkedSub.title}&rdquo;</strong>
                      </div>
                    );
                  })()}

                  {/* Render approval chain stepper if present */}
                  {dep.approvalStages && dep.approvalStages.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <ApprovalChainBadge stages={dep.approvalStages} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Dependency Input */}
            <div className="pt-2 border-t border-amber-200/80 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newDepTitle}
                  onChange={(e) => setNewDepTitle(e.target.value)}
                  placeholder="Ex: Fornecedor enviar proposta, Aprovação de OC..."
                  className="sm:col-span-4 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
                <input
                  type="text"
                  value={newDepOwner}
                  onChange={(e) => setNewDepOwner(e.target.value)}
                  placeholder="Responsável (ex: CEOP / Diretoria)"
                  className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
                <input
                  type="date"
                  value={newDepStartDate}
                  onChange={(e) => setNewDepStartDate(e.target.value)}
                  placeholder="Data Início"
                  className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                  title="Data de Solicitação / Início da Dependência"
                />
                <input
                  type="date"
                  value={newDepSla}
                  onChange={(e) => setNewDepSla(e.target.value)}
                  placeholder="Prazo SLA"
                  className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                  title="Prazo Limite SLA"
                />
                <button
                  type="button"
                  onClick={handleAddDependency}
                  disabled={!newDepTitle.trim() || !newDepOwner.trim()}
                  className="sm:col-span-1 flex items-center justify-center p-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                  title="Adicionar Dependência"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Subtask link selector */}
              {subtasks.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 text-slate-600">
                  <span className="text-[11px] font-semibold text-amber-900 shrink-0">
                    Trava qual subtarefa específica?
                  </span>
                  <select
                    value={newDepLinkedSubtaskId}
                    onChange={(e) => setNewDepLinkedSubtaskId(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-amber-300 bg-white text-slate-800 flex-1"
                  >
                    <option value="">Toda a tarefa (Bloqueio geral da demanda)</option>
                    {subtasks.map((s, sIdx) => (
                      <option key={s.id} value={s.id}>
                        Subtarefa {sIdx + 1}: {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
