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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getApiKey, saveApiKey, deleteApiKey } from '../services/storage';

const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  accentGreenLight: '#EAF4EE',
  red: '#C1121F',
} as const;

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••••••';
  const prefix = key.startsWith('sk-ant-') ? 'sk-ant-' : key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

// ── API Key Sheet ────────────────────────────────────────────────────────────
function ApiKeySheet({
  visible,
  currentKey,
  onClose,
  onSaved,
}: {
  visible: boolean;
  currentKey: string | null;
  onClose: () => void;
  onSaved: (key: string) => void;
}) {
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">

          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="key" size={20} color={C.accentGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Claude API Key</Text>
              <Text style={styles.sheetSubtitle}>Stored securely on this device only</Text>
            </View>
          </View>

          {currentKey ? (
            <View style={styles.currentKeyCard}>
              <Text style={styles.currentKeyLabel}>Current key</Text>
              <Text style={styles.currentKeyValue}>{maskApiKey(currentKey)}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{currentKey ? 'Replace with new key' : 'Enter your API key'}</Text>
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

          <Pressable
            onPress={() => Linking.openURL('https://console.anthropic.com')}
            style={styles.linkRow}
            hitSlop={10}>
            <Ionicons name="open-outline" size={14} color={C.accentGreen} />
            <Text style={styles.linkText}>Get your key at console.anthropic.com</Text>
          </Pressable>

          <Pressable
            style={[styles.btnPrimary, (!value.trim() || saving) && { opacity: 0.45 }]}
            onPress={handleSave}
            disabled={!value.trim() || saving}>
            <Ionicons name={saving ? 'hourglass-outline' : 'save-outline'} size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save Key'}</Text>
          </Pressable>

          <Pressable style={styles.btnSecondary} onPress={onClose}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Settings Screen ──────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const key = await getApiKey();
      if (mounted) { setApiKey(key); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleRemoveKey = useCallback(() => {
    Alert.alert(
      'Remove API Key',
      'This will remove the stored key from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => { await deleteApiKey(); setApiKey(null); },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#1B4332', '#2D6A4F']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="settings" size={20} color="#2D6A4F" />
          </View>
          <Text style={styles.title}>Settings</Text>
        </LinearGradient>

        {/* API key status banner */}
        {!loading && (
          <Pressable
            style={[styles.apiBanner, apiKey ? styles.apiBannerSet : styles.apiBannerUnset, { marginHorizontal: 24 }]}
            onPress={() => setSheetVisible(true)}>
            <View style={[styles.apiBannerIcon, { backgroundColor: apiKey ? C.accentGreenLight : '#FFF4E0' }]}>
              <Ionicons name="key-outline" size={20} color={apiKey ? C.accentGreen : '#E07A00'} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.apiBannerTitle}>
                {apiKey ? 'API Key configured' : 'API Key not set'}
              </Text>
              <Text style={styles.apiBannerValue}>
                {apiKey ? maskApiKey(apiKey) : 'Tap to add your Claude API key'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </Pressable>
        )}

        {/* API Configuration card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>API Configuration</Text>

          <Pressable style={styles.settingRow} onPress={() => setSheetVisible(true)}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="key-outline" size={18} color={C.accentGreen} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>API Key</Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {loading ? 'Loading…' : apiKey ? maskApiKey(apiKey) : 'Not configured'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </Pressable>

          {apiKey && (
            <>
              <View style={styles.divider} />
              <Pressable style={styles.settingRow} onPress={handleRemoveKey}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#FFF0F0' }]}>
                  <Ionicons name="trash-outline" size={18} color={C.red} />
                </View>
                <Text style={[styles.settingTitle, { color: C.red }]}>Remove API Key</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* About card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>About</Text>

          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: C.accentGreenLight }]}>
              <Ionicons name="leaf-outline" size={18} color={C.accentGreen} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>SatvikScan</Text>
              <Text style={styles.settingValue}>Swaminarayan diet compliance</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: '#F0F4FF' }]}>
              <Ionicons name="cpu-outline" size={18} color="#4B6BFB" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>AI Model</Text>
              <Text style={styles.settingValue}>claude-haiku-4-5</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://console.anthropic.com')}>
            <View style={[styles.settingIconWrap, { backgroundColor: '#FFF4E0' }]}>
              <Ionicons name="link-outline" size={18} color="#E07A00" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Get API Key</Text>
              <Text style={[styles.settingValue, { color: C.accentGreen }]}>console.anthropic.com</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={C.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          Your API key is stored in the iOS Keychain and never leaves this device.
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  headerIconWrap: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },

  // API status banner
  apiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  apiBannerSet: {
    backgroundColor: '#F2FAF5',
    borderColor: '#B7E4C7',
  },
  apiBannerUnset: {
    backgroundColor: '#FFFBF0',
    borderColor: '#FFE4A0',
  },
  apiBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiBannerTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  apiBannerValue: { fontSize: 13, color: C.textSecondary },

  // Card
  card: {
    marginHorizontal: 24,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1, gap: 2 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  settingValue: { fontSize: 13, color: C.textSecondary },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  footerNote: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 4,
  },

  // Sheet
  sheetContent: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accentGreenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  sheetSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  currentKeyCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 4,
  },
  currentKeyLabel: {
    fontSize: 11,
    fontWeight: '600',
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
  inputGroup: { gap: 8 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
    color: C.textPrimary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -4,
  },
  linkText: { fontSize: 14, color: C.accentGreen, textDecorationLine: 'underline' },
  btnPrimary: {
    backgroundColor: C.accentGreen,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnSecondary: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: -4,
  },
  btnSecondaryText: { color: C.textSecondary, fontSize: 15, fontWeight: '500' },
});
