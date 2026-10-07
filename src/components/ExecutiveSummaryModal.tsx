import React, { useState } from 'react';
import { X, Copy, Check, Printer, FileText, Download, Eye, Code, AlertCircle } from 'lucide-react';
import { Objective } from '../types';
import { getObjectiveStats, formatCurrencyBRL } from '../utils/helpers';

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
  const [printError, setPrintError] = useState<string | null>(null);

  if (!isOpen) return null;

  const stats = getObjectiveStats(objective);

  // Helper to translate status to Portuguese
  const formatDepStatusPt = (status: string) => {
    switch (status) {
      case 'waiting_approval':
        return 'AGUARDANDO APROVAÇÃO';
      case 'cleared':
        return 'LIBERADO';
      case 'blocked':
        return 'BLOQUEIO ATIVO';
      case 'pending':
      default:
        return 'PENDENTE';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'waiting_approval':
        return 'background:#fef3c7; color:#92400e; border:1px solid #fde68a;';
      case 'cleared':
        return 'background:#d1fae5; color:#065f46; border:1px solid #a7f3d0;';
      case 'blocked':
        return 'background:#fee2e2; color:#991b1b; border:1px solid #fecaca;';
      case 'pending':
      default:
        return 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;';
    }
  };

  // Generate markdown executive briefing
  const markdownReport = `# RELATÓRIO EXECUTIVO OPERACIONAL
**Objetivo:** ${objective.title}
**Período:** ${objective.startDate ? `${objective.startDate} até ` : ''}${objective.eventDate || 'A definir'}
**Status Geral:** ${stats.progressPercent}% Concluído (${stats.completedSubtasks}/${stats.totalSubtasks} subtarefas executadas)

---

### 🚨 RADAR DE DEPENDÊNCIAS & BLOQUEIOS EXTERNOS
${
  stats.totalDependencies === 0
    ? 'Nenhuma dependência externa registrada.'
    : objective.milestones
        .flatMap((m) =>
          m.tasks.flatMap((t) =>
            t.dependencies.map((d) => ({
              task: t.title,
              milestone: m.title,
              dep: d,
            }))
          )
        )
        .map(
          (item) =>
            `- [${formatDepStatusPt(item.dep.status)}] **${item.dep.title}**
  - Responsável/Setor: ${item.dep.departmentOrOwner}
  - Tarefa Vinculada: ${item.task} (Marco: ${item.milestone})
  - Prazo SLA: ${item.dep.slaDeadline || 'Não informado'}
  - Cobranças realizadas: ${item.dep.followUps?.length || 0}`
        )
        .join('\n')
}

---

### 📋 ESTRUTURA DE MARCOS E ENTREGÁVEIS
${objective.milestones
  .map(
    (m) => `#### Marco: ${m.title}
${m.tasks
  .map(
    (t) => `- **${t.title}** (${t.category})
${t.subtasks
  .map(
    (s) =>
      `  - [${s.status === 'completed' ? 'x' : ' '}] ${s.title}${
        s.status === 'in_progress' ? ' *(Em andamento)*' : ''
      }${
        s.ocNumber ? ` (OC: ${s.ocNumber} - ${formatCurrencyBRL(s.orderCost || 0)})` : ''
      }`
  )
  .join('\n')}`
  )
  .join('\n')}`
  )
  .join('\n\n')}

---

### 💰 GESTÃO FINANCEIRA & ORDENS DE COMPRA (OCs)
- **Total de OCs mapeadas:** ${stats.totalOcs}
- **Valor Total Previsto:** ${formatCurrencyBRL(stats.totalOcCost)}
- **Valor Aguardando Liberação:** ${formatCurrencyBRL(stats.pendingOcCost)}
- **Valor Liberado:** ${formatCurrencyBRL(stats.approvedOcCost)}

*Gerado pela Matriz Operacional em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([markdownReport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedTitle = objective.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      link.download = `relatorio-executivo-${sanitizedTitle || 'operacional'}.txt`;
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
    setPrintError(null);

    // Build standalone HTML for clean printing
    const printableHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatório Executivo - ${objective.title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.5;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px 0;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
          }
          .meta-item strong { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; }
          .meta-item span { font-size: 14px; font-weight: 700; color: #0f172a; }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin: 22px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }
          .dep-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 10px;
            background: #fafafa;
            page-break-inside: avoid;
          }
          .dep-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
          }
          .milestone-block {
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .milestone-header {
            font-size: 13px;
            font-weight: 700;
            color: #1e3a8a;
            background: #eff6ff;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 8px;
          }
          .task-item {
            margin-left: 12px;
            margin-bottom: 8px;
          }
          .subtask-item {
            margin-left: 18px;
            font-size: 11px;
            color: #334155;
            padding: 2px 0;
          }
          .finance-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .finance-table td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
          }
          .finance-table td.label {
            background: #f8fafc;
            font-weight: 600;
            width: 60%;
          }
          .finance-table td.value {
            font-weight: 700;
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">RELATÓRIO EXECUTIVO OPERACIONAL</h1>
          <p style="margin: 0; color: #475569; font-size: 13px;">${objective.title}</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>Data do Evento</strong>
            <span>${objective.eventDate || 'A definir'}</span>
          </div>
          <div class="meta-item">
            <strong>Status Geral</strong>
            <span>${stats.progressPercent}% Concluído</span>
          </div>
          <div class="meta-item">
            <strong>Subtarefas Entregues</strong>
            <span>${stats.completedSubtasks} de ${stats.totalSubtasks}</span>
          </div>
        </div>

        <div class="section-title">🚨 Radar de Dependências & Bloqueios Externos</div>
        ${
          stats.totalDependencies === 0
            ? '<p style="color: #64748b;">Nenhuma dependência externa registrada.</p>'
            : objective.milestones
                .flatMap((m) =>
                  m.tasks.flatMap((t) =>
                    t.dependencies.map((d) => `
                      <div class="dep-card">
                        <div class="dep-header">
                          <strong style="font-size: 12px; color: #0f172a;">${d.title}</strong>
                          <span class="badge" style="${getStatusBadgeStyle(d.status)}">
                            ${formatDepStatusPt(d.status)}
                          </span>
                        </div>
                        <div style="font-size: 11px; color: #475569;">
                          <div>• <strong>Responsável / Setor:</strong> ${d.departmentOrOwner}</div>
                          <div>• <strong>Tarefa:</strong> ${t.title} (${m.title})</div>
                          <div>• <strong>Prazo SLA:</strong> ${d.slaDeadline || 'Não informado'}</div>
                          <div>• <strong>Cobranças realizadas:</strong> ${d.followUps?.length || 0}</div>
                        </div>
                      </div>
                    `)
                  )
                )
                .join('')
        }

        <div class="section-title">📋 Estrutura de Marcos e Entregáveis</div>
        ${objective.milestones
          .map(
            (m) => `
            <div class="milestone-block">
              <div class="milestone-header">Marco: ${m.title}</div>
              ${m.tasks
                .map(
                  (t) => `
                  <div class="task-item">
                    <div style="font-weight: 700; color: #1e293b;">• ${t.title} <span style="font-weight: 400; color: #64748b; font-size: 11px;">(${t.category})</span></div>
                    ${t.subtasks
                      .map(
                        (s) => `
                        <div class="subtask-item">
                          ${s.status === 'completed' ? '☑' : '☐'} ${s.title}
                          ${s.status === 'in_progress' ? '<em style="color: #2563eb;">(Em andamento)</em>' : ''}
                          ${s.ocNumber ? `<strong style="color: #6d28d9;">(OC: ${s.ocNumber} - ${formatCurrencyBRL(s.orderCost || 0)})</strong>` : ''}
                        </div>
                      `
                      )
                      .join('')}
                  </div>
                `
                )
                .join('')}
            </div>
          `
          )
          .join('')}

        <div class="section-title">💰 Gestão Financeira & Ordens de Compra (OCs)</div>
        <table class="finance-table">
          <tr>
            <td class="label">Total de OCs Mapeadas</td>
            <td class="value">${stats.totalOcs}</td>
          </tr>
          <tr>
            <td class="label">Valor Total Previsto</td>
            <td class="value">${formatCurrencyBRL(stats.totalOcCost)}</td>
          </tr>
          <tr>
            <td class="label">Valor Aguardando Liberação de Alçadas</td>
            <td class="value" style="color: #b45309;">${formatCurrencyBRL(stats.pendingOcCost)}</td>
          </tr>
          <tr>
            <td class="label">Valor Liberado / Aprovado</td>
            <td class="value" style="color: #047857;">${formatCurrencyBRL(stats.approvedOcCost)}</td>
          </tr>
        </table>

        <div class="footer">
          Gerado pela Matriz Operacional em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>
      </body>
      </html>
    `;

    try {
      // Create hidden iframe for direct clean printing
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
            console.warn('iframe.contentWindow.print bloqueado pelo navegador, tentando window.print', innerErr);
            window.print();
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch {
                // ignore
              }
            }, 3000);
          }
        }, 350);
      } else {
        window.print();
      }
    } catch (err: any) {
      console.warn('Falha no print direto:', err);
      try {
        window.print();
      } catch (fallbackErr) {
        setPrintError(
          'O navegador impediu a abertura da janela de impressão devido às restrições do ambiente. Você pode usar os botões "Baixar .txt" ou "Copiar Markdown" para salvar o relatório!'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Relatório Executivo Operacional</h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {objective.title} — {stats.progressPercent}% Concluído
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs mr-1">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'formatted'
                    ? 'bg-indigo-600 text-white font-semibold'
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visualização em Markdown"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Markdown</span>
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
              title="Copiar texto para colar em e-mail ou WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
              title="Baixar arquivo de texto (.txt)"
            >
              {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-indigo-300" />}
              <span>{downloaded ? 'Baixado!' : 'Baixar .txt'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warning if print was restricted */}
        {printError && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{printError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrintError(null)}
              className="text-amber-700 hover:text-amber-950 font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
          {viewMode === 'raw' ? (
            /* Raw Markdown View */
            <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed select-all border border-slate-800 shadow-inner">
              {markdownReport}
            </div>
          ) : (
            /* Formatted Executive Report View */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-xs space-y-6 text-slate-800">
              {/* Report Header */}
              <div className="border-b border-slate-200 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                      Relatório Executivo Oficial
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                      {objective.title}
                    </h2>
                  </div>
                  <div className="text-right sm:self-center">
                    <span className="text-xs text-slate-500 block">Data do Evento</span>
                    <span className="text-sm font-bold text-slate-800">
                      {objective.eventDate || 'A definir'}
                    </span>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Progresso</span>
                    <span className="text-base sm:text-lg font-black text-indigo-600">{stats.progressPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Subtarefas Concluídas</span>
                    <span className="text-base sm:text-lg font-black text-emerald-600">
                      {stats.completedSubtasks} / {stats.totalSubtasks}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Aguardando Aprovação</span>
                    <span className="text-base sm:text-lg font-black text-amber-600">{stats.waitingDependencies}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total OCs Previstas</span>
                    <span className="text-base sm:text-lg font-black text-purple-600">{formatCurrencyBRL(stats.totalOcCost)}</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Radar de Bloqueios */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Radar de Dependências & Bloqueios Externos ({stats.totalDependencies})
                </h3>

                {stats.totalDependencies === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                    Nenhuma dependência externa registrada.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {objective.milestones
                      .flatMap((m) =>
                        m.tasks.flatMap((t) =>
                          t.dependencies.map((d) => ({
                            task: t.title,
                            milestone: m.title,
                            dep: d,
                          }))
                        )
                      )
                      .map((item, idx) => {
                        const isCleared = item.dep.status === 'cleared';
                        const isWaiting = item.dep.status === 'waiting_approval';
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border text-xs transition-colors ${
                              isCleared
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : isWaiting
                                ? 'bg-amber-50/50 border-amber-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.dep.title}
                              </span>
                              <span
                                className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isCleared
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isWaiting
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {formatDepStatusPt(item.dep.status)}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-slate-600">
                              <div>
                                <strong className="text-slate-700">Setor/Responsável:</strong> {item.dep.departmentOrOwner}
                              </div>
                              <div>
                                <strong className="text-slate-700">Demanda:</strong> {item.task}
                              </div>
                              <div>
                                <strong className="text-slate-700">Prazo SLA:</strong> {item.dep.slaDeadline || 'Não informado'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Section 2: Marcos e Entregáveis */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Estrutura de Marcos e Entregáveis
                </h3>

                <div className="space-y-4">
                  {objective.milestones.map((m) => (
                    <div key={m.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-800">
                        Marco: {m.title}
                      </div>
                      <div className="p-3.5 space-y-3">
                        {m.tasks.map((t) => (
                          <div key={t.id} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">• {t.title}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {t.category}
                              </span>
                            </div>
                            <div className="pl-4 space-y-1 text-xs">
                              {t.subtasks.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 text-slate-700">
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                                      s.status === 'completed'
                                        ? 'bg-emerald-600 text-white'
                                        : 'border border-slate-300 bg-white text-transparent'
                                    }`}
                                  >
                                    ✓
                                  </span>
                                  <span className={s.status === 'completed' ? 'line-through text-slate-400' : ''}>
                                    {s.title}
                                  </span>
                                  {s.status === 'in_progress' && (
                                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                                      Em andamento
                                    </span>
                                  )}
                                  {s.ocNumber && (
                                    <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-mono">
                                      OC: {s.ocNumber} ({formatCurrencyBRL(s.orderCost || 0)})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Financeiro & OCs */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Gestão Financeira & Ordens de Compra (OCs)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Mapeado</span>
                    <span className="text-base font-black text-slate-900">{formatCurrencyBRL(stats.totalOcCost)}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{stats.totalOcs} Ordens de Compra</span>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Aguardando Alçadas</span>
                    <span className="text-base font-black text-amber-900">{formatCurrencyBRL(stats.pendingOcCost)}</span>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">Gerência / Diretoria / CEO</span>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Liberado / Aprovado</span>
                    <span className="text-base font-black text-emerald-900">{formatCurrencyBRL(stats.approvedOcCost)}</span>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">Apto para pagamento</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
                Gerado pela Matriz Operacional em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
