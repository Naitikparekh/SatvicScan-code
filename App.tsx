import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import ScanScreen from './src/screens/ScanScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const C = {
  bg: '#FFFFFF',
  border: '#EEEEEA',
  accentGreen: '#2D6A4F',
  textMuted: '#ABABAB',
} as const;

const Tab = createBottomTabNavigator();

export default function App() {
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
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 8,
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
  );
}
