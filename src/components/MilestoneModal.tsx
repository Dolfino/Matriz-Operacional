import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, Layers, AlignLeft, CheckCircle2 } from 'lucide-react';
import { Milestone, MilestoneStatus } from '../types';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: Milestone) => void;
  initialMilestone?: Milestone | null;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMilestone,
}) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('em_andamento');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialMilestone) {
      setTitle(initialMilestone.title || '');
      setStartDate(initialMilestone.startDate || '');
      setTargetDate(initialMilestone.targetDate || initialMilestone.endDate || '');
      setCompletedAt(initialMilestone.completedAt || '');
      setStatus(initialMilestone.status || 'em_andamento');
      setDescription(initialMilestone.description || '');
    } else {
      setTitle('');
      setStartDate('');
      setTargetDate('');
      setCompletedAt('');
      setStatus('em_andamento');
      setDescription('');
    }
  }, [initialMilestone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved: Milestone = {
      id: initialMilestone?.id || `mil-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      status,
      completedAt: completedAt || undefined,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined,
      endDate: targetDate || undefined,
      description: description.trim() || undefined,
      tasks: initialMilestone?.tasks || [],
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">
              {initialMilestone ? 'Editar Marco / Entregável' : 'Novo Marco / Entregável'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Marco / Condição a Alcançar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Infraestrutura contratada, Espaço pronto, Credenciamento liberado"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Prazo Planejado (Meta)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status Operacional
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white font-medium"
              >
                <option value="planejado">Planejado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Data Efetivamente Concluída
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                placeholder="Se concluído"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              Descrição do Marco (Condição / Resultado esperado)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ex: Todos os fornecedores contratados com OCs aprovadas e contratos assinados..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs"
            />
          </div>

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
              Salvar Marco
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
