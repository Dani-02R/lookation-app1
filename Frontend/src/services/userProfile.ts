// src/services/userProfile.ts
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/** Helpers de colecciones */
export const usersCol = () => firestore().collection('users');
export const publicProfilesCol = () => firestore().collection('publicProfiles');

/** Detecta el proveedor principal */
function resolveProviderId(pds: Array<{ providerId: string }> | null | undefined) {
  const ids = (pds ?? []).map((p) => p.providerId);
  if (ids.includes('password')) return 'password';
  if (ids.some((id) => id.includes('google'))) return 'google';
  return ids[0] ?? 'unknown';
}

/** Shape del documento almacenado en /users/{uid} */
export type UserProfileDoc = {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  provider: string;
  phone: string;
  bio: string;
  gamertag: string;
  roles: string[];
  isProfileComplete: boolean;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

/** Shape del documento en /publicProfiles/{uid} */
export type PublicProfileDoc = {
  displayName?: string;
  photoURL?: string | null;
  gamertag?: string | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

/**
 * Crea/actualiza el documento mínimo del usuario en /users/{uid}
 * y mantiene sincronizado /publicProfiles/{uid}.
 */
export async function upsertUserProfileMinimal(): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  const ref = usersCol().doc(user.uid);
  const pubRef = publicProfilesCol().doc(user.uid);
  const snap = await ref.get();

  const provider = resolveProviderId(user.providerData);
  const email = (user.email ?? null) && user.email!.trim().toLowerCase();
  const displayName = user.displayName ?? '';
  const photoURL = user.photoURL ?? null;

  let currentGamertag = '';

  if (!snap.exists) {
    // Crear doc mínimo
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
  } else {
    const current = (snap.data() || {}) as Partial<UserProfileDoc>;
    currentGamertag = current.gamertag ?? '';

    const backfill: Partial<UserProfileDoc> = {};
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

  // Actualizar /publicProfiles/{uid} para búsquedas y solicitudes
  await pubRef.set(
    {
      displayName,
      photoURL,
      gamertag: currentGamertag,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Actualiza campos editables del perfil y sincroniza con Auth si aplica.
 * (No cambia gamertag aquí).
 */
export async function updateUserProfile(partial: {
  displayName?: string;
  bio?: string;
  phone?: string;
  photoURL?: string | null;
}): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('No hay usuario autenticado');

  // Guardar en Firestore
  await usersCol().doc(user.uid).set(
    {
      ...partial,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Actualizar /publicProfiles también
  await publicProfilesCol().doc(user.uid).set(
    {
      displayName: partial.displayName,
      photoURL: partial.photoURL,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Sincronizar con Auth si aplica
  if (partial.displayName !== undefined || partial.photoURL !== undefined) {
    await user.updateProfile({
      displayName: partial.displayName ?? user.displayName ?? '',
      photoURL: (partial.photoURL ?? user.photoURL ?? null) as string | null,
    });
  }
}

/** Lee el perfil privado completo */
export async function getUserProfileByUid(uid: string): Promise<UserProfileDoc | null> {
  const snap = await usersCol().doc(uid).get();
  if (!snap.exists) return null;
  return { uid, ...(snap.data() as any) } as UserProfileDoc;
}

/** Perfil del usuario autenticado */
export async function getCurrentUserProfile(): Promise<UserProfileDoc | null> {
  const u = auth().currentUser;
  if (!u) return null;
  return getUserProfileByUid(u.uid);
}

/** Lee perfil público (para mostrar en Friends, chats, búsquedas) */
export async function getPublicProfileByUid(uid: string): Promise<PublicProfileDoc | null> {
  const snap = await publicProfilesCol().doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as PublicProfileDoc;
}
