'use client';

import type { Equipment, Exercise, Muscle } from '@mesocycle/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api-client';

export type CatalogFilters = { search: string; muscles: Muscle[]; equipment: Equipment | '' };

type SearchState = { items: Exercise[]; nextCursor: string | null; loading: boolean; error: string | null };

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 40;
// Each muscle has well under this many exercises, so several selected muscles fit on one page each.
const PER_MUSCLE_LIMIT = 100;

export function mergeByName(pages: Exercise[][]): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const item of pages.flat()) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Loads the exercise catalog for the picker. Typing is debounced and stale responses are ignored.
// The API filters one muscle at a time, so several selected muscles are fetched in parallel and merged.
export function useExerciseSearch(active: boolean, filters: CatalogFilters) {
  const [state, setState] = useState<SearchState>({ items: [], nextCursor: null, loading: false, error: null });
  const requestId = useRef(0);

  const fetchPage = useCallback(async (f: CatalogFilters, cursor: string | null) => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const base = { search: f.search.trim() || undefined, equipment: f.equipment || undefined };
    try {
      let items: Exercise[];
      let nextCursor: string | null = null;
      if (f.muscles.length > 1) {
        const pages = await Promise.all(
          f.muscles.map((muscle) => api.listExercises({ ...base, primary_muscle: muscle, limit: PER_MUSCLE_LIMIT })),
        );
        items = mergeByName(pages.map((page) => page.items));
      } else {
        const page = await api.listExercises({ ...base, primary_muscle: f.muscles[0], cursor: cursor ?? undefined, limit: PAGE_SIZE });
        items = page.items;
        nextCursor = page.next_cursor;
      }
      if (id !== requestId.current) return;
      setState((s) => ({ items: cursor ? [...s.items, ...items] : items, nextCursor, loading: false, error: null }));
    } catch (error) {
      if (id !== requestId.current) return;
      setState((s) => ({ ...s, loading: false, error: error instanceof Error ? error.message : 'Could not load exercises' }));
    }
  }, []);

  const { search, equipment } = filters;
  const musclesKey = filters.muscles.join(',');
  useEffect(() => {
    if (!active) return;
    const muscles = musclesKey ? (musclesKey.split(',') as Muscle[]) : [];
    const timer = setTimeout(() => void fetchPage({ search, muscles, equipment }, null), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [active, search, musclesKey, equipment, fetchPage]);

  const loadMore = useCallback(() => {
    if (state.nextCursor && !state.loading) void fetchPage(filters, state.nextCursor);
  }, [state.nextCursor, state.loading, fetchPage, filters]);

  return { ...state, loadMore };
}
