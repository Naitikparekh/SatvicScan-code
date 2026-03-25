import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanHistoryItem } from '../types';

// ─── API Key (SecureStore) ────────────────────────────────────────────────────

const API_KEY_STORE_KEY = 'satvicscan_apikey';

export async function getApiKey(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(API_KEY_STORE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORE_KEY, key.trim());
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
}

// ─── Scan History (AsyncStorage) ─────────────────────────────────────────────

const HISTORY_STORAGE_KEY = 'satvicscan_history';
const MAX_HISTORY_ITEMS = 50;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadHistory(): Promise<ScanHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
  const parsed = safeParse<ScanHistoryItem[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveHistory(items: ScanHistoryItem[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
}

export async function addHistoryItem(
  item: Omit<ScanHistoryItem, 'id' | 'createdAt'>
): Promise<ScanHistoryItem> {
  const existing = await loadHistory();
  const newItem: ScanHistoryItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
  };
  const updated = [newItem, ...existing].slice(0, MAX_HISTORY_ITEMS);
  await saveHistory(updated);
  return newItem;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
}
