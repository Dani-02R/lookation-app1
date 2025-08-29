// src/services/usernames.ts
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

/** Normaliza el gamertag para unicidad */
function normalizeGamertag(raw: string) {
  let g = (raw || '').trim().toLowerCase();
  g = g.replace(/\s+/g, '_');           // espacios -> _
  g = g.replace(/[^a-z0-9._-]/g, '');   // solo a-z 0-9 . _ -
  if (g.length > 20) g = g.slice(0, 20);
  return g;
}

/** Compat: algunas versiones tienen .exists como método y otras como boolean */
function snapshotExists(snap: any): boolean {
  return typeof snap?.exists === 'function' ? !!snap.exists() : !!snap?.exists;
}

/** FieldValue tipado para evitar warnings en TS */
const serverTs = firestore.FieldValue.serverTimestamp() as FirebaseFirestoreTypes.FieldValue;

/** Payload público para completar perfil */
export type CompleteProfilePayload = {
  displayName: string;
  gamertag: string;
  phone?: string;
  bio?: string;
};

/**
 * Reclama un gamertag único y completa el perfil del usuario.
 * Guarda displayName, gamertag, isProfileComplete=true y (opcional) phone/bio.
 */
export async function claimGamertagAndCompleteProfile(
  { displayName, gamertag, phone, bio }: CompleteProfilePayload
): Promise<{ uid: string; gamertag: string }> {
  const db = firestore();

  const user = auth().currentUser as FirebaseAuthTypes.User | null;
  if (!user) throw new Error('No hay usuario autenticado');
  const uid = user.uid;

  const name = (displayName || '').trim();
  if (!name) throw new Error('El nombre es obligatorio');

  const normalized = normalizeGamertag(gamertag);
  if (!normalized || normalized.length < 3) {
    throw new Error('El gamertag debe tener al menos 3 caracteres válidos');
  }

  const usernameRef = db.collection('usernames').doc(normalized);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const usernameSnap: FirebaseFirestoreTypes.DocumentSnapshot = await tx.get(usernameRef);
    const owner = (usernameSnap.data() as { uid?: string } | undefined)?.uid;

    // Si ya existe y pertenece a otro UID -> no disponible
    if (snapshotExists(usernameSnap) && owner && owner !== uid) {
      throw new Error('Gamertag no disponible. Prueba otro.');
    }

    // Si no existe, reservarlo
    if (!snapshotExists(usernameSnap)) {
      tx.set(usernameRef, {
        uid,
        createdAt: serverTs,
      });
    }

    // Campos opcionales
    const extra: Record<string, any> = {};
    if (typeof phone === 'string') extra.phone = phone;
    if (typeof bio === 'string') extra.bio = bio;

    // Completar/actualizar perfil
    tx.set(
      userRef,
      {
        displayName: name,
        gamertag: normalized,
        isProfileComplete: true,
        updatedAt: serverTs,
        ...extra,
      },
      { merge: true }
    );
  });

  // Mantener displayName en Auth (best-effort)
  try {
    if (user.displayName !== name) {
      await user.updateProfile({ displayName: name });
    }
  } catch {}

  return { uid, gamertag: normalized };
}

/** Chequeo rápido de disponibilidad para la UI */
export async function isGamertagAvailable(raw: string) {
  const tag = normalizeGamertag(raw);
  if (!tag) return false;
  const doc = await firestore().collection('usernames').doc(tag).get();
  return !snapshotExists(doc);
}
