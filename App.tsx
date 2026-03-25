import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import ScanScreen from './src/screens/ScanScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

SplashScreen.preventAutoHideAsync();

const C = {
  bg: '#FFFFFF',
  border: '#EEEEEA',
  accentGreen: '#2D6A4F',
  textMuted: '#ABABAB',
} as const;

const Tab = createBottomTabNavigator();

export default function App() {
  const navigationRef = useRef<any>(null);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <Tab.Navigator
          initialRouteName="Scan"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: C.accentGreen,
            tabBarInactiveTintColor: C.textMuted,
            tabBarStyle: {
              backgroundColor: C.bg,
              borderTopColor: C.border,
              borderTopWidth: 1,
              height: Platform.OS === 'ios' ? 84 : 64,
              paddingBottom: Platform.OS === 'ios' ? 28 : 10,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          }}>
          <Tab.Screen
            name="Scan"
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="scan-outline" size={size} color={color} />
              ),
            }}>
            {() => (
              <ScanScreen
                onNavigateToSettings={() => {
                  navigationRef.current?.navigate('Settings');
                }}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="time-outline" size={size} color={color} />
              ),
            }}
          />

          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}
