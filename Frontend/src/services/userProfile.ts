// src/services/userProfile.ts
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/** Detecta el proveedor principal de forma robusta */
function resolveProviderId(pds: Array<{ providerId: string }> | null | undefined) {
  const ids = (pds ?? []).map((p) => p.providerId);
  if (ids.includes('password')) return 'password';
  if (ids.some((id) => id.includes('google'))) return 'google';
  return ids[0] ?? 'unknown';
}

/**
 * Crea/actualiza el documento mínimo del usuario en /users/{uid}.
 * - Si NO existe: crea doc con defaults e isProfileComplete=false.
 * - Si SÍ existe: actualiza campos de Auth y hace backfill de defaults si faltan.
 */
export async function upsertUserProfileMinimal(): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  const ref = firestore().collection('users').doc(user.uid);
  const snap = await ref.get();

  const provider = resolveProviderId(user.providerData);
  const email = (user.email ?? null) && user.email!.trim().toLowerCase();
  const displayName = user.displayName ?? '';
  const photoURL = user.photoURL ?? null;

  if (!snap.exists) {
    // Crear doc mínimo (primera vez)
    await ref.set({
      uid: user.uid,
      email: email ?? null,
      displayName,
      photoURL,
      provider,
      phone: '',
      bio: '',
      gamertag: '',
      roles: ['user'],
      isProfileComplete: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  // Si ya existe, actualizamos auth-fields y hacemos "backfill" sin tocar createdAt ni forzar isProfileComplete
  const current = snap.data() || {};
  const backfill: Record<string, any> = {};

  if (current.phone === undefined) backfill.phone = '';
  if (current.bio === undefined) backfill.bio = '';
  if (current.gamertag === undefined) backfill.gamertag = '';
  if (current.roles === undefined) backfill.roles = ['user'];
  if (current.isProfileComplete === undefined) backfill.isProfileComplete = false;

  await ref.set(
    {
      email: email ?? null,
      displayName,
      photoURL,
      provider,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      ...backfill,
    },
    { merge: true }
  );
}

/**
 * Actualiza campos editables del perfil y sincroniza con Firebase Auth si aplica.
 * No cambia gamertag aquí (unicidad se maneja con usernames.ts).
 */
export async function updateUserProfile(partial: {
  displayName?: string;
  bio?: string;
  phone?: string;
  photoURL?: string; // URL pública (sin Storage por ahora)
}): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('No hay usuario autenticado');

  // Guardar en Firestore
  await firestore().collection('users').doc(user.uid).set(
    {
      ...partial,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Sincronizar en Auth si es necesario
  if (partial.displayName !== undefined || partial.photoURL !== undefined) {
    await user.updateProfile({
      displayName: partial.displayName ?? user.displayName ?? '',
      photoURL: partial.photoURL ?? user.photoURL ?? null,
    });
  }
}
