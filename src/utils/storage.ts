import { Objective } from '../types';
import { INITIAL_OBJECTIVES } from '../data/initialData';
import { getDependencyLifecycle } from './helpers';

const STORAGE_KEY = 'matriz_operacional_data_v4';

export function loadObjectives(): Objective[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalizar para garantir novos campos de ciclo de vida e financeiro
        return parsed.map((obj: Objective) => ({
          ...obj,
          milestones: obj.milestones.map((m) => ({
            ...m,
            tasks: m.tasks.map((t) => ({
              ...t,
              dependencies: t.dependencies.map((d) => {
                const lc = getDependencyLifecycle(d);
                return {
                  ...d,
                  state: d.state || lc.state,
                  bloqueandoFluxo: typeof d.bloqueandoFluxo === 'boolean' ? d.bloqueandoFluxo : lc.isBlocking,
                  openedAt: d.openedAt || d.startDate || d.requestDate || '2026-09-20',
                  slaDeadline: d.slaDeadline || d.endDate || '2026-09-25',
                  followUps: d.followUps || [],
                  history: d.history || [],
                };
              }),
            })),
          })),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load objectives from localStorage:', e);
  }
  return INITIAL_OBJECTIVES;
}

export function saveObjectives(objectives: Objective[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(objectives));
  } catch (e) {
    console.error('Failed to save objectives to localStorage:', e);
  }
}

export function resetToDefault(): Objective[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('matriz_operacional_data_v3');
    localStorage.removeItem('matriz_operacional_data_v2');
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
  return INITIAL_OBJECTIVES;
}

export function exportDataAsJson(objectives: Objective[]): void {
  const jsonStr = JSON.stringify(objectives, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `matriz-operacional-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
