import React, { useState } from 'react';
import { X, Plus, Calendar, Flag, Trash2 } from 'lucide-react';
import { Objective, Milestone } from '../types';

interface ObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (objective: Objective) => void;
  initialObjective?: Objective | null;
}

export const ObjectiveModal: React.FC<ObjectiveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialObjective,
}) => {
  const [title, setTitle] = useState(initialObjective?.title || '');
  const [eventDate, setEventDate] = useState(initialObjective?.eventDate || '2026-10-03');
  const [category, setCategory] = useState(initialObjective?.category || 'Evento Institucional');
  const [description, setDescription] = useState(initialObjective?.description || '');
  const [milestones, setMilestones] = useState<Milestone[]>(
    initialObjective?.milestones || [
      { id: `mil-${Date.now()}-1`, title: 'Infraestrutura contratada', tasks: [] },
      { id: `mil-${Date.now()}-2`, title: 'Espaço pronto', tasks: [] },
    ]
  );
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  if (!isOpen) return null;

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    setMilestones([
      ...milestones,
      {
        id: `mil-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: newMilestoneTitle.trim(),
        tasks: [],
      },
    ]);
    setNewMilestoneTitle('');
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved: Objective = {
      id: initialObjective?.id || `obj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      eventDate,
      category,
      description: description.trim(),
      status: 'active',
      milestones,
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">
              {initialObjective ? 'Editar Objetivo Operacional' : 'Novo Objetivo Operacional'}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Objetivo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Encerramento CFM — 03/10"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data do Evento / Meta
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Evento Institucional"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição / Escopo Geral
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Objetivo estratégico do evento ou demanda operacional..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs"
            />
          </div>

          {/* Marcos / Entregáveis */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Marcos / Entregáveis ({milestones.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                >
                  <span className="font-semibold text-slate-800">
                    {idx + 1}. {m.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMilestone(m.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Novo marco (ex: Espaço pronto, Credenciamento liberado)"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <button
                type="button"
                onClick={handleAddMilestone}
                disabled={!newMilestoneTitle.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                + Marco
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md"
            >
              Salvar Objetivo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
