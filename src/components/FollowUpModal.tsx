import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, Clock, Building2, UserCheck } from 'lucide-react';
import { Dependency } from '../types';
import { ApprovalChainBadge } from './ApprovalChainBadge';
import { getActiveApprovalLevel } from '../utils/approvalRules';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependency: Dependency | null;
  taskTitle?: string;
  objectiveTitle?: string;
  onSaveFollowUp: (dependencyId: string, note: string, author?: string) => void;
  onUpdateStatus?: (dependencyId: string, newStatus: Dependency['status']) => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  dependency,
  taskTitle,
  objectiveTitle,
  onSaveFollowUp,
  onUpdateStatus,
}) => {
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('Operações');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !dependency) return null;

  // Suggested message generator
  const generatedMessage = `Prezado(a) ${dependency.departmentOrOwner},

Escrevo para solicitar atualização a respeito do item: "${dependency.title}", referente à tarefa "${taskTitle || 'Planejamento'}" do evento "${objectiveTitle || 'Evento'}".

A liberação desta pendência é determinante para destravar as próximas etapas executivas.${
    dependency.slaDeadline ? ` O prazo limite operacional é ${dependency.slaDeadline}.` : ''
  }

Poderia nos confirmar a previsão de conclusão/aprovação?

Atenciosamente,
Equipe de Gestão e Operações`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyTemplate = (templateNote: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setNote(`[${timestamp}] ${templateNote}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    onSaveFollowUp(dependency.id, note.trim(), author.trim());
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Registrar Cobrança / Follow-up</h3>
              <p className="text-xs text-indigo-200">
                Acompanhamento ativo de dependência externa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Dependency Info card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Dependência Externa
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {dependency.status === 'waiting_approval'
                  ? 'Aguardando Aprovação'
                  : dependency.status === 'blocked'
                  ? 'Bloqueador Ativo'
                  : 'Em Andamento'}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-base">{dependency.title}</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                {dependency.departmentOrOwner}
              </span>
              {dependency.slaDeadline && (
                <span className="text-slate-500">
                  Data Limite: <strong className="text-slate-800">{dependency.slaDeadline}</strong>
                </span>
              )}
            </div>
            {dependency.notes && (
              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                {dependency.notes}
              </p>
            )}

            {/* Approval stages stepper if present */}
            {dependency.approvalStages && dependency.approvalStages.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <ApprovalChainBadge stages={dependency.approvalStages} />
              </div>
            )}
          </div>

          {/* Quick status change button */}
          {onUpdateStatus && (
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-xs font-medium text-indigo-900">
                Recebeu a liberação ou aprovação externa?
              </span>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(dependency.id, 'cleared');
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Marcar como Liberado / Aprovado
              </button>
            </div>
          )}

          {/* Generated message helper */}
          <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-slate-300">Sugestão de Mensagem de Cobrança:</span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-slate-300 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" onClick={handleCopyMessage} title="Clique para copiar">
              {generatedMessage}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registro da Cobrança / Follow-up:
                </label>
                <div className="flex gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('Cobrado via Teams/WhatsApp. Prometeu resposta até o fim da tarde.')}
                    className="text-indigo-600 hover:underline"
                  >
                    + Teams/Whats
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('E-mail formal enviado com aviso de prazo crítico.')}
                    className="text-indigo-600 hover:underline"
                  >
                    + E-mail
                  </button>
                </div>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
                placeholder="Ex: Cobrado pessoalmente na sala da Superintendência. Aguardando assinatura até amanhã às 12h."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Registrado por:
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800"
              />
            </div>

            {/* History of past follow-ups */}
            {dependency.followUps && dependency.followUps.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Histórico de Cobranças ({dependency.followUps.length}):
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {dependency.followUps.map((flw) => (
                    <div key={flw.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">{flw.author || 'Operações'}</span>
                        <span className="text-[11px]">{flw.date}</span>
                      </div>
                      <p className="text-slate-800">{flw.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Salvar Follow-up</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
