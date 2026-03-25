import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ClaudeDietResult } from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  safeBg: '#D8F3DC',
  red: '#C1121F',
  redBg: '#FFE5E5',
  amber: '#E07A00',
  amberBg: '#FFF4E0',
} as const;

// ─── Verdict helpers ──────────────────────────────────────────────────────────
function verdictConfig(verdict: ClaudeDietResult['verdict']) {
  switch (verdict) {
    case 'SAFE':
      return {
        emoji: '✅',
        label: 'SAFE',
        color: COLORS.accentGreen,
        bgColor: COLORS.safeBg,
      };
    case 'NOT_SAFE':
      return {
        emoji: '❌',
        label: 'NOT PERMITTED',
        color: COLORS.red,
        bgColor: COLORS.redBg,
      };
    case 'CAUTION':
      return {
        emoji: '⚠️',
        label: 'CAUTION',
        color: COLORS.amber,
        bgColor: COLORS.amberBg,
      };
  }
}

function flagDotColor(type: 'bad' | 'caution' | 'good') {
  if (type === 'bad') return COLORS.red;
  if (type === 'caution') return COLORS.amber;
  return COLORS.accentGreen;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ResultCardProps {
  result: ClaudeDietResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const config = verdictConfig(result.verdict);

  const hasFlags = result.flags.length > 0;
  const hasAmbiguous = Array.isArray(result.ambiguous) && result.ambiguous.length > 0;

  return (
    <View style={styles.card}>
      {/* Verdict header */}
      <View style={[styles.verdictHeader, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.verdictText, { color: config.color }]}>
          {config.emoji} {config.label}
        </Text>
        {result.productName ? (
          <Text style={styles.productName} numberOfLines={2}>
            {result.productName}
          </Text>
        ) : null}
      </View>

      {/* Summary */}
      <View style={styles.body}>
        <Text style={styles.summary}>{result.summary}</Text>

        {/* Ingredient flags */}
        {hasFlags ? (
          <View style={styles.flagsSection}>
            <Text style={styles.sectionLabel}>Ingredient flags</Text>
            {result.flags.map((flag, idx) => (
              <View key={`${flag.ingredient}_${idx}`} style={styles.flagRow}>
                <View style={[styles.flagDot, { backgroundColor: flagDotColor(flag.type) }]} />
                <View style={styles.flagTextCol}>
                  <Text style={styles.flagIngredient}>{flag.ingredient}</Text>
                  <Text style={styles.flagReason}>{flag.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Ambiguous ingredients */}
        {hasAmbiguous ? (
          <View style={styles.ambiguousSection}>
            <Text style={styles.sectionLabel}>Needs manufacturer verification</Text>
            {result.ambiguous.map((item, idx) => (
              <View key={idx} style={styles.ambiguousRow}>
                <View style={[styles.flagDot, { backgroundColor: COLORS.amber }]} />
                <Text style={styles.ambiguousText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Full analysis toggle */}
        {result.analysis ? (
          <>
            <Pressable
              onPress={() => setAnalysisExpanded((v) => !v)}
              style={styles.toggleRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.toggleText, { color: config.color }]}>
                {analysisExpanded ? 'Hide full analysis ▲' : 'Show full analysis ▼'}
              </Text>
            </Pressable>
            {analysisExpanded ? (
              <Text style={styles.analysisText}>{result.analysis}</Text>
            ) : null}
          </>
        ) : null}

        {/* Confidence badge */}
        {result.confidence ? (
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>
              Confidence:{' '}
              <Text style={styles.confidenceValue}>{result.confidence}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  verdictHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 6,
  },
  verdictText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  summary: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flagsSection: {
    gap: 0,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  flagTextCol: {
    flex: 1,
    gap: 2,
  },
  flagIngredient: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  flagReason: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  ambiguousSection: {
    gap: 0,
  },
  ambiguousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  ambiguousText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  toggleRow: {
    paddingTop: 4,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  analysisText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  confidenceRow: {
    marginTop: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
