import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ResultCard } from '../components/ResultCard';
import { loadHistory, clearHistory } from '../services/storage';
import type { ClaudeDietResult, ScanHistoryItem } from '../types';

const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  accentGreenLight: '#EAF4EE',
  safeBg: '#D8F3DC',
  safeText: '#2D6A4F',
  red: '#C1121F',
  redBg: '#FFE5E5',
  amber: '#E07A00',
  amberBg: '#FFF4E0',
} as const;

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
      return { bg: C.safeBg, text: C.safeText, label: 'SAFE', icon: 'checkmark-circle' as const };
    case 'NOT_SAFE':
      return { bg: C.redBg, text: C.red, label: 'NOT PERMITTED', icon: 'close-circle' as const };
    case 'CAUTION':
      return { bg: C.amberBg, text: C.amber, label: 'CAUTION', icon: 'warning' as const };
  }
}

function modeIcon(mode: string): keyof typeof Ionicons.glyphMap {
  if (mode === 'photo') return 'camera-outline';
  if (mode === 'barcode') return 'barcode-outline';
  return 'create-outline';
}

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

  useEffect(() => { void reload(); }, [reload]);

  const handleClearAll = useCallback(async () => {
    await clearHistory();
    setItems([]);
    setExpanded(null);
  }, []);

  const renderItem = useCallback(({ item }: { item: ScanHistoryItem }) => {
    const badge = verdictBadgeStyle(item.result.verdict);
    const isExpanded = expanded === item.id;

    return (
      <View style={styles.itemWrapper}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
          onPress={() => setExpanded(isExpanded ? null : item.id)}>

          {/* Left: mode icon */}
          <View style={styles.modeIcon}>
            <Ionicons name={modeIcon(item.mode)} size={16} color={C.textMuted} />
          </View>

          {/* Center: name + time */}
          <View style={styles.rowText}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.result.productName || 'Unknown product'}
            </Text>
            <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>
          </View>

          {/* Right: verdict badge + chevron */}
          <View style={styles.rowRight}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Ionicons name={badge.icon} size={11} color={badge.text} />
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={C.textMuted}
            />
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.expandedCard}>
            <ResultCard result={item.result} />
          </View>
        )}
      </View>
    );
  }, [expanded]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
      <LinearGradient
        colors={['#1B4332', '#2D6A4F']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>History</Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{items.length} scans</Text>
            </View>
          )}
        </View>
        {items.length > 0 && (
          <Pressable onPress={handleClearAll} style={styles.clearBtn} hitSlop={10}>
            <Ionicons name="trash-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        )}
      </LinearGradient>

      {loading ? null : items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="leaf-outline" size={36} color={C.accentGreen} />
          </View>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan a label, barcode, or type ingredients to check compliance. Results will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 22,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  listContent: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 4 },

  itemWrapper: { gap: 0 },
  row: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modeIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 3 },
  productName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  meta: { fontSize: 12, color: C.textMuted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  expandedCard: { marginTop: 8, marginBottom: 4 },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EAF4EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  emptySubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
