import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResultCard } from '../components/ResultCard';
import { loadHistory, clearHistory } from '../services/storage';
import type { ClaudeDietResult, ScanHistoryItem } from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  safeBg: '#D8F3DC',
  safeText: '#2D6A4F',
  red: '#C1121F',
  redBg: '#FFE5E5',
  amber: '#E07A00',
  amberBg: '#FFF4E0',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: days > 365 ? 'numeric' : undefined,
  });
}

function verdictBadgeStyle(verdict: ClaudeDietResult['verdict']) {
  switch (verdict) {
    case 'SAFE':
      return { bg: C.safeBg, text: C.safeText, label: 'SAFE' };
    case 'NOT_SAFE':
      return { bg: C.redBg, text: C.red, label: 'NOT PERMITTED' };
    case 'CAUTION':
      return { bg: C.amberBg, text: C.amber, label: 'CAUTION' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadHistory();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleClearAll = useCallback(async () => {
    await clearHistory();
    setItems([]);
    setExpanded(null);
  }, []);

  // ── Render item ──────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ScanHistoryItem }) => {
      const badge = verdictBadgeStyle(item.result.verdict);
      const isExpanded = expanded === item.id;

      return (
        <View style={styles.itemWrapper}>
          <Pressable
            style={styles.row}
            onPress={() => setExpanded(isExpanded ? null : item.id)}>
            {/* Verdict badge */}
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>

            {/* Text */}
            <View style={styles.rowText}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.result.productName}
              </Text>
              <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>
            </View>

            {/* Chevron */}
            <Text style={styles.chevron}>{isExpanded ? '▾' : '›'}</Text>
          </Pressable>

          {/* Expanded result card */}
          {isExpanded && (
            <View style={styles.expandedCard}>
              <ResultCard result={item.result} />
            </View>
          )}
        </View>
      );
    },
    [expanded]
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {items.length > 0 && (
          <Pressable onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>Clear all</Text>
          </Pressable>
        )}
      </View>

      {loading ? null : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌿</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan a label, barcode, or enter ingredients manually to see results here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
  },
  clearBtn: {
    fontSize: 14,
    fontWeight: '400',
    color: C.red,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 10,
  },
  itemWrapper: {
    gap: 0,
  },
  row: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  meta: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
  },
  chevron: {
    fontSize: 18,
    color: C.textMuted,
  },
  expandedCard: {
    marginTop: 8,
    marginBottom: 4,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
