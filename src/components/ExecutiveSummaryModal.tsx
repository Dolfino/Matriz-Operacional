import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Printer,
  FileText,
  Download,
  Eye,
  Code,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  History,
  Building2,
  Layers,
  ArrowRight,
  Receipt,
  Flag,
} from 'lucide-react';
import { Objective } from '../types';
import { formatCurrencyBRL, getFinancialStatusLabel } from '../utils/helpers';
import {
  buildExecutiveReportData,
  generateExecutiveReportMarkdown,
  generateExecutiveReportHtml,
} from '../utils/executiveReport';

interface ExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  objective: Objective;
}

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  isOpen,
  onClose,
  objective,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Constrói toda a projeção dos dados reutilizando exclusivamente
  // as regras de negócio e helpers da aplicação
  const reportData = buildExecutiveReportData(objective);
  const markdownReport = generateExecutiveReportMarkdown(reportData);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedTitle = objective.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      link.download = `relatorio-executivo-${sanitizedTitle || 'operacional'}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error('Falha ao baixar arquivo:', err);
    }
  };

  const handlePrint = () => {
    setPrintFeedback(null);
    const printableHtml = generateExecutiveReportHtml(reportData);

    try {
      // Cria iframe oculto para impressão limpa sem a UI ao redor
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printableHtml);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (innerErr) {
            console.warn('Iframe print interceptado pelo navegador, tentando window.print():', innerErr);
            window.print();
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch {
                // silencioso
              }
            }, 3000);
          }
        }, 400);
      } else {
        window.print();
      }
    } catch (err: any) {
      console.warn('Falha na impressão direta:', err);
      try {
        window.print();
      } catch (fallbackErr) {
        setPrintFeedback(
          'O ambiente de exibição restringiu a janela de impressão do navegador. Utilize "Baixar .txt" ou "Copiar" para exportar o relatório com perfeição.'
        );
      }
    }
  };

  const {
    stats,
    periodText,
    statusBadge,
    situacaoAtual,
    milestonesExecution,
    dependenciesByCategory,
    dependencyHistory,
    financial,
    ocList,
    indicators,
    conclusion,
    isCompleted,
  } = reportData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Barra Superior do Modal */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  Relatório Executivo Operacional
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {stats.progressPercent}% Concluído
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-md">
                {objective.title} • {periodText}
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Modo (Formatado vs Markdown) */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs mr-1">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'formatted'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visualização Executiva Formatada"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Formatado</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visualização em Markdown Puro"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Markdown</span>
              </button>
            </div>

            {/* Copiar */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
              title="Copiar texto em Markdown para colar em e-mails ou comunicados"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            {/* Baixar */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
              title="Baixar arquivo (.md)"
            >
              {downloaded ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-300" />
              )}
              <span>{downloaded ? 'Baixado!' : 'Baixar .txt'}</span>
            </button>

            {/* Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback caso impressão sofra restrição do iframe */}
        {printFeedback && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{printFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrintFeedback(null)}
              className="text-amber-700 hover:text-amber-950 font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Corpo do Relatório com Rolagem Suave */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50/70 flex-1 space-y-6">
          {viewMode === 'raw' ? (
            /* Visualização Markdown Puro */
            <div className="bg-slate-900 text-slate-100 p-4 sm:p-6 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed select-all border border-slate-800 shadow-inner">
              {markdownReport}
            </div>
          ) : (
            /* Visualização Executiva Formatada com as 8 Seções */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-xs space-y-8 text-slate-800">
              {/* ========================================================= */}
              {/* 1. RESUMO EXECUTIVO                                       */}
              {/* ========================================================= */}
              <section className="border-b border-slate-200 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      1. RESUMO EXECUTIVO
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 tracking-tight">
                      {objective.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Período de Execução: <strong className="text-slate-700">{periodText}</strong>
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bgClass} ${statusBadge.textClass}`}>
                      {statusBadge.text}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 mt-1">
                      Progresso Geral: <strong className="text-indigo-600 text-sm">{stats.progressPercent}%</strong>
                    </span>
                  </div>
                </div>

                {/* Métricas Consolidadas do Resumo */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Marcos Concluídos
                    </span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      {stats.completedMilestones} / {stats.totalMilestones}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {stats.totalMilestones > 0
                        ? `${Math.round((stats.completedMilestones / stats.totalMilestones) * 100)}% concluídos`
                        : '0%'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Tarefas Concluídas
                    </span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      {stats.completedTasks} / {stats.totalTasks}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {indicators.taskCompletionRate}% de conclusão
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Subtarefas Executadas
                    </span>
                    <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                      {stats.completedSubtasks} / {stats.totalSubtasks}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {stats.progressPercent}% do escopo total
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Dependências Externas
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-lg font-black ${stats.bloqueandoDependencies > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {stats.bloqueandoDependencies}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">bloqueando / {stats.atendidasDependencies} atendidas</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {stats.aguardandoDependencies} aguardando • {stats.emRiscoDependencies} em risco
                    </span>
                  </div>
                </div>

                {/* Resumo Financeiro Oficial */}
                <div className="mt-4 bg-slate-900 text-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Resumo Financeiro & Ordens de Compra
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Previsto: {formatCurrencyBRL(financial.totalPrevisto)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-[9px] uppercase font-semibold text-amber-400 block">Em Aprovação</span>
                      <span className="font-bold font-mono text-amber-200 text-xs mt-0.5 block">
                        {formatCurrencyBRL(financial.emAprovacao)}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-[9px] uppercase font-semibold text-blue-400 block">Aprovado</span>
                      <span className="font-bold font-mono text-blue-200 text-xs mt-0.5 block">
                        {formatCurrencyBRL(financial.aprovado)}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-[9px] uppercase font-semibold text-indigo-400 block">Contratado</span>
                      <span className="font-bold font-mono text-indigo-200 text-xs mt-0.5 block">
                        {formatCurrencyBRL(financial.contratado)}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-[9px] uppercase font-semibold text-purple-400 block">Faturado</span>
                      <span className="font-bold font-mono text-purple-200 text-xs mt-0.5 block">
                        {formatCurrencyBRL(financial.faturado)}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-[9px] uppercase font-semibold text-teal-400 block">Enc. Pagamento</span>
                      <span className="font-bold font-mono text-teal-200 text-xs mt-0.5 block">
                        {formatCurrencyBRL(financial.encaminhadoPagamento)}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                      <span className="text-[9px] uppercase font-semibold text-emerald-400 block">Pago</span>
                      <span className="font-bold font-mono text-emerald-300 text-xs mt-0.5 block">
                        {formatCurrencyBRL(financial.pago)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ========================================================= */}
              {/* 2. SITUAÇÃO OPERACIONAL ATUAL                             */}
              {/* ========================================================= */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    2. Situação Operacional Atual ("O que precisa de atenção agora?")
                  </h3>
                </div>

                {isCompleted ||
                (situacaoAtual.bloqueandoAgora.length === 0 &&
                  situacaoAtual.emRisco.length === 0 &&
                  situacaoAtual.aguardandoTerceiros.length === 0 &&
                  situacaoAtual.prazosCriticos.length === 0) ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">{situacaoAtual.cleanMessage}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Todas as dependências anteriores foram atendidas e os fluxos seguem sem impedimentos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 🚨 Bloqueando agora */}
                    {situacaoAtual.bloqueandoAgora.length > 0 && (
                      <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>🚨 Bloqueando agora ({situacaoAtual.bloqueandoAgora.length})</span>
                        </div>
                        <div className="space-y-2">
                          {situacaoAtual.bloqueandoAgora.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-3 rounded-lg border border-rose-200 text-xs shadow-2xs space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {item.dep.title}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                  BLOQUEANDO FLUXO
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-slate-600">
                                <div>
                                  <strong className="text-slate-700">Setor/Responsável:</strong>{' '}
                                  {item.dep.departmentOrOwner}
                                </div>
                                <div>
                                  <strong className="text-slate-700">Tarefa Impactada:</strong>{' '}
                                  {item.taskTitle} ({item.milestoneTitle})
                                </div>
                                <div>
                                  <strong className="text-slate-700">Prazo SLA:</strong>{' '}
                                  {item.dep.slaDeadline || 'Não informado'} ({item.waitingDays} dias de espera)
                                </div>
                              </div>
                              {item.dep.impactNextAction && (
                                <div className="text-[11px] text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-100 mt-1">
                                  <strong>Impacto direto:</strong> {item.dep.impactNextAction}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ⚠️ Em risco */}
                    {situacaoAtual.emRisco.length > 0 && (
                      <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>⚠️ Em risco ({situacaoAtual.emRisco.length})</span>
                        </div>
                        <div className="space-y-2">
                          {situacaoAtual.emRisco.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-3 rounded-lg border border-amber-200 text-xs shadow-2xs space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-slate-900">
                                  {item.dep.title}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  EM RISCO
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-slate-600">
                                <div>
                                  <strong className="text-slate-700">Setor:</strong>{' '}
                                  {item.dep.departmentOrOwner}
                                </div>
                                <div>
                                  <strong className="text-slate-700">Tarefa:</strong>{' '}
                                  {item.taskTitle}
                                </div>
                                <div>
                                  <strong className="text-slate-700">Prazo SLA:</strong>{' '}
                                  {item.dep.slaDeadline || 'Não informado'} ({item.waitingDays} dias)
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ⏳ Aguardando terceiros */}
                    {situacaoAtual.aguardandoTerceiros.length > 0 && (
                      <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>⏳ Aguardando terceiros ({situacaoAtual.aguardandoTerceiros.length})</span>
                        </div>
                        <div className="space-y-2">
                          {situacaoAtual.aguardandoTerceiros.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2.5 rounded-lg border border-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{item.dep.title}</span>
                                <span className="text-[11px] text-slate-500 block">
                                  {item.dep.departmentOrOwner} • Tarefa: {item.taskTitle} • {item.waitingDays} dias de espera
                                </span>
                              </div>
                              <span className="self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                SLA: {item.dep.slaDeadline || 'Aguardando'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 📅 Marcos ou tarefas com prazo crítico */}
                    {situacaoAtual.prazosCriticos.length > 0 && (
                      <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-800">
                          <Flag className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>📅 Marcos ou tarefas com prazo crítico ({situacaoAtual.prazosCriticos.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {situacaoAtual.prazosCriticos.map((crit, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2.5 rounded-lg border border-purple-200 text-xs flex items-center justify-between"
                            >
                              <div>
                                <strong className="text-slate-900">{crit.title}</strong>
                                {crit.parentTitle && (
                                  <span className="text-[11px] text-slate-500 ml-1">
                                    ({crit.parentTitle})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                {crit.situation} • Limite: {crit.deadline}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ========================================================= */}
              {/* 3. EXECUÇÃO POR MARCOS                                    */}
              {/* ========================================================= */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  3. Execução por Marcos
                </h3>

                <div className="space-y-4">
                  {milestonesExecution.map((mItem, idx) => {
                    const isDone = mItem.metrics.status === 'Concluído';
                    return (
                      <div
                        key={mItem.milestone.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                      >
                        {/* Header do Marco */}
                        <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                            <span className="font-extrabold text-xs text-slate-900">
                              Marco {idx + 1} — {mItem.milestone.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                              }`}
                            >
                              {mItem.metrics.status} ({mItem.metrics.progressPercent}%)
                            </span>
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              {mItem.metrics.deadlineSituation}
                            </span>
                          </div>
                        </div>

                        {/* Metadados do Marco */}
                        <div className="bg-slate-50/70 px-4 py-2 border-b border-slate-200 text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Prazo Planejado</span>
                            <strong className="text-slate-800">{mItem.milestone.targetDate || mItem.milestone.endDate || 'Não informado'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Conclusão</span>
                            <strong className="text-slate-800">{mItem.milestone.completedAt || (isDone ? 'Concluído' : 'Pendente')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Situação</span>
                            <strong className="text-slate-800">{mItem.metrics.deadlineSituation}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Tarefas Concluídas</span>
                            <strong className="text-slate-800">{mItem.metrics.completedTasks} / {mItem.metrics.totalTasks} tarefas</strong>
                          </div>
                        </div>

                        {/* Tarefas e Subtarefas */}
                        <div className="p-3.5 sm:p-4 space-y-3">
                          {mItem.tasks.map((tItem) => (
                            <div key={tItem.task.id} className="space-y-1.5 pl-1 sm:pl-2">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">• {tItem.task.title}</span>
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {tItem.task.category}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                                  tItem.effectiveStatus === 'completed'
                                    ? 'text-emerald-700 bg-emerald-50'
                                    : tItem.effectiveStatus === 'blocked'
                                    ? 'text-rose-700 bg-rose-50'
                                    : 'text-slate-600 bg-slate-100'
                                }`}>
                                  Status: {tItem.effectiveStatusLabel}
                                </span>
                              </div>

                              <div className="pl-4 space-y-1 text-xs">
                                {tItem.subtasks.map((sub) => {
                                  const isSubDone = sub.status === 'completed';
                                  return (
                                    <div key={sub.id} className="flex flex-wrap items-center gap-2 text-slate-700">
                                      <span
                                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                                          isSubDone
                                            ? 'bg-emerald-600 text-white'
                                            : 'border border-slate-300 bg-white text-transparent'
                                        }`}
                                      >
                                        ✓
                                      </span>
                                      <span className={isSubDone ? 'line-through text-slate-400' : ''}>
                                        {sub.title}
                                      </span>
                                      {sub.status === 'in_progress' && (
                                        <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                                          Em andamento
                                        </span>
                                      )}
                                      {sub.ocNumber && (
                                        <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-mono">
                                          OC: {sub.ocNumber} ({formatCurrencyBRL(sub.orderCost || 0)}) •{' '}
                                          <strong className="text-purple-900 uppercase">
                                            {
                                              getFinancialStatusLabel(
                                                sub.financialStatus || (isSubDone ? 'PAGO' : 'EM_APROVACAO')
                                              ).label
                                            }
                                          </strong>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ========================================================= */}
              {/* 4. DEPENDÊNCIAS EXTERNAS E BLOQUEIOS                     */}
              {/* ========================================================= */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  4. Dependências Externas e Bloqueios ({stats.totalDependencies})
                </h3>

                {dependenciesByCategory.bloqueando.length === 0 &&
                dependenciesByCategory.emRisco.length === 0 &&
                dependenciesByCategory.aguardando.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Nenhuma dependência externa ativa no momento.</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        {dependenciesByCategory.atendidas.length > 0
                          ? `Todas as ${dependenciesByCategory.atendidas.length} dependências foram atendidas e constam registradas na Seção 5 (Histórico de Dependências).`
                          : 'Nenhuma dependência externa cadastrada.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      {
                        title: '🚨 Bloqueando o fluxo',
                        list: dependenciesByCategory.bloqueando,
                        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
                      },
                      {
                        title: '⚠️ Em risco',
                        list: dependenciesByCategory.emRisco,
                        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                      },
                      {
                        title: '⏳ Aguardando terceiros',
                        list: dependenciesByCategory.aguardando,
                        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                      },
                    ].map(
                      (cat, cIdx) =>
                        cat.list.length > 0 && (
                          <div key={cIdx} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span>{cat.title} ({cat.list.length})</span>
                            </div>
                            <div className="space-y-2">
                              {cat.list.map((item, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="bg-white p-3 rounded-lg border border-slate-200 text-xs shadow-2xs space-y-1.5"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {item.dep.title}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cat.badgeColor}`}
                                      >
                                        {item.lifecycle.label}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                          item.lifecycle.isBlocking
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        Bloqueando: {item.lifecycle.isBlocking ? 'SIM' : 'NÃO'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                    <div>
                                      <strong className="text-slate-700 block text-[10px] uppercase">Responsável / Setor</strong>
                                      <span>{item.dep.departmentOrOwner}</span>
                                    </div>
                                    <div>
                                      <strong className="text-slate-700 block text-[10px] uppercase">Tarefa Vinculada</strong>
                                      <span>{item.taskTitle} ({item.milestoneTitle})</span>
                                    </div>
                                    <div>
                                      <strong className="text-slate-700 block text-[10px] uppercase">Abertura / Prazo SLA</strong>
                                      <span>{item.dep.openedAt || 'N/D'} → SLA: {item.dep.slaDeadline || 'N/D'}</span>
                                    </div>
                                    <div>
                                      <strong className="text-slate-700 block text-[10px] uppercase">Espera / Cobranças</strong>
                                      <span>{item.waitingDays} dia(s) • {item.dep.followUps?.length || 0} cobrança(s)</span>
                                    </div>
                                  </div>

                                  {item.dep.impactNextAction && (
                                    <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                                      <strong className="text-slate-700">Impacto / Próxima ação:</strong> {item.dep.impactNextAction}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                )}
              </section>

              {/* ========================================================= */}
              {/* 5. HISTÓRICO DE DEPENDÊNCIAS                              */}
              {/* ========================================================= */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  5. Histórico de Dependências
                </h3>

                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
                  {dependencyHistory.map((hist, hIdx) => (
                    <div key={hIdx} className="space-y-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-slate-900 font-bold text-sm">
                          {hist.depTitle}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {hist.taskTitle} • {hist.milestoneTitle}
                        </span>
                      </div>
                      <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-indigo-200 text-xs">
                        {hist.entries.map((entry, eIdx) => (
                          <div key={eIdx} className="text-slate-600 text-[11px]">
                            <span className="font-mono text-slate-400 font-bold">[{entry.timestamp}]</span>{' '}
                            <span className="font-semibold text-slate-800">{entry.description}</span>
                            {entry.author && <span className="text-slate-500"> — por {entry.author}</span>}
                            {entry.note && (
                              <p className="text-slate-500 italic mt-0.5 pl-4">
                                "{entry.note}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ========================================================= */}
              {/* 6. GESTÃO FINANCEIRA & OCs                                */}
              {/* ========================================================= */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-purple-600" />
                  6. Gestão Financeira & Ordens de Compra (OCs)
                </h3>

                {/* Tabela de Ordens de Compra */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Nº da OC</th>
                          <th className="px-4 py-2.5">Demanda / Tarefa</th>
                          <th className="px-4 py-2.5">Item / Subtarefa</th>
                          <th className="px-4 py-2.5">Valor (R$)</th>
                          <th className="px-4 py-2.5">Situação Financeira</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ocList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 text-center text-slate-500 italic">
                              Nenhuma Ordem de Compra cadastrada.
                            </td>
                          </tr>
                        ) : (
                          ocList.map((oc, oIdx) => (
                            <tr key={oIdx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-2.5 font-mono font-bold text-purple-800">
                                {oc.ocNumber}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-800">
                                {oc.taskTitle}
                                <span className="text-[10px] text-slate-400 block">{oc.milestoneTitle}</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">
                                {oc.subtaskTitle}
                                {oc.assignee && (
                                  <span className="text-[10px] text-slate-400 block">Resp: {oc.assignee}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                {formatCurrencyBRL(oc.cost)}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${oc.badgeClass}`}>
                                  {oc.statusLabel}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* ========================================================= */}
              {/* 7. INDICADORES OPERACIONAIS                               */}
              {/* ========================================================= */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                  7. Indicadores Operacionais
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Taxa de Conclusão de Tarefas</span>
                    <span className="text-xl font-black text-slate-900 mt-1 block">{indicators.taskCompletionRate}%</span>
                    <span className="text-[10px] text-slate-500">{stats.completedTasks} de {stats.totalTasks} tarefas</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Taxa de Conclusão de Subtarefas</span>
                    <span className="text-xl font-black text-indigo-600 mt-1 block">{indicators.subtaskCompletionRate}%</span>
                    <span className="text-[10px] text-slate-500">{stats.completedSubtasks} de {stats.totalSubtasks} subtarefas</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Resolução de Dependências</span>
                    <span className="text-xl font-black text-emerald-600 mt-1 block">{indicators.dependencyResolutionRate}%</span>
                    <span className="text-[10px] text-slate-500">{stats.atendidasDependencies} atendidas de {stats.totalDependencies}</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Dependências Críticas Ativas</span>
                    <span className={`text-xl font-black mt-1 block ${indicators.activeCriticalDeps > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {indicators.activeCriticalDeps}
                    </span>
                    <span className="text-[10px] text-slate-500">{stats.bloqueandoDependencies} bloqueando / {stats.emRiscoDependencies} em risco</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Follow-ups Realizados</span>
                    <span className="text-xl font-black text-blue-600 mt-1 block">{indicators.totalFollowUps}</span>
                    <span className="text-[10px] text-slate-500">Cobranças formais a terceiros</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tempo Médio de Espera</span>
                    <span className="text-xl font-black text-amber-600 mt-1 block">{indicators.averageWaitingTimeDays} dias</span>
                    <span className="text-[10px] text-slate-500">Tempo médio em aberto</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Eficiência / Compromissado</span>
                    <span className="text-xl font-black text-purple-600 mt-1 block">{indicators.financialExecutionRate}%</span>
                    <span className="text-[10px] text-slate-500">Do valor total previsto</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Ordens de Compra Mapeadas</span>
                    <span className="text-xl font-black text-slate-900 mt-1 block">{financial.totalOcs}</span>
                    <span className="text-[10px] text-slate-500">Total de OCs em ciclo</span>
                  </div>
                </div>
              </section>

              {/* ========================================================= */}
              {/* 8. CONCLUSÃO / SITUAÇÃO DO OBJETIVO                       */}
              {/* ========================================================= */}
              <section className="border-t border-slate-200 pt-6">
                <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200 rounded-xl p-5 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">
                    8. CONCLUSÃO / SITUAÇÃO DO OBJETIVO
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {conclusion.title}
                  </h4>
                  <p className="text-sm font-semibold text-slate-700">
                    {conclusion.summary}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {conclusion.diagnostico}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>Gerado pela Matriz Operacional em {conclusion.generatedAt}</span>
                  <span>Documento Oficial de Monitoramento Executivo</span>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
