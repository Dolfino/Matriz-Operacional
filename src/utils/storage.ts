import { Objective } from '../types';
import { INITIAL_OBJECTIVES } from '../data/initialData';

const STORAGE_KEY = 'matriz_operacional_data_v3';

export function loadObjectives(): Objective[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
  a.download = `matriz-operacional-cronograma-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
