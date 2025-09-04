// frontend/App.tsx
import React, { useEffect, useState } from 'react';
import { Platform, View, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens, enableFreeze } from 'react-native-screens';

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { upsertUserProfileMinimal } from './src/services/userProfile';
import { useProfile } from './src/hooks/useProfile';

// Auth / Perfil / Home
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import RequestCodeScreen from './src/screens/request-code';
import RequestPasswordScreen from './src/screens/request-password';
import Home from './src/screens/Home';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Amigos
import FriendsScreen from './src/screens/FriendsScreen';

// Chats
import ChatsScreen from './src/screens/ChatsScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';

import AppLoader from './src/components/AppLoader';

// 🔸 Contexto de autenticación para usar useAuth()
import { AuthProvider } from './src/auth/AuthProvider';

// ===== activar optimizaciones nativas de navegación =====
enableScreens(true);
enableFreeze(true);

export type RootStackParamList = {
  // auth
  Login: undefined;
  Signup: undefined;
  'request-password': { email: string };
  'request-code': { email: string };

  // flujo de perfil
  CompleteProfile: undefined;
  EditProfile: undefined;

  // app
  Home: undefined;
  Settings: undefined;

  // amigos
  Friends: undefined;

  // chats
  Chats: undefined;
  ChatRoom: { conversationId: string; otherId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const BRAND_BLUE = '#0082FA';

const AppTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
};

// Opciones de stack comunes con hints de performance
const commonStackOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationTypeForReplace: 'push' as const,
  contentStyle: { backgroundColor: '#FFFFFF' },
  detachPreviousScreen: true, // libera la pantalla anterior durante el push
  // @ts-ignore -> prop de react-native-screens
  freezeOnBlur: true,         // congela pantallas fuera de foco (menos trabajo JS)
};

export default function App() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const sub = auth().onAuthStateChanged(async (u: FirebaseAuthTypes.User | null) => {
      try {
        if (u) await upsertUserProfileMinimal();
      } finally {
        setBooting(false);
      }
    });
    return sub;
  }, []);

  const { user, profile, loading } = useProfile();

  const isVerified = !!user?.emailVerified;
  const gateIsLoading = booting || loading;
  const isUnauthed = !user || !isVerified;

  const isProfileKnown = profile !== undefined && profile !== null;
  const needsProfile = isProfileKnown && profile?.isProfileComplete === false;
  const isFullyAuthed = isProfileKnown && profile?.isProfileComplete === true;

  if (gateIsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND_BLUE }}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: BRAND_BLUE }}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND_BLUE} />
            <AppLoader title="Buscando tu ubicación…" subtitle="Sincronizando perfil" fullscreen />
          </SafeAreaView>
        </SafeAreaProvider>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* 🔸 Proveedor de Auth para que useAuth() funcione en todas las pantallas */}
        <AuthProvider>
          <NavigationContainer theme={AppTheme}>
            {isUnauthed ? (
              // ==== Stack de no autenticados ====
              <Stack.Navigator initialRouteName="Login" screenOptions={commonStackOptions}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="request-code" component={RequestCodeScreen} />
                <Stack.Screen name="request-password" component={RequestPasswordScreen} />
              </Stack.Navigator>
            ) : needsProfile ? (
              // ==== Completar perfil ====
              <Stack.Navigator initialRouteName="CompleteProfile" screenOptions={commonStackOptions}>
                <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
              </Stack.Navigator>
            ) : isFullyAuthed ? (
              // ==== App autenticada ====
              <Stack.Navigator initialRouteName="Home" screenOptions={commonStackOptions}>
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />

                {/* Amigos */}
                <Stack.Screen name="Friends" component={FriendsScreen} />

                {/* Chats */}
                <Stack.Screen name="Chats" component={ChatsScreen} />
                <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
              </Stack.Navigator>
            ) : (
              // ==== Fallback de carga breve ====
              <SafeAreaView style={{ flex: 1, backgroundColor: BRAND_BLUE }}>
                <StatusBar barStyle="light-content" backgroundColor={BRAND_BLUE} />
                <AppLoader title="Preparando tu cuenta…" subtitle="Cargando datos de ubicación" fullscreen />
              </SafeAreaView>
            )}
          </NavigationContainer>
        </AuthProvider>

        <FlashMessage
          position="top"
          floating
          statusBarHeight={Platform.OS === 'android' ? 25 : 40}
          style={{
            borderRadius: 12,
            marginTop: 12,
            marginHorizontal: 8,
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 8,
          }}
          titleStyle={{ fontWeight: '700' }}
          textStyle={{ fontSize: 14 }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
