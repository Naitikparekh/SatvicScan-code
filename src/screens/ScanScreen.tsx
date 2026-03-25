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

import { ResultCard } from '../components/ResultCard';
import { analyzeIngredientsImage, analyzeIngredientsText } from '../services/claudeApi';
import { getApiKey, addHistoryItem } from '../services/storage';
import { fetchProductByBarcode } from '../services/openFoodFacts';
import type { ClaudeDietResult, ScanMode } from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EEEEEA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  accentGreen: '#2D6A4F',
} as const;

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 24;

type TabMode = 'Photo' | 'Barcode' | 'Manual';

interface ScanScreenProps {
  onNavigateToSettings?: () => void;
}

export default function ScanScreen({ onNavigateToSettings }: ScanScreenProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('Photo');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClaudeDietResult | null>(null);

  // Photo mode
  const cameraRef = useRef<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Barcode mode
  const [barcodeLocked, setBarcodeLocked] = useState(false);

  // Manual mode
  const [productName, setProductName] = useState('');
  const [ingredients, setIngredients] = useState('');

  const checkApiKey = useCallback(async (): Promise<string | null> => {
    const key = await getApiKey();
    if (!key) {
      Alert.alert(
        'API Key Required',
        'Please add your Claude API key in Settings to use SatvikScan.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => onNavigateToSettings?.(),
          },
        ]
      );
      return null;
    }
    return key;
  }, [onNavigateToSettings]);

  // ── Photo capture ──────────────────────────────────────────────────────────
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

      // Compress to max 1024px JPEG
      const manipulated = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.75, format: SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error('Failed to encode image.');

      const scanResult = await analyzeIngredientsImage({
        imageBase64: manipulated.base64,
      });

      await addHistoryItem({
        mode: 'photo',
        inputPreview: 'Photo scan',
        result: scanResult,
      });

      setResult(scanResult);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') {
        onNavigateToSettings?.();
      } else {
        Alert.alert('Scan failed', err?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [checkApiKey, onNavigateToSettings]);

  // ── Barcode scanned ────────────────────────────────────────────────────────
  const handleBarcodeScan = useCallback(
    async ({ data }: { data: string }) => {
      if (barcodeLocked || busy) return;
      setBarcodeLocked(true);

      const key = await checkApiKey();
      if (!key) {
        setTimeout(() => setBarcodeLocked(false), 1500);
        return;
      }

      try {
        setBusy(true);
        setResult(null);

        const barcode = String(data).trim();
        const product = await fetchProductByBarcode(barcode);

        let ingredientsText = product.ingredientsText ?? '';
        const productNameHint =
          product.productName ?? (product.brands ? `${product.brands}` : `Barcode ${barcode}`);

        if (!ingredientsText) {
          // No ingredients found — still send to Claude with product name
          ingredientsText = `Product: ${productNameHint}. No ingredient list available. Barcode: ${barcode}.`;
        }

        const scanResult = await analyzeIngredientsText({
          ingredientsText,
          productNameHint,
        });

        await addHistoryItem({
          mode: 'barcode',
          inputPreview: barcode,
          result: scanResult,
        });

        setResult(scanResult);
      } catch (err: any) {
        if (err?.message === 'NO_API_KEY') {
          onNavigateToSettings?.();
        } else {
          Alert.alert('Barcode scan failed', err?.message ?? 'Please try again.');
        }
      } finally {
        setBusy(false);
        setTimeout(() => setBarcodeLocked(false), 2000);
      }
    },
    [barcodeLocked, busy, checkApiKey, onNavigateToSettings]
  );

  // ── Manual check ───────────────────────────────────────────────────────────
  const handleManualCheck = useCallback(async () => {
    const trimmed = ingredients.trim();
    if (!trimmed) {
      Alert.alert('Empty ingredients', 'Please enter the ingredients list.');
      return;
    }

    const key = await checkApiKey();
    if (!key) return;

    try {
      setBusy(true);
      setResult(null);

      const scanResult = await analyzeIngredientsText({
        ingredientsText: trimmed,
        productNameHint: productName.trim() || undefined,
      });

      await addHistoryItem({
        mode: 'manual',
        inputPreview: trimmed.slice(0, 60),
        result: scanResult,
      });

      setResult(scanResult);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') {
        onNavigateToSettings?.();
      } else {
        Alert.alert('Check failed', err?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [ingredients, productName, checkApiKey, onNavigateToSettings]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.title}>SatvikScan</Text>
        <Text style={styles.subtitle}>Check Swaminarayan diet compliance</Text>

        {/* Pill tab selector */}
        <View style={styles.pillContainer}>
          {(['Photo', 'Barcode', 'Manual'] as TabMode[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                setResult(null);
              }}
              style={[styles.pill, activeTab === tab && styles.pillActive]}>
              <Text style={[styles.pillText, activeTab === tab && styles.pillTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Photo mode ── */}
        {activeTab === 'Photo' && (
          <View style={styles.section}>
            {!cameraPermission?.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionSubtitle}>
                  Allow camera access to scan ingredient labels.
                </Text>
                <Pressable style={styles.btnPrimary} onPress={requestCameraPermission}>
                  <Text style={styles.btnPrimaryText}>Allow Camera</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.cameraFrame}>
                  <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                  {/* White overlay rectangle */}
                  <View pointerEvents="none" style={styles.cameraOverlay}>
                    <View style={styles.cameraRect} />
                  </View>
                </View>

                {/* Capture button */}
                <View style={styles.captureRow}>
                  <Pressable
                    style={[styles.captureOuter, busy && { opacity: 0.5 }]}
                    onPress={handleCapture}
                    disabled={busy}>
                    <View style={styles.captureInner} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Barcode mode ── */}
        {activeTab === 'Barcode' && (
          <View style={styles.section}>
            {!cameraPermission?.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionSubtitle}>
                  Allow camera access to scan barcodes.
                </Text>
                <Pressable style={styles.btnPrimary} onPress={requestCameraPermission}>
                  <Text style={styles.btnPrimaryText}>Allow Camera</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.cameraFrame}>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
                    }}
                    onBarcodeScanned={!barcodeLocked && !busy ? handleBarcodeScan : undefined}
                  />
                  {/* Barcode overlay frame */}
                  <View pointerEvents="none" style={styles.cameraOverlay}>
                    <View style={styles.barcodeFrame} />
                  </View>
                </View>
                <Text style={styles.barcodeHint}>Align barcode inside the frame</Text>
              </>
            )}
          </View>
        )}

        {/* ── Manual mode ── */}
        {activeTab === 'Manual' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Product Name (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Lay's Classic Chips"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Ingredients List</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="Paste ingredients here…"
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[styles.btnPrimary, styles.btnFullWidth, (busy || !ingredients.trim()) && { opacity: 0.5 }]}
              onPress={handleManualCheck}
              disabled={busy || !ingredients.trim()}>
              <Text style={styles.btnPrimaryText}>
                {busy ? 'Checking…' : 'Check Compliance'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Loading overlay */}
        {busy && (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={C.accentGreen} />
            <Text style={styles.busyText}>Analyzing ingredients…</Text>
          </View>
        )}

        {/* Result card */}
        {result && !busy && (
          <View style={styles.resultSection}>
            <ResultCard result={result} />
            <Pressable
              style={styles.btnSecondary}
              onPress={() => setResult(null)}>
              <Text style={styles.btnSecondaryText}>Scan another</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CAMERA_HEIGHT = 280;
const BARCODE_FRAME_W = SCREEN_WIDTH * 0.82 - H_PADDING * 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  // Pill tabs
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: C.bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textMuted,
  },
  pillTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  // Section wrapper
  section: {
    gap: 12,
  },
  // Camera
  cameraFrame: {
    width: '100%',
    height: CAMERA_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraRect: {
    width: '90%',
    height: 240,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
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
  // Capture button
  captureRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  captureOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accentGreen,
  },
  // Barcode hint
  barcodeHint: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    marginTop: 4,
  },
  // Manual mode inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '400',
    color: C.textPrimary,
  },
  textInputMultiline: {
    height: 120,
    paddingTop: 12,
  },
  // Buttons
  btnPrimary: {
    backgroundColor: C.accentGreen,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFullWidth: {
    marginTop: 8,
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
    marginTop: 12,
  },
  btnSecondaryText: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: '400',
  },
  // Permission box
  permissionBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Busy
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  busyText: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
  },
  // Result
  resultSection: {
    marginTop: 24,
    gap: 4,
  },
});
