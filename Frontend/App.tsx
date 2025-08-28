// frontend/App.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

  if (booting || loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {!user ? (
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="request-code" component={RequestCodeScreen} />
            <Stack.Screen name="request-password" component={RequestPasswordScreen} />
          </Stack.Navigator>
        ) : profile && profile.isProfileComplete === false ? (
          <Stack.Navigator
            initialRouteName="CompleteProfile"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>

      {/* Contenedor global de alertas (visible en TODA la app) */}
      <FlashMessage
        position="top"
        floating
        statusBarHeight={Platform.OS === 'android' ? 25 : 40}
        style={{
          borderRadius: 12,
          marginTop: 12,
          marginHorizontal: 8,
          elevation: 6, // Android
          shadowColor: '#000', // iOS
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
