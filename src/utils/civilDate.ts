/**
 * Utilitários Canônicos de Datas Civis e Cálculos Temporais
 * Regra: Datas operacionais são estritamente datas civis ISO (YYYY-MM-DD).
 * Não utilizam Date.getHours() ou conversores com deslocamento de fuso horário.
 */

import { FollowUpRecurrence } from '../types';

/**
 * Converte data para string civil YYYY-MM-DD sem distorção por timezone.
 */
export function formatCivilIsoDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Faz parse determinístico de string YYYY-MM-DD para componentes numéricos civis.
 */
export function parseCivilIsoDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Valida se uma string é uma data civil válida (incluindo anos bissextos e limites de mês).
 */
export function isValidCivilDate(dateStr: string): boolean {
  const parts = parseCivilIsoDate(dateStr);
  if (!parts) return false;
  const { year, month, day } = parts;
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = getDaysInCivilMonth(year, month);
  return day <= daysInMonth;
}

/**
 * Retorna o número de dias no mês civil (respeitando ano bissexto).
 */
export function getDaysInCivilMonth(year: number, month: number): number {
  if ([1, 3, 5, 7, 8, 10, 12].includes(month)) return 31;
  if ([4, 6, 9, 11].includes(month)) return 30;
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  return 30;
}

/**
 * Adiciona N dias civis a uma data YYYY-MM-DD (suporta virada de ano e mês).
 */
export function addCivilDays(dateStr: string, daysToAdd: number): string {
  const parts = parseCivilIsoDate(dateStr);
  if (!parts) return dateStr;
  
  let { year, month, day } = parts;
  
  // Utiliza Date.UTC puramente para aritmética de dias inteiros civis (meio-dia UTC evita saltos DST)
  const utcDate = new Date(Date.UTC(year, month - 1, day + daysToAdd, 12, 0, 0));
  const resYear = utcDate.getUTCFullYear();
  const resMonth = utcDate.getUTCMonth() + 1;
  const resDay = utcDate.getUTCDate();
  
  return formatCivilIsoDate(resYear, resMonth, resDay);
}

/**
 * Diferença exata em dias civis entre targetDate e refDate.
 * Positivo: target está no futuro em relação à refDate.
 * Zero: mesmo dia civil.
 * Negativo: target está no passado (atrasado).
 */
export function diffCivilDays(targetDateStr: string, refDateStr: string): number {
  const pTarget = parseCivilIsoDate(targetDateStr);
  const pRef = parseCivilIsoDate(refDateStr);
  if (!pTarget || !pRef) return 0;
  
  const utcTarget = Date.UTC(pTarget.year, pTarget.month - 1, pTarget.day);
  const utcRef = Date.UTC(pRef.year, pRef.month - 1, pRef.day);
  return Math.round((utcTarget - utcRef) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula a próxima data de follow-up com base na data da cobrança efetiva e na recorrência.
 * Invariante: Recorrência é calculada a partir da data EFETIVA da cobrança realizada,
 * evitando sequências presas no passado.
 */
export function calculateNextFollowUpDate(
  effectiveExecutionDateStr: string,
  recurrence: FollowUpRecurrence
): string | null {
  if (!recurrence || recurrence === 'none') {
    return null;
  }
  
  const normDate = parseCivilIsoDate(effectiveExecutionDateStr);
  if (!normDate) return null;
  
  switch (recurrence) {
    case 'daily':
      return addCivilDays(effectiveExecutionDateStr, 1);
    case 'every_2_days':
      return addCivilDays(effectiveExecutionDateStr, 2);
    case 'weekly':
      return addCivilDays(effectiveExecutionDateStr, 7);
    default:
      return null;
  }
}
