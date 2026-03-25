import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { useScanHistory } from '@/hooks/useScanHistory';

function badgeColor(verdict: string) {
  if (verdict === 'SAFE') return colors.safe;
  if (verdict === 'CAUTION') return colors.caution;
  return colors.notSafe;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { items } = useScanHistory();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtitle}>Scan a label or barcode to see results here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/result', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed ? { opacity: 0.85 } : null]}>
              <View style={[styles.badge, { backgroundColor: badgeColor(item.result.verdict) }]}>
                <Text style={styles.badgeText}>{item.result.verdict}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.result.productName}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
  },
  chevron: {
    fontSize: 22,
    color: '#A0A0A0',
    marginLeft: 4,
  },
});

