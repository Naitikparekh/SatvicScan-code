import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiKey, saveApiKey, deleteApiKey } from '../services/storage';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  red: '#C1121F',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••••••';
  // Show "sk-ant-...xxxx" format
  const prefix = key.startsWith('sk-ant-') ? 'sk-ant-' : key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

// ─── ApiKey Bottom Sheet ──────────────────────────────────────────────────────
interface ApiKeySheetProps {
  visible: boolean;
  currentKey: string | null;
  onClose: () => void;
  onSaved: (key: string) => void;
}

function ApiKeySheet({ visible, currentKey, onClose, onSaved }: ApiKeySheetProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await saveApiKey(trimmed);
      onSaved(trimmed);
      setValue('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save key.');
    } finally {
      setSaving(false);
    }
  }, [value, onSaved, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={[styles.sheetContainer, { backgroundColor: C.bg }]}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">

          {/* Sheet header */}
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Claude API Key</Text>
          <Text style={styles.sheetSubtitle}>
            Your key is stored securely on this device and never leaves it.
          </Text>

          {/* Current key display */}
          {currentKey ? (
            <View style={styles.currentKeyCard}>
              <Text style={styles.currentKeyLabel}>Current key</Text>
              <Text style={styles.currentKeyValue}>{maskApiKey(currentKey)}</Text>
            </View>
          ) : null}

          {/* Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {currentKey ? 'Replace with new key' : 'Enter your API key'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={setValue}
              placeholder="sk-ant-api03-..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              autoFocus
            />
          </View>

          {/* Link */}
          <Pressable
            onPress={() => Linking.openURL('https://console.anthropic.com')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.linkText}>
              Get your API key at console.anthropic.com
            </Text>
          </Pressable>

          {/* Save button */}
          <Pressable
            style={[styles.btnPrimary, (!value.trim() || saving) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!value.trim() || saving}>
            <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>

          {/* Cancel */}
          <Pressable style={styles.btnSecondary} onPress={onClose}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Settings Screen ─────────────────────────────────────────────────────
export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const key = await getApiKey();
      if (mounted) {
        setApiKey(key);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRemoveKey = useCallback(() => {
    Alert.alert(
      'Remove API Key',
      'This will remove the stored API key from this device. You will need to re-enter it to use SatvikScan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteApiKey();
            setApiKey(null);
          },
        },
      ]
    );
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Settings</Text>

        {/* API Key row */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>API Configuration</Text>

          <Pressable style={styles.settingRow} onPress={() => setSheetVisible(true)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>API Key</Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {loading
                  ? 'Loading…'
                  : apiKey
                  ? maskApiKey(apiKey)
                  : 'Not configured'}
              </Text>
            </View>
            <Text style={styles.settingChevron}>›</Text>
          </Pressable>

          {apiKey && (
            <>
              <View style={styles.divider} />
              <Pressable style={styles.settingRow} onPress={handleRemoveKey}>
                <Text style={styles.dangerText}>Remove API Key</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App</Text>
            <Text style={styles.aboutValue}>SatvikScan</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Model</Text>
            <Text style={styles.aboutValue}>claude-haiku-4-5-20251001</Text>
          </View>
          <View style={styles.divider} />
          <Pressable
            style={styles.aboutRow}
            onPress={() => Linking.openURL('https://console.anthropic.com')}>
            <Text style={styles.aboutLabel}>Get API key</Text>
            <Text style={[styles.aboutValue, { color: C.accentGreen }]}>
              console.anthropic.com
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          Your API key is stored securely using iOS Keychain and never sent anywhere except the
          official Anthropic API.
        </Text>
      </ScrollView>

      <ApiKeySheet
        visible={sheetVisible}
        currentKey={apiKey}
        onClose={() => setSheetVisible(false)}
        onSaved={(key) => setApiKey(key)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
    gap: 3,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
  },
  settingChevron: {
    fontSize: 20,
    color: C.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '400',
    color: C.red,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: C.textPrimary,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
  },
  footerNote: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  // Sheet styles
  sheetContainer: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    lineHeight: 20,
    marginTop: -4,
  },
  currentKeyCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 4,
  },
  currentKeyLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentKeyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '400',
    color: C.textPrimary,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '400',
    color: C.accentGreen,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  btnPrimary: {
    backgroundColor: C.accentGreen,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: -4,
  },
  btnSecondaryText: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: '400',
  },
});
