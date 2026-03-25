import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import ScanScreen from './src/screens/ScanScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  border: '#EEEEEA',
  accentGreen: '#2D6A4F',
  textMuted: '#ABABAB',
} as const;

// ─── Tab icon using text glyphs (no native icon deps required) ────────────────
function TabIcon({ glyph, color, size }: { glyph: string; color: string; size: number }) {
  return (
    <Text style={{ fontSize: size - 4, color, lineHeight: size + 2, textAlign: 'center' }}>
      {glyph}
    </Text>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function App() {
  // Expose tab navigator ref so ScanScreen can navigate to Settings
  const navigationRef = useRef<any>(null);

  return (
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
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}>
        <Tab.Screen
          name="Scan"
          options={{
            tabBarIcon: ({ color, size }) => (
              <TabIcon glyph="⬤" color={color} size={size} />
            ),
            tabBarLabel: 'Scan',
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
              <TabIcon glyph="☰" color={color} size={size} />
            ),
            tabBarLabel: 'History',
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <TabIcon glyph="⚙" color={color} size={size} />
            ),
            tabBarLabel: 'Settings',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
