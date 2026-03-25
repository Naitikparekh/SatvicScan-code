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

import { ResultCard } from '../components/ResultCard';
import { analyzeIngredientsImage, analyzeIngredientsText } from '../services/claudeApi';
import { getApiKey, addHistoryItem } from '../services/storage';
import { fetchProductByBarcode } from '../services/openFoodFacts';
import type { ClaudeDietResult, ScanMode } from '../types';

const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
  accentGreenLight: '#EAF4EE',
} as const;

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 24;

type TabMode = 'Photo' | 'Barcode' | 'Manual';

const TAB_CONFIG: { mode: TabMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'Photo', icon: 'camera-outline', label: 'Photo' },
  { mode: 'Barcode', icon: 'barcode-outline', label: 'Barcode' },
  { mode: 'Manual', icon: 'create-outline', label: 'Manual' },
];

interface ScanScreenProps {
  onNavigateToSettings?: () => void;
}

export default function ScanScreen({ onNavigateToSettings }: ScanScreenProps) {
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
      Alert.alert(
        'API Key Required',
        'Add your Claude API key in Settings to start scanning.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => onNavigateToSettings?.() },
        ]
      );
      return null;
    }
    return key;
  }, [onNavigateToSettings]);

  const handleCapture = useCallback(async () => {
    const key = await checkApiKey();
    if (!key) return;
    if (!cameraRef.current) {
      Alert.alert('Camera error', 'Camera not ready. Please try again.');
      return;
    }
    try {
      setBusy(true);
      setResult(null);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error('No photo captured.');
      const manipulated = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.75, format: SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error('Failed to encode image.');
      const scanResult = await analyzeIngredientsImage({ imageBase64: manipulated.base64 });
      await addHistoryItem({ mode: 'photo', inputPreview: 'Photo scan', result: scanResult });
      setResult(scanResult);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') onNavigateToSettings?.();
      else Alert.alert('Scan failed', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [checkApiKey, onNavigateToSettings]);

  const handleBarcodeScan = useCallback(
    async ({ data }: { data: string }) => {
      if (barcodeLocked || busy) return;
      setBarcodeLocked(true);
      const key = await checkApiKey();
      if (!key) { setTimeout(() => setBarcodeLocked(false), 1500); return; }
      try {
        setBusy(true);
        setResult(null);
        const barcode = String(data).trim();
        const product = await fetchProductByBarcode(barcode);
        let ingredientsText = product.ingredientsText ?? '';
        const productNameHint = product.productName ?? (product.brands ? `${product.brands}` : `Barcode ${barcode}`);
        if (!ingredientsText) {
          ingredientsText = `Product: ${productNameHint}. No ingredient list available. Barcode: ${barcode}.`;
        }
        const scanResult = await analyzeIngredientsText({ ingredientsText, productNameHint });
        await addHistoryItem({ mode: 'barcode', inputPreview: barcode, result: scanResult });
        setResult(scanResult);
      } catch (err: any) {
        if (err?.message === 'NO_API_KEY') onNavigateToSettings?.();
        else Alert.alert('Barcode scan failed', err?.message ?? 'Please try again.');
      } finally {
        setBusy(false);
        setTimeout(() => setBarcodeLocked(false), 2000);
      }
    },
    [barcodeLocked, busy, checkApiKey, onNavigateToSettings]
  );

  const handleManualCheck = useCallback(async () => {
    const trimmed = ingredients.trim();
    if (!trimmed) { Alert.alert('Empty ingredients', 'Please enter the ingredients list.'); return; }
    const key = await checkApiKey();
    if (!key) return;
    try {
      setBusy(true);
      setResult(null);
      const scanResult = await analyzeIngredientsText({
        ingredientsText: trimmed,
        productNameHint: productName.trim() || undefined,
      });
      await addHistoryItem({ mode: 'manual', inputPreview: trimmed.slice(0, 60), result: scanResult });
      setResult(scanResult);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') onNavigateToSettings?.();
      else Alert.alert('Check failed', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [ingredients, productName, checkApiKey, onNavigateToSettings]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="leaf" size={18} color={C.accentGreen} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>SatvikScan</Text>
            <Text style={styles.subtitle}>Swaminarayan diet compliance</Text>
          </View>
        </View>

        {/* Pill tabs */}
        <View style={styles.pillContainer}>
          {TAB_CONFIG.map(({ mode, icon, label }) => (
            <Pressable
              key={mode}
              onPress={() => { setActiveTab(mode); setResult(null); }}
              style={[styles.pill, activeTab === mode && styles.pillActive]}>
              <Ionicons
                name={icon}
                size={16}
                color={activeTab === mode ? C.accentGreen : C.textMuted}
              />
              <Text style={[styles.pillText, activeTab === mode && styles.pillTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Photo mode */}
        {activeTab === 'Photo' && (
          <View style={styles.section}>
            {!cameraPermission?.granted ? (
              <PermissionCard
                icon="camera"
                title="Camera Access Needed"
                subtitle="Allow camera access to photograph ingredient labels."
                onAllow={requestCameraPermission}
              />
            ) : (
              <>
                <View style={styles.cameraFrame}>
                  <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                  <View pointerEvents="none" style={styles.cameraOverlay}>
                    <View style={styles.cameraRect} />
                  </View>
                  <View pointerEvents="none" style={styles.cameraCornersOverlay}>
                    <Corner position="topLeft" />
                    <Corner position="topRight" />
                    <Corner position="bottomLeft" />
                    <Corner position="bottomRight" />
                  </View>
                </View>
                <Text style={styles.cameraHint}>Point at ingredient label and capture</Text>
                <View style={styles.captureRow}>
                  <Pressable
                    style={[styles.captureOuter, busy && { opacity: 0.5 }]}
                    onPress={handleCapture}
                    disabled={busy}>
                    {busy
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Ionicons name="camera" size={26} color="#fff" />}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {/* Barcode mode */}
        {activeTab === 'Barcode' && (
          <View style={styles.section}>
            {!cameraPermission?.granted ? (
              <PermissionCard
                icon="barcode"
                title="Camera Access Needed"
                subtitle="Allow camera access to scan barcodes."
                onAllow={requestCameraPermission}
              />
            ) : (
              <>
                <View style={[styles.cameraFrame, { height: 220 }]}>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
                    }}
                    onBarcodeScanned={!barcodeLocked && !busy ? handleBarcodeScan : undefined}
                  />
                  <View pointerEvents="none" style={styles.cameraOverlay}>
                    <View style={styles.barcodeFrame} />
                  </View>
                </View>
                <View style={styles.barcodeHintRow}>
                  <Ionicons name="information-circle-outline" size={15} color={C.textMuted} />
                  <Text style={styles.barcodeHint}>Align barcode inside the frame</Text>
                </View>
                {busy && (
                  <View style={styles.busyRow}>
                    <ActivityIndicator size="small" color={C.accentGreen} />
                    <Text style={styles.busyText}>Looking up product…</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Manual mode */}
        {activeTab === 'Manual' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Product Name <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.textInput}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Lay's Classic Chips"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={[styles.inputLabel, { marginTop: 20 }]}>Ingredients List</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="Paste the full ingredients list here…"
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[
                styles.btnPrimary,
                { marginTop: 20 },
                (busy || !ingredients.trim()) && { opacity: 0.45 },
              ]}
              onPress={handleManualCheck}
              disabled={busy || !ingredients.trim()}>
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Check Compliance</Text>
                  </>}
            </Pressable>
          </View>
        )}

        {/* Analysing overlay (photo mode) */}
        {busy && activeTab === 'Photo' && (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={C.accentGreen} />
            <Text style={styles.busyText}>Analysing ingredients…</Text>
          </View>
        )}

        {/* Result card */}
        {result && !busy && (
          <View style={styles.resultSection}>
            <ResultCard result={result} />
            <Pressable style={styles.btnSecondary} onPress={() => setResult(null)}>
              <Ionicons name="refresh-outline" size={16} color={C.textSecondary} />
              <Text style={styles.btnSecondaryText}>Scan another</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Corner overlay helper ────────────────────────────────────────────────────
function Corner({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('Left');
  return (
    <View
      style={[
        styles.corner,
        isTop ? { top: 12 } : { bottom: 12 },
        isLeft ? { left: 12 } : { right: 12 },
        {
          borderTopWidth: isTop ? 3 : 0,
          borderBottomWidth: isTop ? 0 : 3,
          borderLeftWidth: isLeft ? 3 : 0,
          borderRightWidth: isLeft ? 0 : 3,
          borderTopLeftRadius: isTop && isLeft ? 6 : 0,
          borderTopRightRadius: isTop && !isLeft ? 6 : 0,
          borderBottomLeftRadius: !isTop && isLeft ? 6 : 0,
          borderBottomRightRadius: !isTop && !isLeft ? 6 : 0,
        },
      ]}
    />
  );
}

// ── Permission card helper ───────────────────────────────────────────────────
function PermissionCard({
  icon,
  title,
  subtitle,
  onAllow,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onAllow: () => void;
}) {
  return (
    <View style={styles.permissionBox}>
      <View style={styles.permissionIconWrap}>
        <Ionicons name={icon} size={28} color={C.accentGreen} />
      </View>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Text style={styles.permissionSubtitle}>{subtitle}</Text>
      <Pressable style={styles.btnPrimary} onPress={onAllow}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        <Text style={styles.btnPrimaryText}>Allow Camera</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CAMERA_HEIGHT = 280;
const BARCODE_FRAME_W = SCREEN_WIDTH * 0.82 - H_PADDING * 2;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PADDING, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.accentGreenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { gap: 2 },
  title: { fontSize: 22, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: '400', color: C.textMuted },

  // Pill tabs
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 2,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: C.bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: { fontSize: 13, fontWeight: '500', color: C.textMuted },
  pillTextActive: { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  // Section
  section: { gap: 12 },

  // Camera
  cameraFrame: {
    width: '100%',
    height: CAMERA_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cameraCornersOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  cameraRect: {
    width: '88%',
    height: 220,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  barcodeFrame: {
    width: BARCODE_FRAME_W > 0 ? BARCODE_FRAME_W : 260,
    height: 110,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  cameraHint: {
    textAlign: 'center',
    fontSize: 13,
    color: C.textMuted,
    marginTop: -4,
  },

  // Capture button
  captureRow: { alignItems: 'center', marginTop: 8 },
  captureOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  // Barcode hint
  barcodeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -4,
  },
  barcodeHint: { fontSize: 13, color: C.textMuted },

  // Manual inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 8,
  },
  optional: { fontWeight: '400', color: C.textMuted },
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
  textInputMultiline: { height: 120, paddingTop: 13 },

  // Buttons
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  btnSecondaryText: { color: C.textSecondary, fontSize: 15, fontWeight: '500' },

  // Permission card
  permissionBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  permissionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.accentGreenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  permissionTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary, textAlign: 'center' },
  permissionSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },

  // Busy / result
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  busyText: { fontSize: 14, color: C.textSecondary },
  resultSection: { marginTop: 28 },
});
