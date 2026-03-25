import { CameraView, type CameraViewRef, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ScanButton } from '@/components/ScanButton';
import { colors } from '@/constants/colors';
import { useApiKey } from '@/hooks/useApiKey';
import { useScanHistory } from '@/hooks/useScanHistory';
import { analyzeIngredientsImage, analyzeIngredientsText } from '@/services/claudeApi';
import { fetchOpenFoodFactsProduct } from '@/services/openFoodFacts';

type Mode = 'photo' | 'barcode' | 'manual';

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraViewRef | null>(null);
  const { apiKey } = useApiKey();
  const history = useScanHistory();

  const [mode, setMode] = useState<Mode>('photo');
  const [busy, setBusy] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [barcodeLocked, setBarcodeLocked] = useState(false);

  const canScan = useMemo(() => !!apiKey && !busy, [apiKey, busy]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>SatvikScan</Text>
        <Text style={styles.subtitle}>Scan ingredients for Swaminarayan diet compliance.</Text>

        <View style={styles.viewerCard}>
        {mode === 'photo' ? (
          <>
            {!cameraPermission?.granted ? (
              <View style={styles.permission}>
                <Text style={styles.permissionTitle}>Camera access needed</Text>
                <Text style={styles.permissionSubtitle}>Allow camera access to scan ingredient labels.</Text>
                <ScanButton
                  title="Allow Camera"
                  onPress={() => requestCameraPermission()}
                  variant="primary"
                />
              </View>
            ) : (
              <CameraView ref={cameraRef} style={styles.viewer} facing="back" />
            )}
          </>
        ) : mode === 'barcode' ? (
          <View style={styles.viewer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
              }}
              onBarcodeScanned={
                barcodeLocked || !canScan
                  ? undefined
                  : async ({ data }) => {
                      setBarcodeLocked(true);
                      try {
                        if (!apiKey) throw new Error('Missing API key');
                        setBusy(true);

                        const barcode = String(data || '').trim();
                        const off = await fetchOpenFoodFactsProduct(barcode);
                        const ingredientsText = off.ingredientsText ?? '';
                        const productNameHint = off.productName ?? `Barcode ${barcode}`;
                        if (!ingredientsText) {
                          throw new Error(
                            'No ingredients found from Open Food Facts for this barcode.'
                          );
                        }

                        const result = await analyzeIngredientsText({
                          apiKey,
                          ingredientsText,
                          productNameHint,
                        });
                        const item = await history.add({
                          mode: 'barcode',
                          inputPreview: barcode,
                          result,
                        });
                        router.push({ pathname: '/result', params: { id: item.id } });
                      } catch (e: any) {
                        Alert.alert('Scan failed', e?.message ?? 'Please try again.');
                      } finally {
                        setBusy(false);
                        setTimeout(() => setBarcodeLocked(false), 900);
                      }
                    }
              }
            />
            <View pointerEvents="none" style={styles.barcodeFrameWrap}>
              <View style={styles.barcodeFrame} />
            </View>
            <View style={styles.barcodeHint}>
              <Text style={styles.barcodeHintText}>Align the barcode inside the frame</Text>
            </View>
          </View>
        ) : (
          <View style={styles.manualPanel}>
            <Text style={styles.manualTitle}>Manual entry</Text>
            <Text style={styles.manualSubtitle}>Paste the full ingredients list from the label.</Text>
            <ScanButton title="Enter Ingredients" onPress={() => setManualOpen(true)} variant="primary" />
          </View>
        )}

          {mode === 'photo' && cameraPermission?.granted ? (
          <View style={styles.captureRow}>
            <Pressable
              disabled={!canScan}
              onPress={async () => {
                try {
                  if (!apiKey) throw new Error('Missing API key');
                  if (!cameraRef.current) throw new Error('Camera not ready');
                  setBusy(true);
                  const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
                  if (!photo?.uri) throw new Error('No photo captured');

                  const manipulated = await manipulateAsync(
                    photo.uri,
                    [],
                    { compress: 0.6, format: SaveFormat.JPEG, base64: true }
                  );

                  if (!manipulated.base64) throw new Error('Failed to prepare image');

                  const result = await analyzeIngredientsImage({
                    apiKey,
                    imageBase64: manipulated.base64,
                  });

                  const item = await history.add({
                    mode: 'photo',
                    inputPreview: 'Photo scan',
                    result,
                  });
                  router.push({ pathname: '/result', params: { id: item.id } });
                } catch (e: any) {
                  Alert.alert('Scan failed', e?.message ?? 'Please try again.');
                } finally {
                  setBusy(false);
                }
              }}
              style={({ pressed }) => [
                styles.captureButton,
                !canScan ? { opacity: 0.5 } : null,
                pressed && canScan ? { opacity: 0.9 } : null,
              ]}>
              <View style={styles.captureInner} />
            </Pressable>
          </View>
          ) : null}
        </View>

        <View style={styles.modeRow}>
          <ScanButton
            title="Photo"
            onPress={() => setMode('photo')}
            variant={mode === 'photo' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <ScanButton
            title="Barcode"
            onPress={() => {
              if (!cameraPermission?.granted) {
                Alert.alert(
                  'Permission needed',
                  'Allow camera access in iOS Settings to use barcode scanning.'
                );
                return;
              }
              setMode('barcode');
            }}
            variant={mode === 'barcode' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <ScanButton
            title="Manual"
            onPress={() => setMode('manual')}
            variant={mode === 'manual' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
        </View>

        <Modal visible={manualOpen} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.manualModal}>
            <Text style={styles.manualModalTitle}>Ingredients</Text>
            <TextInput
              value={manualText}
              onChangeText={setManualText}
              placeholder="Paste ingredients list…"
              placeholderTextColor="#9A9A9A"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={styles.manualInput}
            />
            <View style={styles.manualActions}>
              <ScanButton
                title="Cancel"
                onPress={() => setManualOpen(false)}
                variant="ghost"
                style={{ flex: 1 }}
              />
              <ScanButton
                title={busy ? 'Checking…' : 'Check'}
                disabled={!apiKey || busy || !manualText.trim()}
                onPress={async () => {
                  try {
                    if (!apiKey) throw new Error('Missing API key');
                    setBusy(true);
                    const text = manualText.trim();
                    const result = await analyzeIngredientsText({ apiKey, ingredientsText: text });
                    const item = await history.add({
                      mode: 'manual',
                      inputPreview: text.slice(0, 48),
                      result,
                    });
                    setManualOpen(false);
                    setManualText('');
                    router.push({ pathname: '/result', params: { id: item.id } });
                  } catch (e: any) {
                    Alert.alert('Check failed', e?.message ?? 'Please try again.');
                  } finally {
                    setBusy(false);
                  }
                }}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Modal>

        {busy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.busyText}>Analyzing…</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 12,
    fontSize: 13,
    color: colors.muted,
  },
  viewerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    flex: 1,
    minHeight: 380,
  },
  viewer: {
    flex: 1,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
    backgroundColor: colors.card,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  permissionSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  captureRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 72,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 54,
    backgroundColor: colors.accent,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  barcodeHint: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  barcodeHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  barcodeFrameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeFrame: {
    width: '78%',
    height: '28%',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  manualPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    gap: 10,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  manualSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  manualModal: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    paddingTop: 24,
    gap: 12,
  },
  manualModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  manualActions: {
    flexDirection: 'row',
    gap: 10,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  busyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
