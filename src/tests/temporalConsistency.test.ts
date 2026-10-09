/**
 * Suíte de Auditoria Temporal, Hardening da Agenda Operacional e Testes T01 a T23
 * Etapa 4.1: Validação Determinística da Camada Temporal da Matriz Operacional
 */

import { Objective, Dependency, Task, Subtask, Milestone, FollowUpRecurrence } from '../types';
import {
  buildOperationalSchedule,
  classifyTemporalCategory,
  TemporalCategory,
} from '../utils/scheduleProjection';
import {
  diffCivilDays,
  addCivilDays,
  calculateNextFollowUpDate,
  isValidCivilDate,
} from '../utils/civilDate';
import {
  getObjectiveStats,
  calculateTimeOverlapMinutes,
  detectScheduleConflicts,
  calculateActualMinutesFromEvents,
  getSubtaskTimeMetrics,
} from '../utils/helpers';
import { buildExecutiveReportData } from '../utils/executiveReport';

// ============================================================================
// FIXTURES TEMPORAIS T01 A T23
// ============================================================================

const REF_DATE = '2026-10-08';

function createBaseObjective(id: string, title: string): Objective {
  return {
    id,
    title,
    category: 'Auditoria Temporal',
    status: 'active',
    startDate: '2026-10-01',
    eventDate: '2026-10-31',
    endDate: '2026-10-31',
    milestones: [],
  };
}

export function runTemporalConsistencyAudit() {
  const results: Array<{ code: string; name: string; passed: boolean; details: string }> = [];

  function assert(code: string, name: string, condition: boolean, details: string) {
    results.push({
      code,
      name,
      passed: condition,
      details: condition ? 'Aprovado' : `Falha: ${details}`,
    });
  }

  // --------------------------------------------------------------------------
  // T01 — Prazo Hoje
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t01', 'T01');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco T01',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa vence hoje',
            category: 'Operacional',
            priority: 'high',
            deadline: '2026-10-08',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.hoje.find((i) => i.id === 't-deadline-t1');
    assert('T01', 'Prazo hoje', !!item && item.category === 'HOJE' && sched.summary.hojeCount === 1, 'Item não classificado como HOJE');
  }

  // --------------------------------------------------------------------------
  // T02 — Prazo Amanhã
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t02', 'T02');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco T02',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa vence amanhã',
            category: 'Operacional',
            priority: 'high',
            deadline: '2026-10-09',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.amanha.find((i) => i.id === 't-deadline-t1');
    assert('T02', 'Prazo amanhã', !!item && item.category === 'AMANHA' && sched.summary.amanhaCount === 1, 'Item não classificado como AMANHA');
  }

  // --------------------------------------------------------------------------
  // T03 — Prazo Ontem / Atrasado
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t03', 'T03');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco T03',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa atrasada',
            category: 'Operacional',
            priority: 'high',
            deadline: '2026-10-07',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.atrasado.find((i) => i.id === 't-deadline-t1');
    assert('T03', 'Prazo ontem / atrasado', !!item && item.category === 'ATRASADO' && sched.summary.atrasadoCount === 1, 'Item não classificado como ATRASADO');
  }

  // --------------------------------------------------------------------------
  // T04 — Prazo em exatamente 7 dias
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t04', 'T04');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco T04',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa em 7 dias',
            category: 'Operacional',
            priority: 'medium',
            deadline: '2026-10-15',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.prox7Dias.find((i) => i.id === 't-deadline-t1');
    assert('T04', 'Prazo em exatamente 7 dias', !!item && item.category === 'PROXIMOS_7_DIAS', 'Item de 7 dias não ficou em PROXIMOS_7_DIAS');
  }

  // --------------------------------------------------------------------------
  // T05 — Prazo em 8 dias
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t05', 'T05');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco T05',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa em 8 dias',
            category: 'Operacional',
            priority: 'medium',
            deadline: '2026-10-16',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.horizonteFuturo.find((i) => i.id === 't-deadline-t1');
    assert('T05', 'Prazo em 8 dias', !!item && item.category === 'HORIZONTE_FUTURO', 'Item de 8 dias não ficou em HORIZONTE_FUTURO');
  }

  // --------------------------------------------------------------------------
  // T06 — Item sem prazo
  // --------------------------------------------------------------------------
  {
    const classification = classifyTemporalCategory(undefined, REF_DATE);
    assert('T06', 'Item sem prazo', classification.category === 'SEM_DATA', 'Item sem data não recebeu categoria SEM_DATA');
  }

  // --------------------------------------------------------------------------
  // T07 — Follow-up hoje
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t07', 'T07');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'Cobrança para hoje',
                departmentOrOwner: 'Fornecedor A',
                status: 'pending',
                state: 'AGUARDANDO',
                bloqueandoFluxo: true,
                nextFollowUpDate: '2026-10-08',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.hoje.find((i) => i.id === 'dep-act-d1');
    assert('T07', 'Follow-up hoje', !!item && item.category === 'HOJE', 'Follow-up de hoje não encontrado em HOJE');
  }

  // --------------------------------------------------------------------------
  // T08 — Follow-up amanhã
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t08', 'T08');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'Cobrança para amanhã',
                departmentOrOwner: 'Fornecedor B',
                status: 'pending',
                state: 'AGUARDANDO',
                bloqueandoFluxo: false,
                nextFollowUpDate: '2026-10-09',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.amanha.find((i) => i.id === 'dep-act-d1');
    assert('T08', 'Follow-up amanhã', !!item && item.category === 'AMANHA', 'Follow-up de amanhã não encontrado em AMANHA');
  }

  // --------------------------------------------------------------------------
  // T09 — Follow-up vencido
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t09', 'T09');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'Cobrança atrasada',
                departmentOrOwner: 'Fornecedor C',
                status: 'pending',
                state: 'AGUARDANDO',
                bloqueandoFluxo: true,
                nextFollowUpDate: '2026-10-06',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.atrasado.find((i) => i.id === 'dep-act-d1');
    assert('T09', 'Follow-up vencido', !!item && item.category === 'ATRASADO', 'Follow-up vencido não encontrado em ATRASADO');
  }

  // --------------------------------------------------------------------------
  // T10 — Follow-up futuro (> 7 dias)
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t10', 'T10');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'Cobrança futura',
                departmentOrOwner: 'Fornecedor D',
                status: 'pending',
                state: 'AGUARDANDO',
                bloqueandoFluxo: false,
                nextFollowUpDate: '2026-10-25',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.horizonteFuturo.find((i) => i.id === 'dep-act-d1');
    assert('T10', 'Follow-up futuro', !!item && item.category === 'HORIZONTE_FUTURO', 'Follow-up futuro não classificado em HORIZONTE_FUTURO');
  }

  // --------------------------------------------------------------------------
  // T11 — SLA vencido sem nextFollowUpDate
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t11', 'T11');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'SLA vencido sem data de follow-up',
                departmentOrOwner: 'Setor X',
                status: 'blocked',
                state: 'EM_RISCO',
                bloqueandoFluxo: false,
                slaDeadline: '2026-10-05',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.atrasado.find((i) => i.id === 'dep-act-d1');
    assert('T11', 'SLA vencido sem nextFollowUpDate', !!item && item.category === 'ATRASADO' && item.slaStatus === 'SLA_VENCIDO', 'Fallback do SLA não assumiu em ATRASADO');
  }

  // --------------------------------------------------------------------------
  // T12 — SLA vencido com follow-up futuro
  // Invariante T3: SLA e Próxima Cobrança são independentes
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t12', 'T12');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'SLA vencido mas cobrança agendada para o dia 10',
                departmentOrOwner: 'Setor Y',
                status: 'blocked',
                state: 'EM_RISCO',
                bloqueandoFluxo: false,
                slaDeadline: '2026-10-06',
                nextFollowUpDate: '2026-10-10', // em 2 dias
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.prox7Dias.find((i) => i.id === 'dep-act-d1');
    assert(
      'T12',
      'SLA vencido com follow-up futuro',
      !!item && item.category === 'PROXIMOS_7_DIAS' && item.slaStatus === 'SLA_VENCIDO',
      'Follow-up não respeitou a data de cobrança independente do SLA'
    );
  }

  // --------------------------------------------------------------------------
  // T13 — Dependência ATENDIDA com follow-up antigo
  // Invariante T4: ATENDIDA não gera cobrança ativa na agenda
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t13', 'T13');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'Dependência já atendida',
                departmentOrOwner: 'Fornecedor E',
                status: 'cleared',
                state: 'ATENDIDA',
                bloqueandoFluxo: false,
                resolvedAt: '2026-10-05',
                nextFollowUpDate: '2026-10-06',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const item = sched.queues.atrasado.concat(sched.queues.hoje).find((i) => i.id === 'dep-act-d1');
    assert('T13', 'Dependência ATENDIDA com follow-up antigo', item === undefined, 'Dependência ATENDIDA apareceu na agenda ativa');
  }

  // --------------------------------------------------------------------------
  // T14 — Dependência ATENDIDA com nextFollowUpDate preenchido indevidamente
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t14', 'T14');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'Dependência atendida com data de hoje',
                departmentOrOwner: 'Fornecedor F',
                status: 'cleared',
                state: 'ATENDIDA',
                bloqueandoFluxo: false,
                resolvedAt: '2026-10-08',
                nextFollowUpDate: '2026-10-08',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const anyDep = sched.queues.hoje.find((i) => i.id === 'dep-act-d1');
    assert('T14', 'Dependência ATENDIDA com data de hoje ignorada na agenda', anyDep === undefined, 'Dependência resolvida gerou cobrança');
  }

  // --------------------------------------------------------------------------
  // T15 — Tarefa concluída antes do prazo
  // Invariante T5: Concluída não aparece em atraso ou agenda ativa
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t15', 'T15');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa concluída antes',
            category: 'Operacional',
            priority: 'medium',
            deadline: '2026-10-12',
            subtasks: [{ id: 's1', title: 'Sub', status: 'completed' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const taskItem = sched.queues.prox7Dias.find((i) => i.id === 't-deadline-t1');
    assert('T15', 'Tarefa concluída antes do prazo', taskItem === undefined, 'Tarefa 100% concluída constou na agenda ativa');
  }

  // --------------------------------------------------------------------------
  // T16 — Tarefa concluída no prazo
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t16', 'T16');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa concluída no prazo',
            category: 'Operacional',
            priority: 'medium',
            deadline: '2026-10-08',
            subtasks: [{ id: 's1', title: 'Sub', status: 'completed' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const taskItem = sched.queues.hoje.find((i) => i.id === 't-deadline-t1');
    assert('T16', 'Tarefa concluída no prazo', taskItem === undefined, 'Tarefa concluída apareceu em HOJE');
  }

  // --------------------------------------------------------------------------
  // T17 — Tarefa concluída depois do prazo
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t17', 'T17');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa concluída mas com prazo no passado',
            category: 'Operacional',
            priority: 'medium',
            deadline: '2026-10-05',
            subtasks: [{ id: 's1', title: 'Sub', status: 'completed' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const taskItem = sched.queues.atrasado.find((i) => i.id === 't-deadline-t1');
    assert('T17', 'Tarefa concluída depois do prazo', taskItem === undefined, 'Tarefa concluída apareceu como ATRASADA');
  }

  // --------------------------------------------------------------------------
  // T18 — Marco atrasado
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t18', 'T18');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco atrasado',
        status: 'em_andamento',
        targetDate: '2026-10-05',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa incompleta',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'pending' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const mItem = sched.queues.atrasado.find((i) => i.id === 'm-target-m1');
    assert('T18', 'Marco atrasado', !!mItem && mItem.category === 'ATRASADO', 'Marco atrasado não constou na fila ATRASADO');
  }

  // --------------------------------------------------------------------------
  // T19 — Marco concluído com atraso
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-t19', 'T19');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco concluído',
        status: 'concluido',
        targetDate: '2026-10-05',
        completedAt: '2026-10-07',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'Sub', status: 'completed' }],
            dependencies: [],
          },
        ],
      },
    ];
    const sched = buildOperationalSchedule(obj, REF_DATE);
    const mItem = sched.queues.atrasado.find((i) => i.id === 'm-target-m1');
    assert('T19', 'Marco concluído com atraso', mItem === undefined, 'Marco concluído apareceu em atraso ativo');
  }

  // --------------------------------------------------------------------------
  // T20 — Recorrência Diária: Próxima data = D + 1
  // --------------------------------------------------------------------------
  {
    const nextDate = calculateNextFollowUpDate('2026-10-08', 'daily');
    assert('T20', 'Recorrência diária', nextDate === '2026-10-09', `Esperado 2026-10-09, obtido ${nextDate}`);
  }

  // --------------------------------------------------------------------------
  // T21 — Recorrência a Cada 2 Dias: Próxima data = D + 2
  // --------------------------------------------------------------------------
  {
    const nextDate = calculateNextFollowUpDate('2026-10-08', 'every_2_days');
    assert('T21', 'Recorrência a cada 2 dias', nextDate === '2026-10-10', `Esperado 2026-10-10, obtido ${nextDate}`);
  }

  // --------------------------------------------------------------------------
  // T22 — Recorrência Semanal: Próxima data = D + 7
  // --------------------------------------------------------------------------
  {
    const nextDate = calculateNextFollowUpDate('2026-10-08', 'weekly');
    assert('T22', 'Recorrência semanal', nextDate === '2026-10-15', `Esperado 2026-10-15, obtido ${nextDate}`);
  }

  // --------------------------------------------------------------------------
  // T23 — Recorrência None: Próxima data = null
  // --------------------------------------------------------------------------
  {
    const nextDate = calculateNextFollowUpDate('2026-10-08', 'none');
    assert('T23', 'Recorrência none', nextDate === null, `Esperado null, obtido ${nextDate}`);
  }

  // --------------------------------------------------------------------------
  // TESTES DE TIMEZONE E TRANSIÇÕES DE CALENDÁRIO CIVIL
  // --------------------------------------------------------------------------
  {
    const t31dez = addCivilDays('2026-12-31', 1);
    assert('TZ1', 'Virada de ano civil 31/12 -> 01/01', t31dez === '2027-01-01', `Esperado 2027-01-01, obtido ${t31dez}`);

    const t28fevComum = addCivilDays('2026-02-28', 1);
    assert('TZ2', 'Fim de fevereiro ano comum 28/02 -> 01/03', t28fevComum === '2026-03-01', `Esperado 2026-03-01, obtido ${t28fevComum}`);

    const t28fevBissexto = addCivilDays('2024-02-28', 1);
    assert('TZ3', 'Fim de fevereiro ano bissexto 28/02 -> 29/02', t28fevBissexto === '2024-02-29', `Esperado 2024-02-29, obtido ${t28fevBissexto}`);

    const diffMes = diffCivilDays('2026-11-01', '2026-10-31');
    assert('TZ4', 'Diferença em virada de mês 31/10 a 01/11 = 1 dia', diffMes === 1, `Esperado 1, obtido ${diffMes}`);
  }

  // --------------------------------------------------------------------------
  // TESTE DE PARIDADE: AGENDA × RADAR × RELATÓRIO
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-parity', 'Paridade Temporal');
    obj.milestones = [
      {
        id: 'm1',
        title: 'M1',
        tasks: [
          {
            id: 't1',
            title: 'T1',
            category: 'Operacional',
            priority: 'high',
            subtasks: [{ id: 's1', title: 'S1', status: 'pending' }],
            dependencies: [
              {
                id: 'd1',
                title: 'D1 Bloqueando',
                departmentOrOwner: 'Charles / Superintendência',
                status: 'blocked',
                state: 'AGUARDANDO',
                bloqueandoFluxo: true,
                slaDeadline: '2026-10-08',
                nextFollowUpDate: '2026-10-08',
                followUps: [],
              },
              {
                id: 'd2',
                title: 'D2 Atendida',
                departmentOrOwner: 'Charles / Superintendência',
                status: 'cleared',
                state: 'ATENDIDA',
                bloqueandoFluxo: false,
                resolvedAt: '2026-10-07',
                followUps: [],
              },
            ],
          },
        ],
      },
    ];

    const stats = getObjectiveStats(obj);
    const report = buildExecutiveReportData(obj);
    const sched = buildOperationalSchedule(obj, REF_DATE);

    // Na Árvore e no Radar: exatamente 1 dependência bloqueando
    const treeBlocking = stats.bloqueandoDependencies;
    const reportBlocking = report.situacaoAtual.bloqueandoAgora.length;
    const schedBlocking = sched.summary.blockingCount;

    assert(
      'PARIDADE',
      'Paridade absoluta Agenda x Radar x Relatório para bloqueios ativos',
      treeBlocking === 1 && reportBlocking === 1 && schedBlocking === 1,
      `Divergência detectada: Tree=${treeBlocking}, Report=${reportBlocking}, Sched=${schedBlocking}`
    );

    // Fila por responsável: Charles deve possuir exatamente 1 dependência ativa na agenda
    const charlesQueue = sched.byOwner.find((o) => o.ownerName === 'Charles / Superintendência');
    assert(
      'AGRUPAMENTO',
      'Agrupamento por responsável ignora dependência atendida',
      !!charlesQueue && charlesQueue.items.length === 1 && charlesQueue.items[0].id === 'dep-act-d1',
      'Charles acumulou dependência resolvida na fila ativa'
    );
  }

  // ==========================================================================
  // SUÍTE DE TESTES DE TIME BOXING & SESSÕES DE EXECUÇÃO (ETAPA 4.2)
  // ==========================================================================

  // --------------------------------------------------------------------------
  // TB01 — Subtarefa com múltiplas sessões calcula reservado e realizado
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb01', 'TB01');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco Infra',
        tasks: [
          {
            id: 't1',
            title: 'Contratar 4 climatizadores',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Solicitar orçamento',
                status: 'in_progress',
                estimatedMinutes: 60,
                dueDate: '2026-10-15',
                executionSessions: [
                  {
                    id: 'sess-1',
                    subtaskId: 's1',
                    date: '2026-10-08',
                    startTime: '10:00',
                    endTime: '10:30',
                    plannedDurationMinutes: 30,
                    actualDurationMinutes: 24,
                    status: 'completed',
                  },
                  {
                    id: 'sess-2',
                    subtaskId: 's1',
                    date: '2026-10-09',
                    startTime: '14:00',
                    endTime: '14:20',
                    plannedDurationMinutes: 20,
                    status: 'scheduled',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const sched = buildOperationalSchedule(obj, REF_DATE);
    const sub = obj.milestones[0].tasks[0].subtasks[0];
    const metrics = sched.timeSummary;

    assert(
      'TB01',
      'Múltiplas sessões calculam tempo reservado futuro (20m), histórico planejado (50m) e realizado (24m)',
      metrics.totalEstimatedMinutes === 60 &&
        metrics.totalReservedMinutes === 20 &&
        metrics.totalPlannedHistoricalMinutes === 50 &&
        metrics.totalActualMinutes === 24,
      `Valores divergentes: Est=${metrics.totalEstimatedMinutes}, Res=${metrics.totalReservedMinutes}, Hist=${metrics.totalPlannedHistoricalMinutes}, Real=${metrics.totalActualMinutes}`
    );
  }

  // --------------------------------------------------------------------------
  // TB02 — Sessão cancelada não afeta tempo reservado
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb02', 'TB02');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Subtarefa',
                status: 'pending',
                estimatedMinutes: 45,
                executionSessions: [
                  {
                    id: 'sess-active',
                    subtaskId: 's1',
                    date: '2026-10-08',
                    startTime: '09:00',
                    endTime: '09:30',
                    plannedDurationMinutes: 30,
                    status: 'scheduled',
                  },
                  {
                    id: 'sess-cancelled',
                    subtaskId: 's1',
                    date: '2026-10-08',
                    startTime: '11:00',
                    endTime: '11:30',
                    plannedDurationMinutes: 30,
                    status: 'cancelled',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const sched = buildOperationalSchedule(obj, REF_DATE);
    assert(
      'TB02',
      'Sessão cancelada ignorada no cálculo de tempo reservado',
      sched.timeSummary.totalReservedMinutes === 30,
      `Esperado 30 min reservado, obteve ${sched.timeSummary.totalReservedMinutes}`
    );
  }

  // --------------------------------------------------------------------------
  // TB03 — Prazo final (dueDate) não se confunde com horário de execução
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb03', 'TB03');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Elaborar relatório do evento',
                status: 'pending',
                dueDate: '2026-10-16', // Prazo em 8 dias
                estimatedMinutes: 90,
                executionSessions: [
                  {
                    id: 'sess-bloco1',
                    subtaskId: 's1',
                    date: '2026-10-08', // Bloco hoje
                    startTime: '10:00',
                    endTime: '10:30',
                    plannedDurationMinutes: 30,
                    status: 'scheduled',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const sched = buildOperationalSchedule(obj, REF_DATE);
    // Subtask com dueDate 16/10 é HORIZONTE_FUTURO na fila de prazos de entrega
    const dueQueueItem = sched.queues.horizonteFuturo.find((i) => i.subtaskId === 's1');
    // Mas a sessão de execução está em sessões de HOJE
    const todaySession = sched.sessionsQueue.hoje.find((s) => s.subtaskId === 's1');

    assert(
      'TB03',
      'Prazo final (dueDate) permanece independente dos blocos de execução',
      !!dueQueueItem && !!todaySession && todaySession.date === REF_DATE,
      'Confusão entre dueDate da subtarefa e horário da sessão de foco'
    );
  }

  // --------------------------------------------------------------------------
  // TB04 — Sessão ativa ("AGORA") identificada com prioridade em andamento
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb04', 'TB04');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Subtarefa com foco ativo',
                status: 'in_progress',
                executionSessions: [
                  {
                    id: 'sess-scheduled',
                    subtaskId: 's1',
                    date: '2026-10-08',
                    startTime: '08:00',
                    endTime: '08:30',
                    plannedDurationMinutes: 30,
                    status: 'scheduled',
                  },
                  {
                    id: 'sess-active',
                    subtaskId: 's1',
                    date: '2026-10-08',
                    startTime: '10:00',
                    endTime: '10:30',
                    plannedDurationMinutes: 30,
                    status: 'in_progress',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const sched = buildOperationalSchedule(obj, REF_DATE);
    assert(
      'TB04',
      'Sessão in_progress tem precedência para AGORA sobre scheduled',
      sched.sessionsQueue.activeNowSession?.id === 'sess-active',
      `Sessão ativa detectada: ${sched.sessionsQueue.activeNowSession?.id}`
    );
  }

  // --------------------------------------------------------------------------
  // TB05 — Preservação estrita dos 4 níveis hierárquicos e métricas canônicas
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb05', 'TB05');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco 1',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa 1',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Subtarefa com 3 blocos',
                status: 'completed',
                executionSessions: [
                  { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'completed' },
                  { id: 'b2', subtaskId: 's1', date: '2026-10-08', startTime: '14:00', endTime: '14:30', plannedDurationMinutes: 30, status: 'completed' },
                  { id: 'b3', subtaskId: 's1', date: '2026-10-09', startTime: '09:00', endTime: '09:30', plannedDurationMinutes: 30, status: 'completed' },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Contagem da hierarquia:
    // 1 Objetivo -> 1 Marco -> 1 Tarefa -> 1 Subtarefa (NÃO 3 subtarefas nem 5 níveis)
    const totalMilestones = obj.milestones.length;
    const totalTasks = obj.milestones[0].tasks.length;
    const totalSubtasks = obj.milestones[0].tasks[0].subtasks.length;
    const totalSessions = obj.milestones[0].tasks[0].subtasks[0].executionSessions?.length || 0;

    assert(
      'TB05',
      'Invariante hierárquica preservada: 1 Marco, 1 Tarefa, 1 Subtarefa e 3 Sessões transversais',
      totalMilestones === 1 && totalTasks === 1 && totalSubtasks === 1 && totalSessions === 3,
      `Contagem incorreta da hierarquia: M=${totalMilestones}, T=${totalTasks}, S=${totalSubtasks}, Sess=${totalSessions}`
    );
  }

  // --------------------------------------------------------------------------
  // TB06 — Invariante de Execução Única: No máximo UMA sessão IN_PROGRESS por vez
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb06', 'TB06');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa 1',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Sub 1',
                status: 'in_progress',
                executionSessions: [
                  { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'in_progress' },
                ],
              },
              {
                id: 's2',
                title: 'Sub 2',
                status: 'pending',
                executionSessions: [
                  { id: 'b2', subtaskId: 's2', date: '2026-10-08', startTime: '10:15', endTime: '10:45', plannedDurationMinutes: 30, status: 'scheduled' },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Helper simula a regra de transição: tentar iniciar b2 enquanto b1 está in_progress é rejeitado
    const allSessions = obj.milestones[0].tasks[0].subtasks.flatMap((s) => s.executionSessions || []);
    const inProgressCount = allSessions.filter((s) => s.status === 'in_progress').length;
    const canStartAnotherWithoutPausing = inProgressCount < 1;

    assert(
      'TB06',
      'Invariante global de foco: apenas 1 sessão in_progress permitida simultaneamente',
      inProgressCount === 1 && canStartAnotherWithoutPausing === false,
      `Invariante violada: sessões em progresso = ${inProgressCount}`
    );
  }

  // --------------------------------------------------------------------------
  // TB07 — Detecção de Conflito de Planejamento (Sobreposição de horário na agenda)
  // --------------------------------------------------------------------------
  {
    const sessionList = [
      { id: 'b1', subtaskTitle: 'Solicitar orçamento', date: '2026-10-08', startTime: '10:00', endTime: '10:30', status: 'scheduled' },
      { id: 'b2', subtaskTitle: 'Preparar relatório', date: '2026-10-08', startTime: '10:20', endTime: '11:00', status: 'scheduled' },
    ];

    const conflicts = detectScheduleConflicts(sessionList);
    const overlapMin = calculateTimeOverlapMinutes('10:00', '10:30', '10:20', '11:00');

    assert(
      'TB07',
      'Detecção de conflito de planejamento: 10 minutos de sobreposição detectados sem travar cadastro',
      conflicts.length === 1 && conflicts[0].overlapMinutes === 10 && overlapMin === 10,
      `Conflito não detectado corretamente: count=${conflicts.length}, min=${overlapMin}`
    );
  }

  // --------------------------------------------------------------------------
  // TB08 — Cronômetro canônico com pausas: cálculo correto de tempo efetivo trabalhado
  // --------------------------------------------------------------------------
  {
    // Cenário do usuário:
    // INICIAR 10:00 -> PAUSAR 10:12 (12m foco) -> RETOMAR 10:20 (8m pausa) -> CONCLUIR 10:38 (18m foco)
    // Resultado canônico: 12 + 18 = 30m realizado (e NÃO 38m).
    const events = [
      { id: 'e1', type: 'START' as const, timestamp: '10:00' },
      { id: 'e2', type: 'PAUSE' as const, timestamp: '10:12' },
      { id: 'e3', type: 'RESUME' as const, timestamp: '10:20' },
      { id: 'e4', type: 'COMPLETE' as const, timestamp: '10:38' },
    ];

    const result = calculateActualMinutesFromEvents(events);

    assert(
      'TB08',
      'Cronômetro canônico: desconta pausas corretamente (12m + 18m = 30m de foco; 8m pausa; 1 interrupção)',
      result.actualMinutes === 30 && result.pauseMinutes === 8 && result.interruptionsCount === 1,
      `Cálculo incorreto: realizado=${result.actualMinutes}m, pausa=${result.pauseMinutes}m, interr=${result.interruptionsCount}`
    );
  }

  // --------------------------------------------------------------------------
  // TB09 — Histórico append-only: integridade dos 4 eventos registrados na sessão
  // --------------------------------------------------------------------------
  {
    const events = [
      { id: 'e1', type: 'START' as const, timestamp: '2026-10-08T10:00:00Z', note: 'Início', actor: 'Operações' },
      { id: 'e2', type: 'PAUSE' as const, timestamp: '2026-10-08T10:12:00Z', note: 'Pausa para telefone', actor: 'Operações' },
      { id: 'e3', type: 'RESUME' as const, timestamp: '2026-10-08T10:20:00Z', note: 'Retomada', actor: 'Operações' },
      { id: 'e4', type: 'COMPLETE' as const, timestamp: '2026-10-08T10:38:00Z', note: 'Conclusão', actor: 'Operações' },
    ];

    const session = {
      id: 'sess-tb09',
      subtaskId: 's1',
      date: '2026-10-08',
      startTime: '10:00',
      endTime: '10:30',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 30,
      status: 'completed' as const,
      events,
    };

    assert(
      'TB09',
      'Histórico append-only preserva percurso auditável de 4 eventos sem sobrescrever estado',
      session.events.length === 4 &&
        session.events[0].type === 'START' &&
        session.events[1].type === 'PAUSE' &&
        session.events[2].type === 'RESUME' &&
        session.events[3].type === 'COMPLETE',
      `Histórico inconsistente: count=${session.events.length}`
    );
  }

  // --------------------------------------------------------------------------
  // TB10 — Sessão Perdida (MISSED): bloco passado não iniciado identificado sem alteração silenciosa
  // --------------------------------------------------------------------------
  {
    const obj = createBaseObjective('obj-tb10', 'TB10');
    obj.milestones = [
      {
        id: 'm1',
        title: 'Marco',
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            category: 'Operacional',
            priority: 'high',
            dependencies: [],
            subtasks: [
              {
                id: 's1',
                title: 'Subtarefa com bloco ontem',
                status: 'pending',
                executionSessions: [
                  {
                    id: 'b-passado',
                    subtaskId: 's1',
                    date: '2026-10-07', // Ontem em relação a 2026-10-08
                    startTime: '10:00',
                    endTime: '10:30',
                    plannedDurationMinutes: 30,
                    status: 'scheduled', // Nunca foi iniciado
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const sched = buildOperationalSchedule(obj, REF_DATE);

    assert(
      'TB10',
      'Sessão passada (ontem) com status scheduled é identificada como sessão perdida (MISSED)',
      sched.sessionsQueue.missedSessions.length === 1 &&
        sched.sessionsQueue.missedSessions[0].id === 'b-passado' &&
        sched.sessionsQueue.missedSessions[0].category === 'ATRASADO',
      `Sessão perdida não identificada: count=${sched.sessionsQueue.missedSessions.length}`
    );
  }

  // --------------------------------------------------------------------------
  // TB11 — Reagendamento preserva sessão original (rescheduledFromSessionId)
  // --------------------------------------------------------------------------
  {
    // Sessão A (original): 08/10 10:00–10:30 marcada como rescheduled
    // Sessão B (nova): 09/10 14:00–14:30 scheduled com rescheduledFromSessionId = 'sess-orig'
    const sessionOriginal: any = {
      id: 'sess-orig',
      subtaskId: 's1',
      date: '2026-10-08',
      startTime: '10:00',
      endTime: '10:30',
      plannedDurationMinutes: 30,
      status: 'rescheduled',
      rescheduledToSessionId: 'sess-reagendada',
    };

    const sessionNova: any = {
      id: 'sess-reagendada',
      subtaskId: 's1',
      date: '2026-10-09',
      startTime: '14:00',
      endTime: '14:30',
      plannedDurationMinutes: 30,
      status: 'scheduled',
      rescheduledFromSessionId: 'sess-orig',
    };

    const subtask: Subtask = {
      id: 's1',
      title: 'Solicitar orçamentos',
      status: 'pending',
      estimatedMinutes: 60,
      executionSessions: [sessionOriginal, sessionNova],
    };

    const metrics = getSubtaskTimeMetrics(subtask);

    assert(
      'TB11',
      'Reagendamento preserva a sessão original (status rescheduled) e vincula via rescheduledFromSessionId',
      sessionNova.rescheduledFromSessionId === 'sess-orig' &&
        sessionOriginal.status === 'rescheduled' &&
        sessionNova.status === 'scheduled' &&
        subtask.executionSessions?.length === 2 &&
        metrics.reservedUpcomingMinutes === 30,
      `Vínculo de reagendamento inválido: count=${subtask.executionSessions?.length}, reserved=${metrics.reservedUpcomingMinutes}`
    );
  }

  // --------------------------------------------------------------------------
  // TB12 — Sessão cancelada não entra no reservado futuro (reservedUpcomingMinutes)
  // --------------------------------------------------------------------------
  {
    const subtask: Subtask = {
      id: 's1',
      title: 'Tarefa com sessões diversas',
      status: 'pending',
      estimatedMinutes: 120,
      executionSessions: [
        { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'completed' },
        { id: 'b2', subtaskId: 's1', date: '2026-10-09', startTime: '14:00', endTime: '14:30', plannedDurationMinutes: 30, status: 'scheduled' },
        { id: 'b3', subtaskId: 's1', date: '2026-10-10', startTime: '09:00', endTime: '09:30', plannedDurationMinutes: 30, status: 'cancelled' },
        { id: 'b4', subtaskId: 's1', date: '2026-10-07', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'rescheduled' },
      ],
    };

    const metrics = getSubtaskTimeMetrics(subtask);

    // reservedUpcomingMinutes deve somar APENAS 'scheduled' e 'in_progress' (b2 = 30min)
    // NÃO deve somar b1 (completed), b3 (cancelled) nem b4 (rescheduled)
    assert(
      'TB12',
      'Sessão cancelada, concluída e reagendada não entram no reservado futuro (apenas 30m de b2)',
      metrics.reservedUpcomingMinutes === 30,
      `Tempo reservado futuro incorreto: ${metrics.reservedUpcomingMinutes}m (esperado: 30m)`
    );
  }

  // --------------------------------------------------------------------------
  // TB13 — Cobertura pode passar de 100% (sem clamp)
  // --------------------------------------------------------------------------
  {
    // Estimativa: 60 min, Reservado: 90 min -> Cobertura = 150%, excedente = +30 min
    const subtask: Subtask = {
      id: 's1',
      title: 'Negociação com fornecedores',
      status: 'pending',
      estimatedMinutes: 60,
      executionSessions: [
        { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '11:00', plannedDurationMinutes: 60, status: 'scheduled' },
        { id: 'b2', subtaskId: 's1', date: '2026-10-09', startTime: '14:00', endTime: '14:30', plannedDurationMinutes: 30, status: 'scheduled' },
      ],
    };

    const metrics = getSubtaskTimeMetrics(subtask);

    assert(
      'TB13',
      'Cobertura superior a 100% calculada sem clamp (150% com +30 min acima da estimativa)',
      metrics.coveragePercent === 150 && metrics.coverageDeltaMinutes === 30 && metrics.planningGapMinutes === -30,
      `Cobertura clampada ou errada: percent=${metrics.coveragePercent}%, delta=${metrics.coverageDeltaMinutes}`
    );
  }

  // --------------------------------------------------------------------------
  // TB14 — Cálculo do gap de planejamento (planningGapMinutes)
  // --------------------------------------------------------------------------
  {
    // Exemplo do usuário: Estimado: 180 min, Reservado: 60 min -> Gap = 120 min (2h sem horário reservado)
    const subtask: Subtask = {
      id: 's1',
      title: 'Elaborar relatório',
      status: 'pending',
      estimatedMinutes: 180,
      executionSessions: [
        { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '11:00', plannedDurationMinutes: 60, status: 'scheduled' },
      ],
    };

    const metrics = getSubtaskTimeMetrics(subtask);

    assert(
      'TB14',
      'Cálculo do gap de planejamento: 120 min de trabalho estimado ainda sem horário reservado',
      metrics.planningGapMinutes === 120 && metrics.reservedUpcomingMinutes === 60,
      `Gap de planejamento incorreto: gap=${metrics.planningGapMinutes}m (esperado: 120m)`
    );
  }

  // --------------------------------------------------------------------------
  // TB15 — Conclusão da subtarefa cancela blocos futuros (reason: SUBTASK_COMPLETED)
  // --------------------------------------------------------------------------
  {
    const subtask: Subtask = {
      id: 's1',
      title: 'Subtarefa com bloco futuro',
      status: 'pending',
      estimatedMinutes: 60,
      executionSessions: [
        { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'completed' },
        { id: 'b2', subtaskId: 's1', date: '2026-10-15', startTime: '14:00', endTime: '14:30', plannedDurationMinutes: 30, status: 'scheduled' },
      ],
    };

    // Ao concluir a subtarefa, b2 passa a cancelled com reason SUBTASK_COMPLETED
    const updatedSessions = (subtask.executionSessions || []).map((sess) => {
      if (sess.status === 'scheduled') {
        return {
          ...sess,
          status: 'cancelled' as const,
          cancellationReason: 'SUBTASK_COMPLETED',
        };
      }
      return sess;
    });

    const subtaskConcluida: Subtask = {
      ...subtask,
      status: 'completed',
      executionSessions: updatedSessions,
    };

    const metrics = getSubtaskTimeMetrics(subtaskConcluida);

    assert(
      'TB15',
      'Conclusão da subtarefa cancela blocos futuros com motivo SUBTASK_COMPLETED e zera reservado futuro',
      updatedSessions[1].status === 'cancelled' &&
        updatedSessions[1].cancellationReason === 'SUBTASK_COMPLETED' &&
        metrics.reservedUpcomingMinutes === 0,
      `Bloco futuro não cancelado: status=${updatedSessions[1].status}, reserved=${metrics.reservedUpcomingMinutes}`
    );
  }

  // --------------------------------------------------------------------------
  // TB16 — Concluir sessão não conclui subtarefa (domínios distintos)
  // --------------------------------------------------------------------------
  {
    const subtask: Subtask = {
      id: 's1',
      title: 'Montar painel de controle',
      status: 'pending',
      estimatedMinutes: 90,
      executionSessions: [
        { id: 'b1', subtaskId: 's1', date: '2026-10-08', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'completed' },
        { id: 'b2', subtaskId: 's1', date: '2026-10-09', startTime: '10:00', endTime: '10:30', plannedDurationMinutes: 30, status: 'scheduled' },
      ],
    };

    // A sessão b1 foi concluída, mas a subtarefa continua 'pending' (ou 'in_progress'), NÃO concluída
    assert(
      'TB16',
      'Concluir sessão de execução preserva status da subtarefa (ExecutionSession = COMPLETED ≠ Subtask = COMPLETED)',
      subtask.executionSessions![0].status === 'completed' && subtask.status !== 'completed',
      `Subtarefa indevidamente concluída junto com sessão`
    );
  }

  // --------------------------------------------------------------------------
  // TB17 — Sessão concluída preserva plannedMinutes mesmo com desvio em actualMinutes
  // --------------------------------------------------------------------------
  {
    // Cenário do usuário: Planejado: 30 min, Realizado: 42 min. plannedMinutes DEVE permanecer 30 min.
    const session = {
      id: 'sess-tb17',
      subtaskId: 's1',
      date: '2026-10-08',
      startTime: '10:00',
      endTime: '10:30',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 42,
      status: 'completed' as const,
    };

    const desvio = (session.actualDurationMinutes || 0) - session.plannedDurationMinutes;

    assert(
      'TB17',
      'Sessão concluída preserva plannedDurationMinutes intacto (30m planejado vs 42m realizado, desvio +12m)',
      session.plannedDurationMinutes === 30 && session.actualDurationMinutes === 42 && desvio === 12,
      `plannedDurationMinutes foi sobrescrito: planejado=${session.plannedDurationMinutes}`
    );
  }

  // --------------------------------------------------------------------------
  // TB18 — RealizedMinutes exclui todos os períodos pausados (apenas intervalos ativos)
  // --------------------------------------------------------------------------
  {
    const events = [
      { id: 'e1', type: 'START' as const, timestamp: '10:00' },
      { id: 'e2', type: 'PAUSE' as const, timestamp: '10:15' }, // 15m foco
      { id: 'e3', type: 'RESUME' as const, timestamp: '10:30' }, // 15m pausa
      { id: 'e4', type: 'PAUSE' as const, timestamp: '10:45' }, // 15m foco
      { id: 'e5', type: 'RESUME' as const, timestamp: '11:00' }, // 15m pausa
      { id: 'e6', type: 'COMPLETE' as const, timestamp: '11:10' }, // 10m foco
    ];

    // Foco total: 15 + 15 + 10 = 40 min
    // Pausa total: 15 + 15 = 30 min
    const { actualMinutes, pauseMinutes, interruptionsCount } = calculateActualMinutesFromEvents(events);

    assert(
      'TB18',
      'RealizedMinutes soma exclusivamente intervalos ativos START/RESUME -> PAUSE/COMPLETE (40m ativo, 30m pausa, 2 interrupções)',
      actualMinutes === 40 && pauseMinutes === 30 && interruptionsCount === 2,
      `Cálculo com pausas falhou: ativo=${actualMinutes}m, pausa=${pauseMinutes}m`
    );
  }

  // --------------------------------------------------------------------------
  // TB19 — Matriz de Conflitos: Sobreposição parcial (10:00–10:30 e 10:20–11:00 = 10 min)
  // --------------------------------------------------------------------------
  {
    const overlap = calculateTimeOverlapMinutes('10:00', '10:30', '10:20', '11:00');
    assert(
      'TB19',
      'Sobreposição parcial de horário detecta exatamente 10 minutos de conflito',
      overlap === 10,
      `Sobreposição parcial calculada: ${overlap} min`
    );
  }

  // --------------------------------------------------------------------------
  // TB20 — Matriz de Conflitos: Sobreposição total (10:00–11:00 e 10:15–10:45 = 30 min)
  // --------------------------------------------------------------------------
  {
    const overlap = calculateTimeOverlapMinutes('10:00', '11:00', '10:15', '10:45');
    assert(
      'TB20',
      'Sobreposição total de horário detecta exatamente 30 minutos de conflito',
      overlap === 30,
      `Sobreposição total calculada: ${overlap} min`
    );
  }

  // --------------------------------------------------------------------------
  // TB21 — Matriz de Conflitos: Sessões adjacentes consecutivas (10:00–10:30 e 10:30–11:00 = 0 min)
  // --------------------------------------------------------------------------
  {
    const overlap = calculateTimeOverlapMinutes('10:00', '10:30', '10:30', '11:00');
    assert(
      'TB21',
      'Sessões adjacentes consecutivas (fim de A coincide com início de B) resultam em 0 minutos de conflito',
      overlap === 0,
      `Falso positivo em sessões adjacentes: ${overlap} min`
    );
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total,
    passed,
    failed,
    isAllPassed: failed === 0,
    results,
  };
}

// Execução CLI se invocado diretamente via tsx
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('temporalConsistency.test')) {
  console.log('================================================================');
  console.log('AUDITORIA TEMPORAL E HARDENING DA AGENDA OPERACIONAL (ETAPA 4.1)');
  console.log('================================================================');
  const audit = runTemporalConsistencyAudit();
  console.log(`Total de testes temporais: ${audit.total}`);
  console.log(`Aprovados: ${audit.passed}`);
  console.log(`Falhos: ${audit.failed}`);
  console.log('----------------------------------------------------------------');
  audit.results.forEach((r) => {
    const symbol = r.passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${symbol} — ${r.code}: ${r.name}`);
    if (!r.passed) {
      console.log(`   Detalhes: ${r.details}`);
    }
  });
  console.log('================================================================');
  if (audit.isAllPassed) {
    console.log('TODOS OS TESTES TEMPORAIS T01 A T23 FORAM APROVADOS COM SUCESSO!');
    process.exit(0);
  } else {
    console.error('FALHA NA AUDITORIA TEMPORAL!');
    process.exit(1);
  }
}
