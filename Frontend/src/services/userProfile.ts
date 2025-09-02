// src/services/userProfile.ts
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { normalizeGamertag } from './usernames';

/** Compat: algunas versiones exponen snap.exists como boolean y otras como método */
function snapshotExists(snap: any): boolean {
  if (!snap) return false;
  if (typeof snap.exists === 'function') return !!snap.exists();
  return !!snap.exists;
}

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
  gamertag: string; // puede estar vacío si aún no se completó
  roles: string[];
  isProfileComplete: boolean;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

/** Shape del documento en /publicProfiles/{uid} */
export type PublicProfileDoc = {
  displayName?: string;
  photoURL?: string | null;
  /** gamertag normalizado (sin @) para UI pública */
  tag?: string | null;
  /** campo legacy para compatibilidad si alguna vista aún lo usa */
  gamertag?: string | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

/** Sincroniza /publicProfiles/{uid} desde /users/{uid} (fuente de verdad) */
export async function syncPublicProfileFromUser(uid: string) {
  if (!uid) return;

  const snap = await usersCol().doc(uid).get();
  const data = snapshotExists(snap) ? ((snap.data() as Partial<UserProfileDoc>) || {}) : {};

  const displayName = (data.displayName ?? '').toString();
  const photoURL = (data.photoURL ?? null) as string | null;
  const tag = data.gamertag ? normalizeGamertag(data.gamertag) : null;

  await publicProfilesCol().doc(uid).set(
    {
      displayName,
      photoURL,
      tag,            // recomendado para UI nueva
      gamertag: tag,  // compat con vistas antiguas
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Crea/actualiza el documento mínimo del usuario en /users/{uid}
 * y mantiene sincronizado /publicProfiles/{uid}.
 */
export async function upsertUserProfileMinimal(): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  const ref = usersCol().doc(user.uid);
  const snap = await ref.get();

  const provider = resolveProviderId(user.providerData);
  const email = (user.email ?? null) && user.email!.trim().toLowerCase();
  const displayName = user.displayName ?? '';
  const photoURL = user.photoURL ?? null;

  if (!snapshotExists(snap)) {
    // Crear doc mínimo
    await ref.set({
      uid: user.uid,
      email: email ?? null,
      displayName,
      photoURL,
      provider,
      phone: '',
      bio: '',
      gamertag: '', // aún sin reclamar
      roles: ['user'],
      isProfileComplete: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    const current = (snap.data() || {}) as Partial<UserProfileDoc>;
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

  // 🔄 Asegurar perfil público actualizado (displayName, photoURL, tag/gamertag)
  await syncPublicProfileFromUser(user.uid);
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

  // Guardar en Firestore (/users)
  await usersCol().doc(user.uid).set(
    {
      ...partial,
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

  // 🔄 Reflejar en /publicProfiles desde la fuente (/users)
  await syncPublicProfileFromUser(user.uid);
}

/** Lee el perfil privado completo */
export async function getUserProfileByUid(uid: string): Promise<UserProfileDoc | null> {
  const snap = await usersCol().doc(uid).get();
  if (!snapshotExists(snap)) return null;
  return { uid, ...(snap.data() as any) } as UserProfileDoc;
}

/** Perfil del usuario autenticado */
export async function getCurrentUserProfile(): Promise<UserProfileDoc | null> {
  const u = auth().currentUser;
  if (!u) return null;
  return getUserProfileByUid(u.uid);
}

/** Lee perfil público (para Friends, Chats, búsquedas/autocomplete) */
export async function getPublicProfileByUid(uid: string): Promise<PublicProfileDoc | null> {
  const snap = await publicProfilesCol().doc(uid).get();
  if (!snapshotExists(snap)) return null;
  return snap.data() as PublicProfileDoc;
}
