import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Sparkles,
  AlertCircle,
  FileText,
  Target,
  ArrowRight,
  Layers,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  Objective,
  ExecutionSession,
  ExecutionSessionStatus,
  ExecutionSessionEvent,
  Subtask,
  Task,
  Milestone,
} from '../types';
import {
  getSubtaskTimeMetrics,
  formatMinutes,
  calculateTimeOverlapMinutes,
} from '../utils/helpers';

interface ExecutionSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  objective: Objective;
  initialMilestoneId?: string;
  initialTaskId?: string;
  initialSubtaskId?: string;
  sessionToEdit?: ExecutionSession | null;
  onSaveSession: (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    session: ExecutionSession
  ) => void;
  onDeleteSession?: (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    sessionId: string
  ) => void;
  onUpdateSubtaskEstimate?: (
    milestoneId: string,
    taskId: string,
    subtaskId: string,
    estimatedMinutes: number
  ) => void;
}

export const ExecutionSessionModal: React.FC<ExecutionSessionModalProps> = ({
  isOpen,
  onClose,
  objective,
  initialMilestoneId,
  initialTaskId,
  initialSubtaskId,
  sessionToEdit,
  onSaveSession,
  onDeleteSession,
  onUpdateSubtaskEstimate,
}) => {
  // Seleção hierárquica da Subtarefa Executável
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    initialMilestoneId || objective.milestones[0]?.id || ''
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string>('');

  // Campos da Sessão de Execução
  const [date, setDate] = useState<string>('2026-10-08');
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('10:30');
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState<number>(30);
  const [actualDurationMinutes, setActualDurationMinutes] = useState<number>(0);
  const [sessionGoal, setSessionGoal] = useState<string>('');
  const [status, setStatus] = useState<ExecutionSessionStatus>('scheduled');
  const [notes, setNotes] = useState<string>('');
  const [events, setEvents] = useState<ExecutionSessionEvent[]>([]);

  // Estimativa de esforço da subtarefa
  const [subtaskEstimate, setSubtaskEstimate] = useState<number>(45);

  // Cronômetro interativo em runtime para foco
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  // Inicializa a seleção
  useEffect(() => {
    if (!isOpen) return;

    let targetMId = initialMilestoneId || objective.milestones[0]?.id || '';
    let targetTId = initialTaskId || '';
    let targetSId = initialSubtaskId || '';

    // Se não fornecido, procura a primeira subtarefa disponível
    if (!targetTId || !targetSId) {
      const m = objective.milestones.find((item) => item.id === targetMId) || objective.milestones[0];
      if (m) {
        targetMId = m.id;
        const t = m.tasks[0];
        if (t) {
          targetTId = t.id;
          const s = t.subtasks[0];
          if (s) {
            targetSId = s.id;
          }
        }
      }
    }

    setSelectedMilestoneId(targetMId);
    setSelectedTaskId(targetTId);
    setSelectedSubtaskId(targetSId);

    if (sessionToEdit) {
      setDate(sessionToEdit.date);
      setStartTime(sessionToEdit.startTime);
      setEndTime(sessionToEdit.endTime);
      setPlannedDurationMinutes(sessionToEdit.plannedDurationMinutes);
      setActualDurationMinutes(sessionToEdit.actualDurationMinutes || 0);
      setSessionGoal(sessionToEdit.sessionGoal || '');
      setStatus(sessionToEdit.status);
      setNotes(sessionToEdit.notes || '');
      setEvents(sessionToEdit.events || []);
      setTimerSeconds((sessionToEdit.actualDurationMinutes || 0) * 60);
    } else {
      setDate('2026-10-08');
      setStartTime('10:00');
      setEndTime('10:30');
      setPlannedDurationMinutes(30);
      setActualDurationMinutes(0);
      setSessionGoal('');
      setStatus('scheduled');
      setNotes('');
      setEvents([]);
      setTimerSeconds(0);
    }

    setIsTimerRunning(false);
  }, [isOpen, initialMilestoneId, initialTaskId, initialSubtaskId, sessionToEdit, objective]);

  // Atualiza tempo planejado automaticamente ao alterar horários
  const calculateDurationFromTimes = (start: string, end: string): number => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (endMin > startMin) {
        return endMin - startMin;
      }
    } catch {
      // fallback
    }
    return 30;
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const dur = calculateDurationFromTimes(val, endTime);
    setPlannedDurationMinutes(dur);
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const dur = calculateDurationFromTimes(startTime, val);
    setPlannedDurationMinutes(dur);
  };

  // Efeito do Cronômetro
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          const next = prev + 1;
          const mins = Math.round(next / 60);
          setActualDurationMinutes(mins);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  if (!isOpen) return null;

  // Busca dados correntes da hierarquia
  const currentMilestone = objective.milestones.find((m) => m.id === selectedMilestoneId);
  const currentTask = currentMilestone?.tasks.find((t) => t.id === selectedTaskId);
  const currentSubtask = currentTask?.subtasks.find((s) => s.id === selectedSubtaskId);

  const timeMetrics = currentSubtask
    ? getSubtaskTimeMetrics(currentSubtask)
    : {
        estimatedMinutes: 0,
        reservedMinutes: 0,
        actualMinutes: 0,
        remainingMinutes: 0,
        coveragePercent: 0,
        progressTimePercent: 0,
      };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestoneId || !selectedTaskId || !selectedSubtaskId) return;

    const newSession: ExecutionSession = {
      id: sessionToEdit ? sessionToEdit.id : `sess-${Date.now()}`,
      subtaskId: selectedSubtaskId,
      date,
      startTime,
      endTime,
      plannedDurationMinutes: Number(plannedDurationMinutes) || 30,
      actualDurationMinutes: Number(actualDurationMinutes) || 0,
      sessionGoal: sessionGoal.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      completedAt: status === 'completed' ? (sessionToEdit?.completedAt || new Date().toISOString()) : undefined,
      events: events.length > 0 ? events : sessionToEdit?.events,
    };

    onSaveSession(selectedMilestoneId, selectedTaskId, selectedSubtaskId, newSession);

    // Se houve ajuste na estimativa da subtarefa
    if (onUpdateSubtaskEstimate && subtaskEstimate !== currentSubtask?.estimatedMinutes) {
      onUpdateSubtaskEstimate(selectedMilestoneId, selectedTaskId, selectedSubtaskId, subtaskEstimate);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/60">
                  TIME BOXING OPERACIONAL
                </span>
                <span className="text-xs text-slate-400">Relação Temporal da Subtarefa</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">
                {sessionToEdit ? 'Editar Sessão de Execução' : 'Reservar Bloco de Foco'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invariant Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 py-2.5 flex items-center gap-2 text-amber-900 text-xs shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Contrato do Core:</strong> Sessão de Execução é uma relação temporal da <strong>Subtarefa Executável</strong> (quando vou sentar e fazer), preservando estritamente os 4 níveis hierárquicos.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. SELEÇÃO DA SUBTAREFA EXECUTÁVEL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              1. Subtarefa Executável de Destino
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Marco */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Marco
                </label>
                <select
                  disabled={!!sessionToEdit}
                  value={selectedMilestoneId}
                  onChange={(e) => {
                    setSelectedMilestoneId(e.target.value);
                    const m = objective.milestones.find((item) => item.id === e.target.value);
                    if (m && m.tasks[0]) {
                      setSelectedTaskId(m.tasks[0].id);
                      if (m.tasks[0].subtasks[0]) {
                        setSelectedSubtaskId(m.tasks[0].subtasks[0].id);
                        setSubtaskEstimate(m.tasks[0].subtasks[0].estimatedMinutes || 45);
                      }
                    }
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {objective.milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tarefa */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Tarefa
                </label>
                <select
                  disabled={!!sessionToEdit}
                  value={selectedTaskId}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    const t = currentMilestone?.tasks.find((item) => item.id === e.target.value);
                    if (t && t.subtasks[0]) {
                      setSelectedSubtaskId(t.subtasks[0].id);
                      setSubtaskEstimate(t.subtasks[0].estimatedMinutes || 45);
                    }
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {currentMilestone?.tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subtarefa */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Subtarefa Executável
                </label>
                <select
                  disabled={!!sessionToEdit}
                  value={selectedSubtaskId}
                  onChange={(e) => {
                    setSelectedSubtaskId(e.target.value);
                    const s = currentTask?.subtasks.find((item) => item.id === e.target.value);
                    if (s) {
                      setSubtaskEstimate(s.estimatedMinutes || 45);
                    }
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {currentTask?.subtasks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breadcrumb da Subtarefa Selecionada */}
            {currentSubtask && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="font-semibold text-slate-900">{currentSubtask.title}</span>
                  {currentSubtask.dueDate && (
                    <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                      Prazo: {currentSubtask.dueDate}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. TRÍADE TEMPORAL OPERACIONAL: ESTIMADO × RESERVADO × REALIZADO */}
          <div className="grid grid-cols-3 gap-3">
            {/* Estimado */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                1. Quanto Trabalho Tenho?
              </span>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={subtaskEstimate}
                  onChange={(e) => setSubtaskEstimate(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 text-center text-lg font-black text-slate-900 border border-slate-300 rounded-md py-0.5 bg-white"
                  title="Ajuste o tempo estimado total em minutos para esta subtarefa"
                />
                <span className="text-xs text-slate-500 font-bold">min</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Tempo Estimado</span>
            </div>

            {/* Reservado */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">
                2. Quanto Reservei?
              </span>
              <span className="text-xl font-black text-indigo-900 block">
                {formatMinutes(timeMetrics.reservedMinutes + (sessionToEdit ? 0 : plannedDurationMinutes))}
              </span>
              <span className="text-[10px] text-indigo-600/80 mt-1 block">
                {timeMetrics.coveragePercent}% de cobertura
              </span>
            </div>

            {/* Realizado */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-1">
                3. Quanto Consumiu?
              </span>
              <span className="text-xl font-black text-emerald-900 block">
                {formatMinutes(timeMetrics.actualMinutes + (status === 'completed' ? actualDurationMinutes : 0))}
              </span>
              <span className="text-[10px] text-emerald-600/80 mt-1 block">Tempo Realizado</span>
            </div>
          </div>

          {/* 3. DETALHES DO BLOCO DE EXECUÇÃO */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              3. Parâmetros da Sessão de Execução
            </span>

            {/* Linha de Datas e Horários */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Data do Bloco
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs pl-8 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Horário Início
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Horário Fim
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Duração Planejada
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={plannedDurationMinutes}
                    onChange={(e) => setPlannedDurationMinutes(Math.max(5, Number(e.target.value) || 30))}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <span className="text-xs text-slate-500 font-medium">min</span>
                </div>
              </div>
            </div>

            {/* Verificação de Conflitos de Planejamento (Sobreposição de Horário) */}
            {(() => {
              // Verifica se há outras sessões na mesma data com sobreposição
              const otherSessionsOnDate: Array<{ id: string; title: string; start: string; end: string }> = [];
              objective.milestones.forEach((m) => {
                m.tasks.forEach((t) => {
                  t.subtasks.forEach((s) => {
                    (s.executionSessions || []).forEach((sess) => {
                      if (sess.id !== (sessionToEdit?.id || '') && sess.status !== 'cancelled' && sess.date === date) {
                        otherSessionsOnDate.push({
                          id: sess.id,
                          title: s.title,
                          start: sess.startTime,
                          end: sess.endTime,
                        });
                      }
                    });
                  });
                });
              });

              const overlapping = otherSessionsOnDate
                .map((os) => ({
                  ...os,
                  overlap: calculateTimeOverlapMinutes(startTime, endTime, os.start, os.end),
                }))
                .filter((os) => os.overlap > 0);

              if (overlapping.length === 0) return null;

              return (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">
                      ⚠️ Conflito de Planejamento Detectado ({overlapping.length} sobreposição)
                    </strong>
                    <span className="text-amber-800 text-[11px] block mt-0.5">
                      Este bloco colide com:{' '}
                      {overlapping.map((o) => `"${o.title}" (${o.start}–${o.end}, ${o.overlap} min)`).join(', ')}.
                    </span>
                    <span className="text-[10px] text-amber-700/80 mt-1 block">
                      O cadastro é permitido, mas recomendamos ajustar os horários para evitar sobreposição na agenda.
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Objetivo Específico da Sessão */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Objetivo do Bloco de Foco
              </label>
              <div className="relative">
                <Target className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Contatar fornecedores e solicitar propostas formalizadas"
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Status e Cronômetro de Foco */}
            <div className="p-4 bg-slate-900 rounded-xl text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Execução & Cronômetro de Foco
                  </span>
                  <p className="text-xs text-slate-300">
                    Acompanhe em tempo real ou registre o tempo realizado.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={status}
                    onChange={(e) => {
                      const newSt = e.target.value as ExecutionSessionStatus;
                      if (newSt === 'in_progress') {
                        let activeOtherTitle: string | null = null;
                        objective.milestones.forEach((m) => {
                          m.tasks.forEach((t) => {
                            t.subtasks.forEach((s) => {
                              (s.executionSessions || []).forEach((sess) => {
                                if (sess.id !== (sessionToEdit?.id || '') && sess.status === 'in_progress') {
                                  activeOtherTitle = s.title;
                                }
                              });
                            });
                          });
                        });

                        if (activeOtherTitle) {
                          alert(
                            `Atenção: Apenas UMA Sessão de Execução pode estar em andamento (IN_PROGRESS) por vez.\n\nA subtarefa "${activeOtherTitle}" já está com cronômetro ativo.\nPausa ou conclua o bloco atual antes de iniciar outro.`
                          );
                          return;
                        }
                      }

                      setStatus(newSt);
                      if (newSt === 'in_progress' && !isTimerRunning) {
                        setIsTimerRunning(true);
                      } else if (newSt === 'completed') {
                        setIsTimerRunning(false);
                      }
                    }}
                    className="text-xs bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 font-bold focus:outline-hidden"
                  >
                    <option value="scheduled">📅 Agendada</option>
                    <option value="in_progress">▶️ Em Foco (Executando)</option>
                    <option value="completed">✅ Concluída</option>
                    <option value="cancelled">❌ Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Stopwatch Display */}
              <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-mono font-black text-indigo-400">
                    {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
                    {String(timerSeconds % 60).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span>Realizado registrado: </span>
                    <strong className="text-white">{actualDurationMinutes} min</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isTimerRunning ? (
                    <button
                      type="button"
                      onClick={() => {
                        // Invariante Etapa 4.3: Validar se já existe outra sessão em andamento
                        let activeOtherTitle: string | null = null;
                        objective.milestones.forEach((m) => {
                          m.tasks.forEach((t) => {
                            t.subtasks.forEach((s) => {
                              (s.executionSessions || []).forEach((sess) => {
                                if (sess.id !== (sessionToEdit?.id || '') && sess.status === 'in_progress') {
                                  activeOtherTitle = s.title;
                                }
                              });
                            });
                          });
                        });

                        if (activeOtherTitle) {
                          alert(
                            `Atenção: Apenas UMA Sessão de Execução pode estar em andamento (IN_PROGRESS) por vez.\n\nA subtarefa "${activeOtherTitle}" já está com cronômetro ativo.\nPausa ou conclua o bloco atual antes de iniciar outro.`
                          );
                          return;
                        }

                        const now = new Date().toISOString();
                        const evtType = events.length === 0 ? 'START' : 'RESUME';
                        setEvents((prev) => [
                          ...prev,
                          {
                            id: `evt-${Date.now()}`,
                            type: evtType,
                            timestamp: now,
                            note: evtType === 'START' ? 'Início do cronômetro de foco' : 'Retomada do foco',
                            actor: 'Operações',
                          },
                        ]);
                        setIsTimerRunning(true);
                        setStatus('in_progress');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{timerSeconds > 0 ? 'Retomar Foco' : 'Iniciar Foco'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date().toISOString();
                        setEvents((prev) => [
                          ...prev,
                          {
                            id: `evt-${Date.now()}`,
                            type: 'PAUSE',
                            timestamp: now,
                            note: 'Pausa registrada no bloco de foco',
                            actor: 'Operações',
                          },
                        ]);
                        setIsTimerRunning(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pausar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date().toISOString();
                      setEvents((prev) => [
                        ...prev,
                        {
                          id: `evt-${Date.now()}`,
                          type: 'COMPLETE',
                          timestamp: now,
                          note: 'Sessão concluída via cronômetro',
                          actor: 'Operações',
                        },
                      ]);
                      setIsTimerRunning(false);
                      setStatus('completed');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all"
                    title="Marcar sessão como concluída"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Concluir</span>
                  </button>
                </div>
              </div>

              {/* Histórico Temporal Append-only da Sessão */}
              {events.length > 0 && (
                <div className="pt-2 border-t border-slate-700/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    📜 Histórico Temporal de Execução ({events.length} evento{events.length > 1 ? 's' : ''})
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                    {events.map((evt, idx) => {
                      const timeDisplay = evt.timestamp.includes('T')
                        ? evt.timestamp.split('T')[1]?.slice(0, 8)
                        : evt.timestamp;
                      const badgeColor =
                        evt.type === 'START' || evt.type === 'RESUME'
                          ? 'text-emerald-400'
                          : evt.type === 'PAUSE'
                          ? 'text-amber-400'
                          : 'text-blue-400';
                      return (
                        <div key={evt.id || idx} className="flex items-center justify-between text-slate-300 bg-slate-800/60 px-2 py-1 rounded">
                          <span className="flex items-center gap-1.5">
                            <span className={`font-bold ${badgeColor}`}>[{evt.type}]</span>
                            <span>{evt.note || 'Evento de execução'}</span>
                          </span>
                          <span className="text-slate-400 text-[9px]">{timeDisplay}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Observações / Notas */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Anotações e Próximos Passos
              </label>
              <textarea
                rows={2}
                placeholder="Observações da execução, contatos realizados, resultados..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {sessionToEdit && onDeleteSession && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja realmente excluir este bloco de execução?')) {
                    onDeleteSession(selectedMilestoneId, selectedTaskId, selectedSubtaskId, sessionToEdit.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-bold px-2.5 py-1.5 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Bloco</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{sessionToEdit ? 'Salvar Alterações' : 'Confirmar Reserva'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
