/**
 * Suíte de Auditoria de Consistência Operacional, Testes de Regressão e Hardening
 * Etapa 3: Validação de Paridade Absoluta entre Todas as Visualizações da Aplicação
 */

import { Objective, Dependency, TaskCategory, FinancialStatus } from '../types';
import {
  getObjectiveStats,
  getDependencyLifecycle,
  calculateBlockedTimeDays,
  calculateObjectiveProgress,
  formatCurrencyBRL,
} from '../utils/helpers';
import {
  buildExecutiveReportData,
  generateExecutiveReportMarkdown,
  generateExecutiveReportHtml,
} from '../utils/executiveReport';

// ============================================================================
// FIXTURES: CENÁRIOS OPERACIONAIS A a J
// ============================================================================

/** Cenário A: Objetivo vazio */
export const fixtureA_EmptyObjective: Objective = {
  id: 'obj-a',
  title: 'Objetivo A — Vazio',
  category: 'Geral',
  startDate: '2026-10-01',
  eventDate: '2026-10-31',
  endDate: '2026-10-31',
  status: 'active',
  milestones: [],
};

/** Cenário B: Objetivo recém-planejado (marcos futuros, pendentes, 0% execução) */
export const fixtureB_NewlyPlannedObjective: Objective = {
  id: 'obj-b',
  title: 'Objetivo B — Recém Planejado',
  category: 'Infraestrutura',
  startDate: '2026-10-15',
  eventDate: '2026-11-15',
  endDate: '2026-11-15',
  status: 'active',
  milestones: [
    {
      id: 'm-b1',
      title: 'Marco B1 — Planejamento Inicial',
      targetDate: '2026-10-25',
      tasks: [
        {
          id: 't-b1',
          title: 'Definir escopo do projeto',
          category: 'Operacional',
          priority: 'high',
          subtasks: [
            { id: 's-b1', title: 'Levantar requisitos', status: 'pending' },
            { id: 's-b2', title: 'Aprovar premissas', status: 'pending' },
          ],
          dependencies: [],
        },
      ],
    },
  ],
};

/** Cenário C: Operação normal em andamento (subtarefas concluídas e pendentes, deps aguardando dentro do SLA) */
export const fixtureC_NormalOperationObjective: Objective = {
  id: 'obj-c',
  title: 'Objetivo C — Operação Normal em Andamento',
  category: 'Operacional',
  startDate: '2026-09-20',
  eventDate: '2026-10-20',
  endDate: '2026-10-20',
  status: 'active',
  milestones: [
    {
      id: 'm-c1',
      title: 'Marco C1 — Estruturação',
      targetDate: '2026-10-18',
      tasks: [
        {
          id: 't-c1',
          title: 'Mobilização de Equipe',
          category: 'Operacional',
          priority: 'medium',
          subtasks: [
            { id: 's-c1', title: 'Alinhar escalas', status: 'completed' },
            { id: 's-c2', title: 'Distribuir credenciais', status: 'in_progress' },
            { id: 's-c3', title: 'Treinamento operacional', status: 'pending' },
          ],
          dependencies: [
            {
              id: 'd-c1',
              title: 'Liberação de Acesso ao Prédio',
              departmentOrOwner: 'Segurança Patrimonial',
              status: 'waiting_approval',
              state: 'AGUARDANDO',
              bloqueandoFluxo: false,
              openedAt: '2026-10-05',
              slaDeadline: '2026-10-12', // Dentro do SLA em 08/10
              followUps: [],
            },
          ],
        },
      ],
    },
  ],
};

/** Cenário D: Dependência bloqueando (AGUARDANDO, bloqueandoFluxo = true, próxima subtarefa impossibilitada) */
export const fixtureD_BlockingDependencyObjective: Objective = {
  id: 'obj-d',
  title: 'Objetivo D — Dependência Bloqueando Fluxo',
  category: 'Logística',
  startDate: '2026-09-15',
  eventDate: '2026-10-15',
  endDate: '2026-10-15',
  status: 'active',
  milestones: [
    {
      id: 'm-d1',
      title: 'Marco D1 — Montagem de Cenografia',
      targetDate: '2026-10-14',
      tasks: [
        {
          id: 't-d1',
          title: 'Instalação Elétrica do Palco',
          category: 'Infraestrutura & Montagem',
          priority: 'high',
          subtasks: [
            { id: 's-d1', title: 'Passar fiação básica', status: 'completed' },
            { id: 's-d2', title: 'Ligar gerador principal', status: 'pending' },
          ],
          dependencies: [
            {
              id: 'd-d1',
              title: 'Autorização do Corpo de Bombeiros / AVCB',
              departmentOrOwner: 'Jurídico & Compliance',
              status: 'blocked',
              state: 'AGUARDANDO',
              bloqueandoFluxo: true,
              openedAt: '2026-09-28',
              slaDeadline: '2026-10-06',
              impactNextAction: 'Impossibilita energização e testes de som',
              followUps: [],
            },
          ],
        },
      ],
    },
  ],
};

/** Cenário E: Dependência em risco sem bloqueio (SLA estourado, bloqueandoFluxo = false) */
export const fixtureE_RiskNoBlockObjective: Objective = {
  id: 'obj-e',
  title: 'Objetivo E — Dependência em Risco sem Bloqueio',
  category: 'Comunicação',
  startDate: '2026-09-10',
  eventDate: '2026-10-25',
  endDate: '2026-10-25',
  status: 'active',
  milestones: [
    {
      id: 'm-e1',
      title: 'Marco E1 — Divulgação',
      targetDate: '2026-10-20',
      tasks: [
        {
          id: 't-e1',
          title: 'Campanha de Marketing',
          category: 'Operacional',
          priority: 'medium',
          subtasks: [
            { id: 's-e1', title: 'Criar artes', status: 'completed' },
            { id: 's-e2', title: 'Publicar redes sociais', status: 'in_progress' },
          ],
          dependencies: [
            {
              id: 'd-e1',
              title: 'Aprovação de Texto Legal pelo Jurídico',
              departmentOrOwner: 'Jurídico',
              status: 'waiting_approval',
              state: 'EM_RISCO',
              bloqueandoFluxo: false,
              openedAt: '2026-09-25',
              slaDeadline: '2026-10-05', // Vencido em 08/10
              followUps: [],
            },
          ],
        },
      ],
    },
  ],
};

/** Cenário F: Dependência resolvida (histórico preservado, data atendimento, espera calculada, bloqueio false) */
export const fixtureF_ResolvedDependencyObjective: Objective = {
  id: 'obj-f',
  title: 'Objetivo F — Dependência Resolvida',
  category: 'Engenharia',
  startDate: '2026-09-01',
  eventDate: '2026-10-20',
  endDate: '2026-10-20',
  status: 'active',
  milestones: [
    {
      id: 'm-f1',
      title: 'Marco F1 — Obras Civis',
      targetDate: '2026-10-15',
      tasks: [
        {
          id: 't-f1',
          title: 'Pavimentação de Acesso',
          category: 'Infraestrutura & Montagem',
          priority: 'high',
          subtasks: [
            { id: 's-f1', title: 'Nivelamento de solo', status: 'completed' },
            { id: 's-f2', title: 'Aplicação de asfalto', status: 'in_progress' },
          ],
          dependencies: [
            {
              id: 'd-f1',
              title: 'Licença Municipal de Pavimentação',
              departmentOrOwner: 'Prefeitura / Obras',
              status: 'cleared',
              state: 'ATENDIDA',
              bloqueandoFluxo: false,
              openedAt: '2026-09-05',
              slaDeadline: '2026-09-20',
              resolvedAt: '2026-09-18',
              followUps: [
                { id: 'flw-f1', date: '2026-09-10 14:00', note: 'Cobrança presencial na secretaria', author: 'Fiscal' },
              ],
              history: [
                {
                  id: 'h-f1',
                  timestamp: '2026-09-05 09:00',
                  previousState: 'AGUARDANDO',
                  newState: 'AGUARDANDO',
                  wasBlocking: true,
                  isBlocking: true,
                  note: 'Abertura com bloqueio',
                },
                {
                  id: 'h-f2',
                  timestamp: '2026-09-18 16:30',
                  previousState: 'AGUARDANDO',
                  newState: 'ATENDIDA',
                  wasBlocking: true,
                  isBlocking: false,
                  note: 'Licença emitida com sucesso',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** Cenário G: Marco atrasado (prazo vencido, execução incompleta) */
export const fixtureG_DelayedMilestoneObjective: Objective = {
  id: 'obj-g',
  title: 'Objetivo G — Marco Atrasado',
  category: 'Produção',
  startDate: '2026-09-01',
  eventDate: '2026-10-10',
  endDate: '2026-10-10',
  status: 'active',
  milestones: [
    {
      id: 'm-g1',
      title: 'Marco G1 — Entrega de Uniformes',
      targetDate: '2026-10-04', // Vencido em relação a 08/10
      tasks: [
        {
          id: 't-g1',
          title: 'Bordado dos Uniformes',
          category: 'Operacional',
          priority: 'medium',
          subtasks: [
            { id: 's-g1', title: 'Corte do tecido', status: 'completed' },
            { id: 's-g2', title: 'Costura e bordado', status: 'in_progress' },
          ],
          dependencies: [],
        },
      ],
    },
  ],
};

/** Cenário H: Marco concluído atrasado (data real posterior ao prazo) */
export const fixtureH_CompletedLateMilestoneObjective: Objective = {
  id: 'obj-h',
  title: 'Objetivo H — Marco Concluído Atrasado',
  category: 'Suprimentos',
  startDate: '2026-08-01',
  eventDate: '2026-09-30',
  endDate: '2026-09-30',
  status: 'active',
  milestones: [
    {
      id: 'm-h1',
      title: 'Marco H1 — Aquisição de Equipamentos',
      targetDate: '2026-09-15',
      completedAt: '2026-09-22', // Concluído 7 dias após o prazo planejado
      tasks: [
        {
          id: 't-h1',
          title: 'Compra de Geradores',
          category: 'Fornecedor & OC',
          priority: 'high',
          subtasks: [
            { id: 's-h1', title: 'Orçamento com 3 fornecedores', status: 'completed' },
            { id: 's-h2', title: 'Recebimento dos geradores', status: 'completed' },
          ],
          dependencies: [],
        },
      ],
    },
  ],
};

/** Cenário I: Financeiro misto (cobre todos os 7 estados financeiros reais de OCs) */
export const fixtureI_MixedFinancialObjective: Objective = {
  id: 'obj-i',
  title: 'Objetivo I — Financeiro Misto com Todos os Estados',
  category: 'Financeiro & OCs',
  startDate: '2026-09-01',
  eventDate: '2026-10-31',
  endDate: '2026-10-31',
  status: 'active',
  milestones: [
    {
      id: 'm-i1',
      title: 'Marco I1 — Contratações do Evento',
      targetDate: '2026-10-20',
      tasks: [
        {
          id: 't-i1',
          title: 'Contratos e Fornecedores',
          category: 'Fornecedor & OC',
          priority: 'high',
          subtasks: [
            { id: 's-i1', title: 'Segurança Privada', status: 'pending', ocNumber: 'OC-001', orderCost: 5000, financialStatus: 'PREVISTO' },
            { id: 's-i2', title: 'Buffet VIP', status: 'pending', ocNumber: 'OC-002', orderCost: 12000, financialStatus: 'EM_APROVACAO' },
            { id: 's-i3', title: 'Sonorização', status: 'pending', ocNumber: 'OC-003', orderCost: 8500, financialStatus: 'APROVADO' },
            { id: 's-i4', title: 'Iluminação Cênica', status: 'in_progress', ocNumber: 'OC-004', orderCost: 6000, financialStatus: 'CONTRATADO' },
            { id: 's-i5', title: 'Painéis de LED', status: 'in_progress', ocNumber: 'OC-005', orderCost: 9500, financialStatus: 'FATURADO' },
            { id: 's-i6', title: 'Limpeza e Sanitários', status: 'in_progress', ocNumber: 'OC-006', orderCost: 4000, financialStatus: 'ENCAMINHADO_PAGAMENTO' },
            { id: 's-i7', title: 'Geradores Diesel', status: 'completed', ocNumber: 'OC-007', orderCost: 7500, financialStatus: 'PAGO' },
          ],
          dependencies: [],
        },
      ],
    },
  ],
};

/** Cenário J: Objetivo 100% concluído (nenhum bloqueio ativo, histórico preservado, relatório coerente) */
export const fixtureJ_FullyCompletedObjective: Objective = {
  id: 'obj-j',
  title: 'Objetivo J — 100% Concluído',
  category: 'Eventos',
  startDate: '2026-09-01',
  eventDate: '2026-10-03',
  endDate: '2026-10-03',
  status: 'completed',
  milestones: [
    {
      id: 'm-j1',
      title: 'Marco J1 — Execução Total',
      targetDate: '2026-10-03',
      completedAt: '2026-10-02',
      tasks: [
        {
          id: 't-j1',
          title: 'Entrega Completa da Infra',
          category: 'Operacional',
          priority: 'high',
          subtasks: [
            { id: 's-j1', title: 'Montagem de estande', status: 'completed' },
            { id: 's-j2', title: 'Desmontagem e encerramento', status: 'completed' },
          ],
          dependencies: [
            {
              id: 'd-j1',
              title: 'Aprovação de Licença Sanitária',
              departmentOrOwner: 'Vigilância Sanitária',
              status: 'cleared',
              state: 'ATENDIDA',
              bloqueandoFluxo: false,
              openedAt: '2026-09-10',
              slaDeadline: '2026-09-25',
              resolvedAt: '2026-09-22',
              followUps: [],
              history: [
                {
                  id: 'h-j1',
                  timestamp: '2026-09-10 10:00',
                  previousState: 'AGUARDANDO',
                  newState: 'AGUARDANDO',
                  wasBlocking: true,
                  isBlocking: true,
                  note: 'Abertura de protocolo',
                },
                {
                  id: 'h-j2',
                  timestamp: '2026-09-22 15:00',
                  previousState: 'AGUARDANDO',
                  newState: 'ATENDIDA',
                  wasBlocking: true,
                  isBlocking: false,
                  note: 'Alvará concedido',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// SUÍTE DE TESTES E VERIFICAÇÃO DE PARIDADE
// ============================================================================

export interface ParityAuditResult {
  scenarioName: string;
  divergences: string[];
  passed: boolean;
}

export function runOperationalParityAudit(): {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  divergencesCount: {
    progresso: number;
    bloqueios: number;
    dependencias: number;
    financeiro: number;
    compatibilidadeLegada: number;
  };
  scenarioResults: ParityAuditResult[];
  stateTransitionAudit: { passed: boolean; logs: string[] };
} {
  const scenarios = [
    { name: 'A — Objetivo vazio', obj: fixtureA_EmptyObjective },
    { name: 'B — Objetivo recém-planejado', obj: fixtureB_NewlyPlannedObjective },
    { name: 'C — Operação normal em andamento', obj: fixtureC_NormalOperationObjective },
    { name: 'D — Dependência bloqueando', obj: fixtureD_BlockingDependencyObjective },
    { name: 'E — Dependência em risco sem bloqueio', obj: fixtureE_RiskNoBlockObjective },
    { name: 'F — Dependência resolvida', obj: fixtureF_ResolvedDependencyObjective },
    { name: 'G — Marco atrasado', obj: fixtureG_DelayedMilestoneObjective },
    { name: 'H — Marco concluído atrasado', obj: fixtureH_CompletedLateMilestoneObjective },
    { name: 'I — Financeiro misto', obj: fixtureI_MixedFinancialObjective },
    { name: 'J — Objetivo 100% concluído', obj: fixtureJ_FullyCompletedObjective },
  ];

  const divergencesCount = {
    progresso: 0,
    bloqueios: 0,
    dependencias: 0,
    financeiro: 0,
    compatibilidadeLegada: 0,
  };

  const scenarioResults: ParityAuditResult[] = [];

  scenarios.forEach(({ name, obj }) => {
    const divergences: string[] = [];

    // 1. Fonte da verdade canônica
    const stats = getObjectiveStats(obj);
    const reportData = buildExecutiveReportData(obj);
    const md = generateExecutiveReportMarkdown(reportData);
    const html = generateExecutiveReportHtml(reportData);

    // 2. Paridade de Progresso
    const canonicalProgress = calculateObjectiveProgress(obj);
    if (stats.progressPercent !== canonicalProgress) {
      divergences.push(`Divergência de Progresso: getObjectiveStats (${stats.progressPercent}%) != calculateObjectiveProgress (${canonicalProgress}%)`);
      divergencesCount.progresso++;
    }
    if (reportData.stats.progressPercent !== canonicalProgress) {
      divergences.push(`Divergência de Progresso: reportData.stats (${reportData.stats.progressPercent}%) != canonical (${canonicalProgress}%)`);
      divergencesCount.progresso++;
    }
    if (!md.includes(`**Progresso:** ${canonicalProgress}%`)) {
      divergences.push(`Divergência de Progresso: Markdown não contém '**Progresso:** ${canonicalProgress}%'`);
      divergencesCount.progresso++;
    }
    if (!html.includes(`Progresso: <strong>${canonicalProgress}%</strong>`)) {
      divergences.push(`Divergência de Progresso: HTML não contém 'Progresso: <strong>${canonicalProgress}%</strong>'`);
      divergencesCount.progresso++;
    }

    // 3. Paridade de Bloqueios e Dependências
    // Coleta do Radar
    let radarBlocking = 0;
    let radarRisk = 0;
    let radarWaiting = 0;
    let radarResolved = 0;
    obj.milestones.forEach((m) => {
      m.tasks.forEach((t) => {
        t.dependencies.forEach((d) => {
          const { state, isBlocking } = getDependencyLifecycle(d);
          if (state === 'ATENDIDA') radarResolved++;
          else if (isBlocking) radarBlocking++;
          else if (state === 'EM_RISCO') radarRisk++;
          else radarWaiting++;
        });
      });
    });

    if (radarBlocking !== stats.bloqueandoDependencies) {
      divergences.push(`Divergência de Bloqueios: Radar (${radarBlocking}) != stats.bloqueando (${stats.bloqueandoDependencies})`);
      divergencesCount.bloqueios++;
    }
    if (reportData.situacaoAtual.bloqueandoAgora.length !== stats.bloqueandoDependencies) {
      divergences.push(`Divergência de Bloqueios: reportData.bloqueandoAgora (${reportData.situacaoAtual.bloqueandoAgora.length}) != stats.bloqueando (${stats.bloqueandoDependencies})`);
      divergencesCount.bloqueios++;
    }
    if (radarRisk !== stats.emRiscoDependencies) {
      divergences.push(`Divergência de Dependências: Radar risco (${radarRisk}) != stats.emRisco (${stats.emRiscoDependencies})`);
      divergencesCount.dependencias++;
    }
    if (radarWaiting !== stats.aguardandoDependencies) {
      divergences.push(`Divergência de Dependências: Radar aguardando (${radarWaiting}) != stats.aguardando (${stats.aguardandoDependencies})`);
      divergencesCount.dependencias++;
    }
    if (radarResolved !== stats.atendidasDependencies) {
      divergences.push(`Divergência de Dependências: Radar atendidas (${radarResolved}) != stats.atendidas (${stats.atendidasDependencies})`);
      divergencesCount.dependencias++;
    }

    // Auditoria de Duplicidade: Dependências ATENDIDA NÃO podem constar na Seção 4 (estado atual)
    const attendedInActiveSec4 = reportData.situacaoAtual.bloqueandoAgora.concat(
      reportData.situacaoAtual.emRisco,
      reportData.situacaoAtual.aguardandoTerceiros
    ).filter((item) => item.lifecycle.state === 'ATENDIDA');

    if (attendedInActiveSec4.length > 0) {
      divergences.push(`Duplicidade encontrada: ${attendedInActiveSec4.length} dependência(s) ATENDIDA na Seção 4 de estado atual!`);
      divergencesCount.dependencias++;
    }

    // 4. Paridade Financeira
    const finStats = stats.financial;
    const finReport = reportData.financial;
    if (finStats.totalPrevisto !== finReport.totalPrevisto) {
      divergences.push(`Divergência Financeira: Total Previsto (${finStats.totalPrevisto}) != Report (${finReport.totalPrevisto})`);
      divergencesCount.financeiro++;
    }
    if (finStats.pago !== finReport.pago) {
      divergences.push(`Divergência Financeira: Pago (${finStats.pago}) != Report (${finReport.pago})`);
      divergencesCount.financeiro++;
    }
    if (finStats.emAprovacao !== finReport.emAprovacao) {
      divergences.push(`Divergência Financeira: Em Aprovação (${finStats.emAprovacao}) != Report (${finReport.emAprovacao})`);
      divergencesCount.financeiro++;
    }
    if (!md.includes(`Valor previsto: ${formatCurrencyBRL(finStats.totalPrevisto)}`)) {
      divergences.push(`Divergência Financeira: Markdown não confere com valor previsto ${finStats.totalPrevisto}`);
      divergencesCount.financeiro++;
    }

    // 5. Verificação de compatibilidade legada
    if (stats.waitingDependencies !== stats.aguardandoDependencies) {
      divergences.push('Divergência de compatibilidade legada: waitingDependencies != aguardandoDependencies');
      divergencesCount.compatibilidadeLegada++;
    }
    if (stats.blockedDependencies !== stats.bloqueandoDependencies) {
      divergences.push('Divergência de compatibilidade legada: blockedDependencies != bloqueandoDependencies');
      divergencesCount.compatibilidadeLegada++;
    }
    if (stats.clearedDependencies !== stats.atendidasDependencies) {
      divergences.push('Divergência de compatibilidade legada: clearedDependencies != atendidasDependencies');
      divergencesCount.compatibilidadeLegada++;
    }

    scenarioResults.push({
      scenarioName: name,
      divergences,
      passed: divergences.length === 0,
    });
  });

  // ============================================================================
  // AUDITORIA DE TRANSIÇÕES DE ESTADO
  // ============================================================================
  const stateLogs: string[] = [];
  let stateTransitionPassed = true;

  let testDep: Dependency = {
    id: 'dep-trans-1',
    title: 'Dependência de Teste de Transições',
    departmentOrOwner: 'Engenharia de Redes',
    status: 'waiting_approval',
    state: 'AGUARDANDO',
    bloqueandoFluxo: false,
    openedAt: '2026-10-01',
    history: [],
    followUps: [],
  };

  // Passo 1: Transição para bloqueandoFluxo = true
  testDep = {
    ...testDep,
    bloqueandoFluxo: true,
    history: [
      ...(testDep.history || []),
      {
        id: 'h-1',
        timestamp: '2026-10-02 10:00',
        previousState: 'AGUARDANDO',
        newState: 'AGUARDANDO',
        wasBlocking: false,
        isBlocking: true,
        note: 'Bloqueio operacional ativado',
      },
    ],
  };
  stateLogs.push('Passo 1: Bloqueio ativado. isBlocking = true');
  if (getDependencyLifecycle(testDep).isBlocking !== true) {
    stateLogs.push('FALHA: Ciclo não acusou bloqueio no Passo 1');
    stateTransitionPassed = false;
  }

  // Passo 2: Follow-up registrado
  testDep = {
    ...testDep,
    followUps: [
      ...(testDep.followUps || []),
      { id: 'flw-1', date: '2026-10-03 14:00', note: 'Cobrança do link de fibra', author: 'Gerente' },
    ],
  };
  stateLogs.push('Passo 2: Follow-up 1 registrado. Total followUps = ' + testDep.followUps?.length);

  // Passo 3: Transição para EM_RISCO
  testDep = {
    ...testDep,
    state: 'EM_RISCO',
    history: [
      ...(testDep.history || []),
      {
        id: 'h-2',
        timestamp: '2026-10-04 11:00',
        previousState: 'AGUARDANDO',
        newState: 'EM_RISCO',
        wasBlocking: true,
        isBlocking: true,
        note: 'Prazo crítico atingido',
      },
    ],
  };
  stateLogs.push('Passo 3: Transição para EM_RISCO. State = ' + testDep.state);
  if (testDep.history?.length !== 2) {
    stateLogs.push('FALHA: Histórico foi sobrescrito em vez de acumulado');
    stateTransitionPassed = false;
  }

  // Passo 4: Segundo follow-up registrado
  testDep = {
    ...testDep,
    followUps: [
      ...(testDep.followUps || []),
      { id: 'flw-2', date: '2026-10-05 16:00', note: 'Escalonamento com diretoria', author: 'Gerente' },
    ],
  };
  stateLogs.push('Passo 4: Follow-up 2 registrado. Total followUps = ' + testDep.followUps?.length);

  // Passo 5: Transição para ATENDIDA
  const isNowAttended = true;
  testDep = {
    ...testDep,
    state: 'ATENDIDA',
    status: 'cleared',
    bloqueandoFluxo: isNowAttended ? false : testDep.bloqueandoFluxo,
    resolvedAt: '2026-10-06',
    history: [
      ...(testDep.history || []),
      {
        id: 'h-3',
        timestamp: '2026-10-06 18:00',
        previousState: 'EM_RISCO',
        newState: 'ATENDIDA',
        wasBlocking: true,
        isBlocking: false,
        note: 'Fibra instalada e testada. Bloqueio encerrado.',
      },
    ],
  };
  stateLogs.push('Passo 5: Transição para ATENDIDA');

  const finalLifecycle = getDependencyLifecycle(testDep);
  if (finalLifecycle.state !== 'ATENDIDA') {
    stateLogs.push('FALHA: Estado final não é ATENDIDA');
    stateTransitionPassed = false;
  }
  if (finalLifecycle.isBlocking !== false) {
    stateLogs.push('FALHA: ATENDIDA não forçou isBlocking = false');
    stateTransitionPassed = false;
  }
  if (testDep.history?.length !== 3) {
    stateLogs.push('FALHA: Histórico final incompleto');
    stateTransitionPassed = false;
  }
  if (testDep.followUps?.length !== 2) {
    stateLogs.push('FALHA: Contador de follow-ups corrompido');
    stateTransitionPassed = false;
  }

  const reconstructedBlockedDays = calculateBlockedTimeDays(testDep);
  stateLogs.push(`Reconstrução do tempo bloqueado: ${reconstructedBlockedDays} dia(s)`);
  if (reconstructedBlockedDays < 0) {
    stateLogs.push('FALHA: Tempo bloqueado reconstruído negativo');
    stateTransitionPassed = false;
  }

  const passedScenarios = scenarioResults.filter((s) => s.passed).length;
  const failedScenarios = scenarioResults.length - passedScenarios;

  return {
    totalScenarios: scenarios.length,
    passedScenarios,
    failedScenarios,
    divergencesCount,
    scenarioResults,
    stateTransitionAudit: { passed: stateTransitionPassed, logs: stateLogs },
  };
}

// Execução direta via Node/tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('operationalConsistency.test')) {
  console.log('================================================================');
  console.log('AUDITORIA DE CONSISTÊNCIA OPERACIONAL E TESTES DE REGRESSÃO');
  console.log('================================================================\n');

  const audit = runOperationalParityAudit();

  console.log(`Cenários avaliados: ${audit.totalScenarios}`);
  console.log(`Cenários aprovados: ${audit.passedScenarios}`);
  console.log(`Cenários falhos: ${audit.failedScenarios}\n`);

  audit.scenarioResults.forEach((res) => {
    const status = res.passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${status} — ${res.scenarioName}`);
    if (res.divergences.length > 0) {
      res.divergences.forEach((d) => console.log(`   └─ ${d}`));
    }
  });

  console.log('\n----------------------------------------------------------------');
  console.log('AUDITORIA DE TRANSIÇÕES DE ESTADO:');
  console.log(audit.stateTransitionAudit.passed ? '✅ Transições 100% íntegras' : '❌ Falha nas transições');
  audit.stateTransitionAudit.logs.forEach((log) => console.log(`   • ${log}`));

  console.log('\n----------------------------------------------------------------');
  console.log('CHECKLIST DE CONSISTÊNCIA:');
  console.log(`• Divergência de progresso: ${audit.divergencesCount.progresso}`);
  console.log(`• Divergência de bloqueios: ${audit.divergencesCount.bloqueios}`);
  console.log(`• Divergência de dependências: ${audit.divergencesCount.dependencias}`);
  console.log(`• Divergência financeira: ${audit.divergencesCount.financeiro}`);
  console.log(`• Quebra de compatibilidade legada: ${audit.divergencesCount.compatibilidadeLegada}`);
  console.log('================================================================\n');

  if (audit.failedScenarios > 0 || !audit.stateTransitionAudit.passed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
