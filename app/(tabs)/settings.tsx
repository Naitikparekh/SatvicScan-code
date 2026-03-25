import Constants from 'expo-constants';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useApiKey } from '@/hooks/useApiKey';
import { useScanHistory } from '@/hooks/useScanHistory';

function maskKey(key: string) {
  if (!key) return '';
  if (key.length <= 10) return '••••••••••';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

export default function SettingsScreen() {
  const { apiKey, saveApiKey, clearApiKey } = useApiKey();
  const { clear: clearHistory } = useScanHistory();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const version = useMemo(() => {
    return Constants.expoConfig?.version ?? '1.0.0';
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Claude API key</Text>
        <Text style={styles.currentKey} numberOfLines={1}>
          {apiKey ? maskKey(apiKey) : 'Not set'}
        </Text>

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Paste new key (optional)"
          placeholderTextColor="#9A9A9A"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          disabled={saving || !value.trim()}
          onPress={async () => {
            setSaving(true);
            try {
              await saveApiKey(value);
              setValue('');
              Alert.alert('Saved', 'Your API key has been saved.');
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to save key.');
            } finally {
              setSaving(false);
            }
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (saving || !value.trim()) ? { opacity: 0.5 } : null,
            pressed && !(saving || !value.trim()) ? { opacity: 0.9 } : null,
          ]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!apiKey) return;
            Alert.alert('Remove key?', 'This will remove the stored API key from this device.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await clearApiKey();
                  Alert.alert('Removed', 'API key removed.');
                },
              },
            ]);
          }}
          disabled={!apiKey}
          style={({ pressed }) => [
            styles.secondaryButton,
            !apiKey ? { opacity: 0.5 } : null,
            pressed && apiKey ? { opacity: 0.9 } : null,
          ]}>
          <Text style={styles.secondaryButtonText}>Remove stored key</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={() => {
            Alert.alert('Clear history?', 'This will delete all past scan results stored on this device.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                  await clearHistory();
                  Alert.alert('Cleared', 'Scan history cleared.');
                },
              },
            ]);
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? { opacity: 0.9 } : null,
          ]}>
          <Text style={styles.secondaryButtonText}>Clear scan history</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>Version {version}</Text>
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
  label: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 6,
  },
  currentKey: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.notSafe,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    marginTop: 14,
    marginBottom: 4,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  version: {
    marginTop: 16,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});

