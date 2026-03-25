import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ResultCard } from '@/components/ResultCard';
import { colors } from '@/constants/colors';
import { useScanHistory } from '@/hooks/useScanHistory';

export default function ResultScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { getById, loading } = useScanHistory();

  const item = useMemo(() => {
    if (!params?.id) return null;
    return getById(String(params.id));
  }, [params?.id, getById]);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.emptySubtitle}>Loading result…</Text>
        </View>
      ) : item ? (
        <ResultCard result={item.result} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Result not found</Text>
          <Text style={styles.emptySubtitle}>Go back and try scanning again.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    paddingTop: 18,
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
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

