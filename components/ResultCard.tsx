import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import type { ClaudeDietResult } from '@/services/claudeApi';

function verdictColor(verdict: ClaudeDietResult['verdict']) {
  if (verdict === 'SAFE') return colors.safe;
  if (verdict === 'CAUTION') return colors.caution;
  return colors.notSafe;
}

function verdictLabel(verdict: ClaudeDietResult['verdict']) {
  if (verdict === 'SAFE') return 'SAFE';
  if (verdict === 'CAUTION') return 'CAUTION';
  return 'NOT SAFE';
}

export function ResultCard(props: { result: ClaudeDietResult }) {
  const { result } = props;
  const [expanded, setExpanded] = useState(false);

  const hasFlags = result.flags.length > 0;
  const badgeBg = useMemo(() => verdictColor(result.verdict), [result.verdict]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeText}>{verdictLabel(result.verdict)}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {result.productName}
        </Text>
      </View>

      <Text style={styles.summary}>{result.summary}</Text>

      {hasFlags ? (
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.flagsToggle}>
          <Text style={styles.flagsToggleText}>
            {expanded ? 'Hide ingredient flags' : `Show ingredient flags (${result.flags.length})`}
          </Text>
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.flagsList}>
          {result.flags.map((f, idx) => {
            const dotColor = f.type === 'bad' ? colors.notSafe : f.type === 'caution' ? colors.caution : colors.safe;
            return (
              <View key={`${f.ingredient}_${idx}`} style={styles.flagRow}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                <View style={styles.flagTextCol}>
                  <Text style={styles.flagIngredient}>{f.ingredient}</Text>
                  <Text style={styles.flagReason}>{f.reason}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {result.analysis ? <Text style={styles.analysis}>{result.analysis}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  productName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  summary: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  flagsToggle: {
    marginTop: 12,
    paddingVertical: 10,
  },
  flagsToggleText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  flagsList: {
    marginTop: 4,
    gap: 12,
  },
  flagRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  flagTextCol: {
    flex: 1,
    gap: 2,
  },
  flagIngredient: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  flagReason: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  analysis: {
    marginTop: 14,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});

