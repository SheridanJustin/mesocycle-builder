'use client';

import type { Equipment, Exercise, Muscle } from '@mesocycle/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api-client';

export type CatalogFilters = { search: string; muscle: Muscle | ''; equipment: Equipment | '' };

type SearchState = { items: Exercise[]; nextCursor: string | null; loading: boolean; error: string | null };

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 30;

// Loads the exercise catalog for the picker. Typing is debounced and stale responses are ignored.
export function useExerciseSearch(active: boolean, filters: CatalogFilters) {
  const [state, setState] = useState<SearchState>({ items: [], nextCursor: null, loading: false, error: null });
  const requestId = useRef(0);

  const fetchPage = useCallback(async (f: CatalogFilters, cursor: string | null) => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const page = await api.listExercises({
        search: f.search.trim() || undefined,
        primary_muscle: f.muscle || undefined,
        equipment: f.equipment || undefined,
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      setState((s) => ({
        items: cursor ? [...s.items, ...page.items] : page.items,
        nextCursor: page.next_cursor,
        loading: false,
        error: null,
      }));
    } catch (error) {
      if (id !== requestId.current) return;
      setState((s) => ({ ...s, loading: false, error: error instanceof Error ? error.message : 'Could not load exercises' }));
    }
  }, []);

  const { search, muscle, equipment } = filters;
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => void fetchPage({ search, muscle, equipment }, null), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [active, search, muscle, equipment, fetchPage]);

  const loadMore = useCallback(() => {
    if (state.nextCursor && !state.loading) void fetchPage({ search, muscle, equipment }, state.nextCursor);
  }, [state.nextCursor, state.loading, fetchPage, search, muscle, equipment]);

  return { ...state, loadMore };
}
