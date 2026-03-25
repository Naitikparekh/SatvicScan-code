import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';

export function ApiKeyModal(props: {
  visible: boolean;
  initialValue?: string;
  onSave: (key: string) => Promise<void> | void;
}) {
  const { visible, initialValue, onSave } = props;
  const [value, setValue] = useState(initialValue ?? '');
  const [saving, setSaving] = useState(false);

  const disabled = useMemo(() => saving || !value.trim(), [saving, value]);

  return (
    <Modal animationType="slide" visible={visible} presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Enter Claude API Key</Text>
        <Text style={styles.subtitle}>
          This key is stored only on your device. You can change it later in Settings.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>API key</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="sk-ant-..."
            placeholderTextColor="#9A9A9A"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
          />
        </View>

        <Pressable
          disabled={disabled}
          onPress={async () => {
            setSaving(true);
            try {
              await onSave(value);
            } finally {
              setSaving(false);
            }
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            disabled ? styles.primaryButtonDisabled : null,
            pressed && !disabled ? styles.primaryButtonPressed : null,
          ]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 18,
    lineHeight: 20,
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
    marginBottom: 8,
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
    marginTop: 18,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

