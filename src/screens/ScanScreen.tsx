import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ResultCard } from '../components/ResultCard';
import { analyzeIngredientsImage, analyzeIngredientsText } from '../services/claudeApi';
import { getApiKey, addHistoryItem } from '../services/storage';
import { fetchProductByBarcode } from '../services/openFoodFacts';
import type { ClaudeDietResult } from '../types';

const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  accentGreenMid: '#3A8A65',
  accentGreenLight: '#EAF4EE',
} as const;

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 20;

type TabMode = 'Photo' | 'Barcode' | 'Manual';

interface Props { onNavigateToSettings?: () => void; }

export default function ScanScreen({ onNavigateToSettings }: Props) {
  const [activeTab, setActiveTab] = useState<TabMode>('Photo');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClaudeDietResult | null>(null);

  const cameraRef = useRef<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [barcodeLocked, setBarcodeLocked] = useState(false);
  const [productName, setProductName] = useState('');
  const [ingredients, setIngredients] = useState('');

  const checkApiKey = useCallback(async (): Promise<string | null> => {
    const key = await getApiKey();
    if (!key) {
      Alert.alert('API Key Required', 'Add your Claude API key in Settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => onNavigateToSettings?.() },
      ]);
      return null;
    }
    return key;
  }, [onNavigateToSettings]);

  const handleCapture = useCallback(async () => {
    const key = await checkApiKey();
    if (!key || !cameraRef.current) return;
    try {
      setBusy(true); setResult(null);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error('No photo captured.');
      const m = await manipulateAsync(photo.uri, [{ resize: { width: 1024 } }], {
        compress: 0.75, format: SaveFormat.JPEG, base64: true,
      });
      if (!m.base64) throw new Error('Failed to encode image.');
      const r = await analyzeIngredientsImage({ imageBase64: m.base64 });
      await addHistoryItem({ mode: 'photo', inputPreview: 'Photo scan', result: r });
      setResult(r);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') onNavigateToSettings?.();
      else Alert.alert('Scan failed', err?.message ?? 'Please try again.');
    } finally { setBusy(false); }
  }, [checkApiKey, onNavigateToSettings]);

  const handleBarcodeScan = useCallback(async ({ data }: { data: string }) => {
    if (barcodeLocked || busy) return;
    setBarcodeLocked(true);
    const key = await checkApiKey();
    if (!key) { setTimeout(() => setBarcodeLocked(false), 1500); return; }
    try {
      setBusy(true); setResult(null);
      const barcode = String(data).trim();
      const product = await fetchProductByBarcode(barcode);
      let ingredientsText = product.ingredientsText ?? '';
      const hint = product.productName ?? (product.brands ?? `Barcode ${barcode}`);
      if (!ingredientsText) ingredientsText = `Product: ${hint}. No ingredient list. Barcode: ${barcode}.`;
      const r = await analyzeIngredientsText({ ingredientsText, productNameHint: hint });
      await addHistoryItem({ mode: 'barcode', inputPreview: barcode, result: r });
      setResult(r);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') onNavigateToSettings?.();
      else Alert.alert('Barcode failed', err?.message ?? 'Please try again.');
    } finally { setBusy(false); setTimeout(() => setBarcodeLocked(false), 2000); }
  }, [barcodeLocked, busy, checkApiKey, onNavigateToSettings]);

  const handleManualCheck = useCallback(async () => {
    const trimmed = ingredients.trim();
    if (!trimmed) { Alert.alert('Empty ingredients', 'Please enter ingredients.'); return; }
    const key = await checkApiKey();
    if (!key) return;
    try {
      setBusy(true); setResult(null);
      const r = await analyzeIngredientsText({
        ingredientsText: trimmed,
        productNameHint: productName.trim() || undefined,
      });
      await addHistoryItem({ mode: 'manual', inputPreview: trimmed.slice(0, 60), result: r });
      setResult(r);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') onNavigateToSettings?.();
      else Alert.alert('Check failed', err?.message ?? 'Please try again.');
    } finally { setBusy(false); }
  }, [ingredients, productName, checkApiKey, onNavigateToSettings]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Hero header ── */}
        <LinearGradient
          colors={['#1B4332', '#2D6A4F', '#40916C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={styles.heroIconRow}>
            <View style={styles.heroIconBubble}>
              <Ionicons name="leaf" size={22} color="#2D6A4F" />
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Swaminarayan Satvik</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>SatvikScan</Text>
          <Text style={styles.heroSubtitle}>
            Instantly check if a food is permitted on your Satvik diet
          </Text>
        </LinearGradient>

        {/* ── Mode pill tabs ── */}
        <View style={styles.pillRow}>
          {(['Photo', 'Barcode', 'Manual'] as TabMode[]).map((mode) => {
            const icons: Record<TabMode, keyof typeof Ionicons.glyphMap> = {
              Photo: 'camera-outline',
              Barcode: 'barcode-outline',
              Manual: 'create-outline',
            };
            const active = activeTab === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => { setActiveTab(mode); setResult(null); }}
                style={[styles.pill, active && styles.pillActive]}>
                <Ionicons
                  name={icons[mode]}
                  size={15}
                  color={active ? C.accentGreen : C.textMuted}
                />
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {mode}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Photo mode ── */}
        {activeTab === 'Photo' && (
          !cameraPermission?.granted ? (
            <PermissionCard icon="camera" title="Camera Access" subtitle="Needed to photograph ingredient labels." onAllow={requestCameraPermission} />
          ) : (
            <View style={styles.cameraSection}>
              <View style={styles.cameraFrame}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
                {/* dim overlay */}
                <View style={styles.camDim} />
                {/* scan rect */}
                <View style={styles.scanRect}>
                  <CornerLines />
                </View>
                <Text style={styles.camLabel}>Point at ingredient label</Text>
              </View>
              <Pressable
                style={[styles.captureBtn, busy && { opacity: 0.5 }]}
                onPress={handleCapture}
                disabled={busy}>
                <LinearGradient colors={['#2D6A4F', '#1B4332']} style={styles.captureBtnGrad}>
                  {busy
                    ? <ActivityIndicator color="#fff" />
                    : <Ionicons name="camera" size={28} color="#fff" />}
                </LinearGradient>
              </Pressable>
            </View>
          )
        )}

        {/* ── Barcode mode ── */}
        {activeTab === 'Barcode' && (
          !cameraPermission?.granted ? (
            <PermissionCard icon="barcode" title="Camera Access" subtitle="Needed to scan barcodes." onAllow={requestCameraPermission} />
          ) : (
            <View style={styles.cameraSection}>
              <View style={[styles.cameraFrame, { height: 200 }]}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
                  onBarcodeScanned={!barcodeLocked && !busy ? handleBarcodeScan : undefined}
                />
                <View style={styles.camDim} />
                <View style={styles.barcodeRect} />
              </View>
              <View style={styles.hintRow}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={styles.hintText}>Align barcode inside the frame</Text>
              </View>
              {busy && (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color={C.accentGreen} />
                  <Text style={styles.busyText}>Looking up product…</Text>
                </View>
              )}
            </View>
          )
        )}

        {/* ── Manual mode ── */}
        {activeTab === 'Manual' && (
          <View style={styles.manualSection}>
            <Text style={styles.inputLabel}>Product Name <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.textInput}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Lay's Classic Chips"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Ingredients List</Text>
            <TextInput
              style={[styles.textInput, { height: 130, paddingTop: 13 }]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="Paste full ingredients here…"
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.checkBtn, (busy || !ingredients.trim()) && { opacity: 0.45 }]}
              onPress={handleManualCheck}
              disabled={busy || !ingredients.trim()}>
              <LinearGradient colors={['#2D6A4F', '#1B4332']} style={styles.checkBtnGrad}>
                {busy
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="shield-checkmark" size={18} color="#fff" />
                      <Text style={styles.checkBtnText}>Check Compliance</Text>
                    </>}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Analysing indicator */}
        {busy && activeTab === 'Photo' && (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={C.accentGreen} />
            <Text style={styles.busyText}>Analysing ingredients…</Text>
          </View>
        )}

        {/* Result */}
        {result && !busy && (
          <View style={{ marginTop: 28 }}>
            <ResultCard result={result} />
            <Pressable style={styles.rescanBtn} onPress={() => setResult(null)}>
              <Ionicons name="refresh-outline" size={16} color={C.textSecondary} />
              <Text style={styles.rescanText}>Scan another</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Corner lines for scan frame ──────────────────────────────────────────────
function CornerLines() {
  const L = 22;
  const T = 3;
  const color = 'rgba(255,255,255,0.95)';
  const corners = [
    { top: 0, left: 0, borderTopWidth: T, borderLeftWidth: T, borderTopLeftRadius: 6 },
    { top: 0, right: 0, borderTopWidth: T, borderRightWidth: T, borderTopRightRadius: 6 },
    { bottom: 0, left: 0, borderBottomWidth: T, borderLeftWidth: T, borderBottomLeftRadius: 6 },
    { bottom: 0, right: 0, borderBottomWidth: T, borderRightWidth: T, borderBottomRightRadius: 6 },
  ];
  return (
    <>
      {corners.map((s, i) => (
        <View key={i} style={[{ position: 'absolute', width: L, height: L, borderColor: color }, s]} />
      ))}
    </>
  );
}

// ── Permission card ──────────────────────────────────────────────────────────
function PermissionCard({ icon, title, subtitle, onAllow }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onAllow: () => void;
}) {
  return (
    <View style={styles.permCard}>
      <View style={styles.permIconWrap}>
        <Ionicons name={icon} size={30} color="#2D6A4F" />
      </View>
      <Text style={styles.permTitle}>{title}</Text>
      <Text style={styles.permSubtitle}>{subtitle}</Text>
      <Pressable style={styles.permBtn} onPress={onAllow}>
        <LinearGradient colors={['#2D6A4F', '#1B4332']} style={styles.permBtnGrad}>
          <Text style={styles.permBtnText}>Allow Camera Access</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Hero
  heroCard: {
    marginHorizontal: H_PADDING,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 24,
    padding: 24,
    gap: 10,
  },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  heroIconBubble: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },

  // Pills
  pillRow: {
    flexDirection: 'row',
    marginHorizontal: H_PADDING,
    backgroundColor: '#F7F7F5',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEA',
    gap: 3,
  },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 10,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: { fontSize: 13, fontWeight: '500', color: '#ABABAB' },
  pillTextActive: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  // Camera
  cameraSection: { marginHorizontal: H_PADDING, gap: 14 },
  cameraFrame: {
    width: '100%',
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  scanRect: {
    width: SCREEN_WIDTH * 0.72,
    height: 200,
    borderRadius: 4,
  },
  camLabel: {
    position: 'absolute',
    bottom: 16,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  barcodeRect: {
    width: SCREEN_WIDTH * 0.7,
    height: 90,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
  },
  captureBtn: {
    alignSelf: 'center',
    width: 70, height: 70, borderRadius: 35,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  captureBtnGrad: {
    flex: 1, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
  },

  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  hintText: { fontSize: 13, color: '#ABABAB' },
  busyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  busyText: { fontSize: 14, color: '#6B6B6B' },

  // Manual
  manualSection: { marginHorizontal: H_PADDING, gap: 0 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, letterSpacing: 0.1 },
  optional: { fontWeight: '400', color: '#ABABAB' },
  textInput: {
    backgroundColor: '#F7F7F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEEEEA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  checkBtn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  checkBtnGrad: {
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Permission card
  permCard: {
    marginHorizontal: H_PADDING,
    backgroundColor: '#F7F7F5',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EEEEEA',
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  permIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EAF4EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  permSubtitle: { fontSize: 14, color: '#6B6B6B', textAlign: 'center', lineHeight: 20 },
  permBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  permBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  permBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Rescan
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 12,
    backgroundColor: '#F7F7F5',
    borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEA',
    paddingVertical: 13,
    marginHorizontal: H_PADDING,
  },
  rescanText: { color: '#6B6B6B', fontSize: 15, fontWeight: '500' },
});
