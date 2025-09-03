// frontend/src/auth/FacebookSignIn.ts
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';

export async function loginWithFacebook(): Promise<FirebaseAuthTypes.UserCredential | null> {
  // Devuelve null si el usuario cancela
  // Devuelve UserCredential si todo sale bien
  const PERMS = ['public_profile', 'email'];

  // Flujo web para evitar fricciones con app de Facebook
  LoginManager.setLoginBehavior('web_only');

  const result = await LoginManager.logInWithPermissions(PERMS);

  if (result.isCancelled) {
    // cancelado por el usuario
    return null;
  }

  const tokenData = await AccessToken.getCurrentAccessToken();
  if (!tokenData?.accessToken) {
    throw new Error('No se obtuvo token de Facebook');
  }

  const credential = auth.FacebookAuthProvider.credential(tokenData.accessToken);
  const userCredential = await auth().signInWithCredential(credential);

  return userCredential;
}