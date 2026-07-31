import type { PactPayState } from '../domain/model';

const STORAGE_KEY = 'pactpay-state-v2';

const emptyState: PactPayState = {
  outcomes: [],
};

export function loadState(): PactPayState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return emptyState;

    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as PactPayState).outcomes)) {
      return emptyState;
    }

    return parsed as PactPayState;
  } catch {
    return emptyState;
  }
}

export function saveState(state: PactPayState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
