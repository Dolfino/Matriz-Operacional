import React, { useState } from 'react';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface GranularityRuleBannerProps {
  onOpenChecker: () => void;
}

export const GranularityRuleBanner: React.FC<GranularityRuleBannerProps> = ({ onOpenChecker }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl shadow-lg border border-indigo-700/50 mb-6 overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-300 shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-600/40">
                Padrão Operacional de Granularidade
              </span>
              <span className="text-xs text-indigo-200/70 hidden sm:inline">
                Hierarquia de Execução + Relação Transversal de Terceiros
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Objetivo → Marco → Tarefa → Subtarefa executável
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/80 mt-1 max-w-3xl">
              <strong>Subtarefa executável:</strong> ação direta da equipe interna com estado próprio.
              {' '}<strong>Dependência externa:</strong> relação operacional de terceiro vinculada à tarefa/subtarefa.
              {' '}<strong>Bloqueio:</strong> quando a dependência efetivamente paralisa o avanço.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={onOpenChecker}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-lg shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Checador de Granularidade</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-indigo-200 hover:text-white px-3 py-2 bg-indigo-800/40 hover:bg-indigo-800/70 rounded-lg border border-indigo-700/50 transition-colors"
          >
            <span>{isExpanded ? 'Ocultar detalhes' : 'Ver regras'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-indigo-800/60 bg-slate-950/50 p-4 sm:p-5 text-xs sm:text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Subtarefa Executável (Nível 4)</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Exige: <strong>ação executável direta + estado próprio + necessidade de acompanhamento operacional imediato</strong>.
              É o trabalho que você ou sua equipe executa diretamente (ex: solicitar orçamento, abrir OC no ERP, conferir mapa de palco).
            </p>
          </div>

          <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>2. Dependência Externa (Transversal)</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              <strong>Não é um 5º nível hierárquico.</strong> É uma ação de terceiro/setor externo (ex: aprovação de Charles, entrega de proposta, laudo dos Bombeiros) vinculada à tarefa ou subtarefa que ela libera.
            </p>
          </div>

          <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-rose-300 font-semibold mb-1.5">
              <Lock className="w-4 h-4 text-rose-400" />
              <span>3. Bloqueio vs. Dependência</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Toda dependência é uma espera de terceiro, mas <strong>só é Bloqueio</strong> quando o fluxo da próxima ação fica paralisado. Se a dependência está em andamento sem travar a equipe, ela é apenas &ldquo;Aguardando Terceiros&rdquo;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
