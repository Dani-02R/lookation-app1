// frontend/App.tsx
import React, { useEffect, useState } from 'react';
import { Platform, View, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { upsertUserProfileMinimal } from './src/services/userProfile';
import { useProfile } from './src/hooks/useProfile';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import RequestCodeScreen from './src/screens/request-code';
import RequestPasswordScreen from './src/screens/request-password';
import Home from './src/screens/Home';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

// Loader (fondo azul Lookation)
import AppLoader from './src/components/AppLoader';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  'request-password': { email: string };
  'request-code': { email: string };
  CompleteProfile: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const BRAND_BLUE = '#0082FA';

// Tema por defecto (fondo blanco) para la app normal
const AppTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
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

  // ✅ NUEVO: exigir que el correo esté verificado para considerar sesión válida
  const isVerified = !!user?.emailVerified;

  const gateIsLoading = booting || loading;
  // ❗ CAMBIO: antes era !user; ahora también bloquea si no está verificado
  const isUnauthed = !user || !isVerified;

  const isProfileKnown = profile !== undefined && profile !== null;
  const needsProfile = isProfileKnown && profile?.isProfileComplete === false;
  const isFullyAuthed = isProfileKnown && profile?.isProfileComplete === true;

  if (gateIsLoading) {
    // ⚠️ NO confíes en style del SafeAreaProvider; envuélvelo en una View azul.
    return (
      <View style={{ flex: 1, backgroundColor: BRAND_BLUE }}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: BRAND_BLUE }}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND_BLUE} />
            {/* AppLoader con overlay absoluto; pero igual el contenedor ya es azul */}
            <AppLoader
              title="Buscando tu ubicación…"
              subtitle="Sincronizando perfil"
              fullscreen
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme}>
        {isUnauthed ? (
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="request-code" component={RequestCodeScreen} />
            <Stack.Screen name="request-password" component={RequestPasswordScreen} />
          </Stack.Navigator>
        ) : needsProfile ? (
          <Stack.Navigator
            initialRouteName="CompleteProfile"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </Stack.Navigator>
        ) : isFullyAuthed ? (
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </Stack.Navigator>
        ) : (
          // Fallback muy raro: fuerza fondo azul también aquí
          <SafeAreaView style={{ flex: 1, backgroundColor: BRAND_BLUE }}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND_BLUE} />
            <AppLoader
              title="Preparando tu cuenta…"
              subtitle="Cargando datos de ubicación"
              fullscreen
            />
          </SafeAreaView>
        )}
      </NavigationContainer>

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
  );
}
