// frontend/src/auth/GoogleSignIn.ts
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// ⚙️ Configura con tu Web client ID (OAuth 2.0 → "Web application")
GoogleSignin.configure({
  webClientId: '677584857229-e7q3gkost1k7be9ik85kpl57n7j7o0ls.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

/**
 * Inicia sesión con Google y conecta con Firebase.
 * Fuerza el selector de cuentas limpiando estado previo del SDK.
 * Incluye "fallback" a getTokens() si signIn() no trae idToken.
 */
export async function signInWithGoogle() {
  try {
    // Limpia estado previo para forzar el account picker
    try { await GoogleSignin.revokeAccess(); } catch {}
    try { await GoogleSignin.signOut(); } catch {}

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // 1) Intento principal: obtener idToken directo de signIn()
    const signInRes = await GoogleSignin.signIn() as any; // 'any' evita que TS se queje del tipo
    let idToken: string | null | undefined = signInRes?.idToken;

    // 2) Fallback: algunas versiones no devuelven idToken en signIn()
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens?.idToken;
    }

    if (!idToken) {
      throw new Error('No se recibió idToken de Google. Verifica tu webClientId en Google Cloud y Firebase.');
    }

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    return await auth().signInWithCredential(googleCredential);
  } catch (error) {
    console.error('Error en signInWithGoogle:', error);
    return null;
  }
}

/**
 * Cierra sesión completamente:
 * - Firebase
 * - SDK de Google (revoca + signOut) para que NO se autoseleccione la última cuenta
 */
export async function signOutGoogle() {
  try { await auth().signOut(); } catch {}
  try { await GoogleSignin.revokeAccess(); } catch {}
  try { await GoogleSignin.signOut(); } catch {}
}
