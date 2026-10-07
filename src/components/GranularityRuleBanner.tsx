import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, CheckCircle2, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

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
                Não decompor por duração, mas por gestão
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Objetivo → Marco → Tarefa → Subtarefa executável → Dependência externa
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/80 mt-1 max-w-2xl">
              Crie subtarefas apenas com <strong>ação executável direta + estado próprio + necessidade de acompanhamento</strong>. Aprovações de terceiros (ex: Superintendência, CEOP) são tratadas como <strong>propriedades de dependência</strong>.
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
            <span>{isExpanded ? 'Ocultar detalhes' : 'Ver regra'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-indigo-800/60 bg-slate-950/40 p-4 sm:p-5 text-xs sm:text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-950/50 border border-indigo-800/40 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Ação Executável Direta</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Subtarefa é o que <strong>você ou sua equipe executa</strong> (ex: solicitar orçamento, abrir OC). Evita listar &ldquo;Charles assinar documento&rdquo; como se fosse seu trabalho direto.
            </p>
          </div>

          <div className="bg-indigo-950/50 border border-indigo-800/40 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Estado Independente</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Um item merece existir se pode estar &ldquo;concluído&rdquo; enquanto o próximo permanece pendente (ex: OC aberta desfaz o trabalho interno, mas aguarda liberação externa).
            </p>
          </div>

          <div className="bg-indigo-950/50 border border-indigo-800/40 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>3. Dependência Externa (Bloqueio)</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Você <strong>não executa a aprovação</strong>; você acompanha a dependência externa. Registre o responsável (ex: Charles / CEOP), status e faça follow-up ativo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
