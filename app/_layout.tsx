import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ApiKeyModal } from '@/components/ApiKeyModal';
import { useApiKey } from '@/hooks/useApiKey';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { apiKey, loading, saveApiKey } = useApiKey();

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ title: 'Result' }} />
      </Stack>
      <StatusBar style="dark" />
      <ApiKeyModal visible={!loading && !apiKey} onSave={saveApiKey} initialValue={apiKey ?? ''} />
    </>
  );
}
