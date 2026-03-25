import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ClaudeDietResult } from '@/services/claudeApi';

export type ScanMode = 'photo' | 'barcode' | 'manual';

export type ScanHistoryItem = {
  id: string;
  createdAt: number;
  mode: ScanMode;
  inputPreview: string;
  result: ClaudeDietResult;
};

const STORAGE_KEY = 'satvik_scan_history';
const MAX_ITEMS = 50;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useScanHistory() {
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = safeParse<ScanHistoryItem[]>(stored);
      setItems(Array.isArray(parsed) ? parsed : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persist = useCallback(async (next: ScanHistoryItem[]) => {
    setItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    async (args: { mode: ScanMode; inputPreview: string; result: ClaudeDietResult }) => {
      const item: ScanHistoryItem = {
        id: makeId(),
        createdAt: Date.now(),
        mode: args.mode,
        inputPreview: args.inputPreview,
        result: args.result,
      };
      const next = [item, ...items].slice(0, MAX_ITEMS);
      await persist(next);
      return item;
    },
    [items, persist]
  );

  const clear = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  const getById = useCallback(
    (id: string) => items.find((it) => it.id === id) ?? null,
    [items]
  );

  return useMemo(() => ({ items, loading, reload, add, clear, getById }), [
    items,
    loading,
    reload,
    add,
    clear,
    getById,
  ]);
}

