// frontend/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FlashMessage from 'react-native-flash-message'; // 🔑 import

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import RequestCodeScreen from './src/screens/request-code';
import RequestPasswordScreen from './src/screens/request-password';

// Definimos los nombres de las pantallas y sus parámetros
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  "request-password": { email: string };
  "request-code": { email: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="request-code" component={RequestCodeScreen} />
          <Stack.Screen name="request-password" component={RequestPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* 🔑 FlashMessage debe estar afuera del NavigationContainer */}
      <FlashMessage position="top" />
    </>
  );
}
 