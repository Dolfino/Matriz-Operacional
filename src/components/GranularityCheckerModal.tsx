import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Plus,
  Lock,
  Unlock,
  Layers,
} from 'lucide-react';
import { Task } from '../types';

interface GranularityCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onAddSubtask?: (taskId: string, title: string) => void;
  onAddDependency?: (
    taskId: string,
    title: string,
    department: string,
    bloqueandoFluxo?: boolean
  ) => void;
}

export const GranularityCheckerModal: React.FC<GranularityCheckerModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddSubtask,
  onAddDependency,
}) => {
  const [candidateText, setCandidateText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [isDirectExecution, setIsDirectExecution] = useState<boolean | null>(null);
  const [hasIndependentState, setHasIndependentState] = useState<boolean | null>(null);
  const [needsTrackingOrBlocker, setNeedsTrackingOrBlocker] = useState<boolean | null>(null);
  const [responsibleThirdParty, setResponsibleThirdParty] = useState('');
  const [isBlockingFlow, setIsBlockingFlow] = useState<boolean>(true);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Analysis Logic based on operational standard
  let diagnosis: 'pending_answers' | 'subtask_approved' | 'external_dependency' | 'keep_in_task' =
    'pending_answers';

  if (
    isDirectExecution !== null &&
    hasIndependentState !== null &&
    needsTrackingOrBlocker !== null
  ) {
    if (isDirectExecution === false) {
      diagnosis = 'external_dependency';
    } else if (hasIndependentState === true && needsTrackingOrBlocker === true) {
      diagnosis = 'subtask_approved';
    } else {
      diagnosis = 'keep_in_task';
    }
  }

  const handleApply = () => {
    if (!selectedTaskId || !candidateText.trim()) return;

    if (diagnosis === 'subtask_approved' && onAddSubtask) {
      onAddSubtask(selectedTaskId, candidateText.trim());
      setAppliedMessage('Subtarefa executável adicionada com sucesso!');
      setTimeout(() => {
        setAppliedMessage(null);
        onClose();
      }, 1200);
    } else if (diagnosis === 'external_dependency' && onAddDependency) {
      onAddDependency(
        selectedTaskId,
        candidateText.trim(),
        responsibleThirdParty.trim() || 'Superintendência / Terceiro',
        isBlockingFlow
      );
      setAppliedMessage('Dependência externa vinculada à tarefa com sucesso!');
      setTimeout(() => {
        setAppliedMessage(null);
        onClose();
      }, 1200);
    }
  };

  const handlePreset = (
    text: string,
    isExec: boolean,
    isIndep: boolean,
    isTrack: boolean,
    dept = '',
    blocking = true
  ) => {
    setCandidateText(text);
    setIsDirectExecution(isExec);
    setHasIndependentState(isIndep);
    setNeedsTrackingOrBlocker(isTrack);
    setResponsibleThirdParty(dept);
    setIsBlockingFlow(blocking);
    setAppliedMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Checador de Granularidade Operacional
              </h3>
              <p className="text-xs text-indigo-200">
                Regra: Ação executável direta + estado próprio + acompanhamento operacional
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick presets */}
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Exemplos do Padrão Operacional (clique para testar):
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  handlePreset(
                    'Solicitar proposta comercial formalizada ao fornecedor eleito',
                    true,
                    true,
                    true
                  )
                }
                className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
              >
                &ldquo;Solicitar proposta formalizada&rdquo; (Ação Interna da Equipe)
              </button>
              <button
                type="button"
                onClick={() =>
                  handlePreset(
                    'Fornecedor enviar proposta formalizada',
                    false,
                    true,
                    true,
                    'Fornecedor PixelShow',
                    true
                  )
                }
                className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium transition-colors"
              >
                &ldquo;Fornecedor enviar proposta&rdquo; (Dependência de Terceiro)
              </button>
              <button
                type="button"
                onClick={() =>
                  handlePreset(
                    'Aprovação da OC pela Superintendência',
                    false,
                    true,
                    true,
                    'Charles / Superintendência',
                    true
                  )
                }
                className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium transition-colors"
              >
                &ldquo;Aprovação da OC&rdquo; (Aprovação / Bloqueio Externo)
              </button>
            </div>
          </div>

          {/* Input text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              O que você deseja cadastrar?
            </label>
            <input
              type="text"
              value={candidateText}
              onChange={(e) => setCandidateText(e.target.value)}
              placeholder="Ex: Definir fornecedor, Solicitar orçamento, Aprovação da OC..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* 3 Questions */}
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Critérios Oficiais de Granularidade
            </h4>

            {/* Q1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  1. É uma ação executável direta da sua equipe interna?
                </p>
                <p className="text-xs text-slate-500">
                  Se for aprovação, liberação de terceiro ou entrega de fornecedor fora do seu controle direto, marque &ldquo;Não&rdquo;.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDirectExecution(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    isDirectExecution === true
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Sim (Interno)
                </button>
                <button
                  type="button"
                  onClick={() => setIsDirectExecution(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    isDirectExecution === false
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Não (Terceiro)
                </button>
              </div>
            </div>

            {/* Q2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  2. Possui estado independente próprio?
                </p>
                <p className="text-xs text-slate-500">
                  Pode estar &ldquo;concluído&rdquo; enquanto a próxima etapa permanece pendente?
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setHasIndependentState(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    hasIndependentState === true
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setHasIndependentState(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    hasIndependentState === false
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            {/* Q3 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  3. Há necessidade de acompanhamento operacional imediato?
                </p>
                <p className="text-xs text-slate-500">
                  Não decompor por duração, mas por necessidade real de gestão e controle.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setNeedsTrackingOrBlocker(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    needsTrackingOrBlocker === true
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setNeedsTrackingOrBlocker(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    needsTrackingOrBlocker === false
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostic Box */}
          {diagnosis !== 'pending_answers' && (
            <div className="rounded-xl border p-4.5 transition-all">
              {diagnosis === 'external_dependency' && (
                <div className="bg-amber-50 border-amber-200 text-amber-950 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                    <span>DIAGNÓSTICO: DEPENDÊNCIA EXTERNA (Relação Transversal)</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Você <strong>não executa essa ação</strong> diretamente (ex: aprovação de Charles, entrega de proposta, laudo técnico). Portanto, ela não pertence à hierarquia como uma subtarefa executável sua.
                    Cadastre-a como <strong>Dependência Externa</strong> vinculada à tarefa que ela impacta.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                        Responsável externo ou setor:
                      </label>
                      <input
                        type="text"
                        value={responsibleThirdParty}
                        onChange={(e) => setResponsibleThirdParty(e.target.value)}
                        placeholder="Ex: Charles / Superintendência, CEOP"
                        className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="chkCheckerBlocking"
                        checked={isBlockingFlow}
                        onChange={(e) => setIsBlockingFlow(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-amber-300"
                      />
                      <label
                        htmlFor="chkCheckerBlocking"
                        className="text-xs font-bold text-rose-950 cursor-pointer flex items-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        Esta dependência está BLOQUEANDO o fluxo agora?
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {diagnosis === 'subtask_approved' && (
                <div className="bg-emerald-50 border-emerald-200 text-emerald-950 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>DIAGNÓSTICO: APROVADO COMO SUBTAREFA EXECUTÁVEL</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Perfeito! Este item cumpre o critério operacional completo:
                    <strong>ação executável direta + estado próprio independente + necessidade de acompanhamento imediato</strong>.
                    Pertence legitimamente ao 4º nível hierárquico da matriz.
                  </p>
                </div>
              )}

              {diagnosis === 'keep_in_task' && (
                <div className="bg-slate-100 border-slate-300 text-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-slate-600" />
                    <span>DIAGNÓSTICO: Manter dentro da descrição da Tarefa</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Como não possui estado independente ou potencial de bloqueio relevante, criar uma subtarefa transformaria sua matriz em micro-burocracia. Mantenha na descrição ou notas da tarefa.
                  </p>
                </div>
              )}

              {/* Target Task Selector and Insert Button */}
              {tasks.length > 0 &&
                (diagnosis === 'subtask_approved' || diagnosis === 'external_dependency') && (
                  <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Vincular à Tarefa Operacional:
                      </label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-indigo-500"
                      >
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleApply}
                      disabled={!candidateText.trim()}
                      className="self-end sm:self-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {diagnosis === 'subtask_approved'
                          ? 'Adicionar Subtarefa Executável'
                          : 'Vincular Dependência Externa'}
                      </span>
                    </button>
                  </div>
                )}
            </div>
          )}

          {appliedMessage && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold text-center animate-in fade-in">
              {appliedMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
