// src/services/usernames.ts
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

/** Normaliza el gamertag para unicidad (sin @) */
export function normalizeGamertag(raw: string) {
  let g = (raw || '').trim().toLowerCase();
  g = g.replace(/^@+/, '');            // quita @ inicial si la hay
  g = g.replace(/\s+/g, '_');          // espacios -> _
  g = g.replace(/[^a-z0-9._-]/g, '');  // solo a-z 0-9 . _ -
  if (g.length > 20) g = g.slice(0, 20);
  return g;
}

/** Compat: algunas versiones tienen .exists como método y otras como boolean */
function snapshotExists(snap: any): boolean {
  return typeof snap?.exists === 'function' ? !!snap.exists() : !!snap?.exists;
}

/** FieldValue tipado */
const serverTs = firestore.FieldValue.serverTimestamp() as FirebaseFirestoreTypes.FieldValue;

/** Colecciones */
const colUsernames = () => firestore().collection('usernames');
const colUsers = () => firestore().collection('users');
const colPublic = () => firestore().collection('publicProfiles');

export type CompleteProfilePayload = {
  displayName: string;
  gamertag: string;
  phone?: string;
  bio?: string;
};

/**
 * Reclama un gamertag único y completa el perfil del usuario.
 * Sincroniza también /publicProfiles/{uid} con:
 *  - displayName
 *  - photoURL
 *  - tag (gamertag normalizado, sin @)
 *  - gamertag (campo legacy para compat)
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

  const usernameRef = colUsernames().doc(normalized);
  const userRef = colUsers().doc(uid);
  const publicRef = colPublic().doc(uid);

  await db.runTransaction(async (tx) => {
    const usernameSnap: FirebaseFirestoreTypes.DocumentSnapshot = await tx.get(usernameRef);
    const owner = (usernameSnap.data() as { uid?: string } | undefined)?.uid;

    if (snapshotExists(usernameSnap) && owner && owner !== uid) {
      throw new Error('Gamertag no disponible. Prueba otro.');
    }

    if (!snapshotExists(usernameSnap)) {
      tx.set(usernameRef, { uid, createdAt: serverTs });
    }

    const extra: Record<string, any> = {};
    if (typeof phone === 'string') extra.phone = phone;
    if (typeof bio === 'string') extra.bio = bio;

    // /users
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

    // /publicProfiles
    tx.set(
      publicRef,
      {
        displayName: name,
        photoURL: user.photoURL ?? null,
        tag: normalized,       // recomendado para UI
        gamertag: normalized,  // compat con vistas antiguas
        updatedAt: serverTs,
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

/** Chequeo rápido de disponibilidad */
export async function isGamertagAvailable(raw: string, opts?: { allowCurrentUser?: boolean }) {
  const tag = normalizeGamertag(raw);
  if (!tag) return false;

  const doc = await colUsernames().doc(tag).get();
  if (!snapshotExists(doc)) return true;

  const owner = (doc.data() as { uid?: string } | undefined)?.uid ?? null;
  const currentUid = auth().currentUser?.uid ?? null;

  if (opts?.allowCurrentUser && owner && currentUid && owner === currentUid) return true;
  return false;
}

/** username -> uid */
export async function usernameToUid(raw: string): Promise<string | null> {
  const tag = normalizeGamertag(raw);
  if (!tag) return null;
  const doc = await colUsernames().doc(tag).get();
  if (!snapshotExists(doc)) return null;
  return ((doc.data() as { uid?: string } | undefined)?.uid) ?? null;
}

/**
 * uid -> username (gamertag normalizado).
 * Prioriza /publicProfiles.tag (siempre legible) y si no existe, cae a /users.gamertag.
 */
export async function uidToUsername(uid: string): Promise<string | null> {
  if (!uid) return null;

  // 1) Intentar perfil público
  const pub = await colPublic().doc(uid).get();
  if (snapshotExists(pub)) {
    const tag = (pub.data() as any)?.tag ?? (pub.data() as any)?.gamertag ?? null;
    if (tag) return normalizeGamertag(tag as string);
  }

  // 2) Fallback a perfil privado (puede fallar por reglas si no es amigo)
  const snap = await colUsers().doc(uid).get();
  if (snapshotExists(snap)) {
    const data = snap.data() as { gamertag?: string } | undefined;
    if (data?.gamertag) return normalizeGamertag(data.gamertag);
  }

  return null;
}

/**
 * Cambiar gamertag preservando unicidad y sincronizando /publicProfiles.
 */
export async function updateGamertag(newTagRaw: string): Promise<string> {
  const user = auth().currentUser;
  if (!user) throw new Error('No hay usuario autenticado');
  const uid = user.uid;

  const newTag = normalizeGamertag(newTagRaw);
  if (!newTag || newTag.length < 3) throw new Error('El gamertag debe tener al menos 3 caracteres válidos');

  const db = firestore();
  const userRef = colUsers().doc(uid);
  const newRef = colUsernames().doc(newTag);
  const publicRef = colPublic().doc(uid);

  await db.runTransaction(async (tx) => {
    // Leer perfil para conocer el gamertag actual
    const userSnap = await tx.get(userRef);
    if (!snapshotExists(userSnap)) throw new Error('Perfil no encontrado');
    const current = (userSnap.data() || {}) as { gamertag?: string };
    const oldTag = current.gamertag ? normalizeGamertag(current.gamertag) : null;

    // Verificar disponibilidad del nuevo
    const newSnap = await tx.get(newRef);
    const newOwner = (newSnap.data() as { uid?: string } | undefined)?.uid;
    if (snapshotExists(newSnap) && newOwner && newOwner !== uid) {
      throw new Error('Ese gamertag ya está en uso');
    }

    // Reservar nuevo si no existe
    if (!snapshotExists(newSnap)) {
      tx.set(newRef, { uid, createdAt: serverTs });
    } else if (newOwner !== uid) {
      throw new Error('Ese gamertag ya está en uso');
    }

    // Actualizar user doc
    tx.set(userRef, { gamertag: newTag, updatedAt: serverTs }, { merge: true });

    // Actualizar perfil público
    tx.set(publicRef, { tag: newTag, gamertag: newTag, updatedAt: serverTs }, { merge: true });

    // Eliminar antiguo mapping si existía y es distinto
    if (oldTag && oldTag !== newTag) {
      tx.delete(colUsernames().doc(oldTag));
    }
  });

  return newTag;
}

/* =========================
 * Helpers para "Agregar amigos" y búsquedas
 * ========================= */

/**
 * Autocompletar usernames por prefijo (usa documentId()).
 * Devuelve pares {tag, uid} para que luego consultes el perfil público por uid.
 */
export async function searchUsernames(prefixRaw: string, limit = 10): Promise<Array<{ tag: string; uid: string }>> {
  const prefix = normalizeGamertag(prefixRaw);
  if (!prefix) return [];

  const fp = firestore.FieldPath.documentId();
  const q = await colUsernames()
    .orderBy(fp)
    .startAt(prefix)
    .endAt(prefix + '\uf8ff')
    .limit(limit)
    .get();

  return q.docs.map(d => ({ tag: d.id, uid: (d.data() as any).uid as string }));
}

/**
 * Obtener perfil público por gamertag desde /publicProfiles (si existe).
 * Si no hubiera doc público aún, retorna al menos el uid resuelto.
 */
export async function getPublicProfileByGamertag(raw: string): Promise<{
  uid: string;
  tag: string | null;        // normalizado (sin @)
  gamertag?: string | null;  // compat
  displayName?: string;
  photoURL?: string | null;
} | null> {
  const uid = await usernameToUid(raw);
  if (!uid) return null;

  const snap = await colPublic().doc(uid).get();
  if (!snapshotExists(snap)) {
    // no hay perfil público aún, devolvemos lo básico
    return {
      uid,
      tag: normalizeGamertag(raw),
      gamertag: normalizeGamertag(raw),
      displayName: undefined,
      photoURL: null,
    };
  }

  const data = snap.data() as any;
  const tag = data?.tag ?? data?.gamertag ?? null;
  return {
    uid,
    tag: tag ? normalizeGamertag(tag) : null,
    gamertag: tag ? normalizeGamertag(tag) : null,
    displayName: data?.displayName ?? undefined,
    photoURL: data?.photoURL ?? null,
  };
}
