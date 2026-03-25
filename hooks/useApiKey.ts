import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const SATVIK_API_KEY_STORAGE = 'satvik_api_key';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SATVIK_API_KEY_STORAGE);
        if (!mounted) return;
        setApiKey(stored?.trim() ? stored.trim() : null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveApiKey = useCallback(async (value: string) => {
    const v = value.trim();
    await AsyncStorage.setItem(SATVIK_API_KEY_STORAGE, v);
    setApiKey(v);
  }, []);

  const clearApiKey = useCallback(async () => {
    await AsyncStorage.removeItem(SATVIK_API_KEY_STORAGE);
    setApiKey(null);
  }, []);

  return useMemo(
    () => ({ apiKey, loading, hasApiKey: !!apiKey, saveApiKey, clearApiKey }),
    [apiKey, loading, saveApiKey, clearApiKey]
  );
}

