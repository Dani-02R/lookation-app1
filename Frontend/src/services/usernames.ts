// src/services/usernames.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type UsernameDoc = { uid: string; createdAt?: any };

/** Compatible con ambos estilos de SDK: snap.exists() (método) o snap.exists (propiedad) */
function snapExists(snap: any): boolean {
  const ex = (snap as any).exists;
  return typeof ex === 'function' ? ex.call(snap) : !!ex;
}

/**
 * Normaliza el gamertag: minúsculas, quita espacios a _, permite a-z 0-9 . _ -
 * y recorta a 3–20 caracteres (ajusta si quieres otros límites).
 */
function normalizeGamertag(raw: string) {
  let g = (raw || '').trim().toLowerCase();
  g = g.replace(/\s+/g, '_');           // espacios -> _
  g = g.replace(/[^a-z0-9._-]/g, '');   // solo caracteres permitidos
  if (g.length > 20) g = g.slice(0, 20);
  return g;
}

/**
 * Reclama (reserva) un gamertag único y completa el perfil del usuario.
 * - Crea/usa /usernames/{gamertag} para garantizar unicidad
 * - Actualiza /users/{uid} con displayName + gamertag + isProfileComplete
 * - Sincroniza displayName en Firebase Auth
 */
export async function claimGamertagAndCompleteProfile(
  { displayName, gamertag }: { displayName: string; gamertag: string }
): Promise<{ uid: string; gamertag: string }> {
  const db = firestore();
  const user = auth().currentUser;
  if (!user) throw new Error('No hay usuario autenticado');

  const uid = user.uid;

  // Validaciones mínimas
  const name = (displayName || '').trim();
  if (!name) throw new Error('El nombre es obligatorio');

  const normalized = normalizeGamertag(gamertag);
  if (!normalized || normalized.length < 3) {
    throw new Error('El gamertag debe tener al menos 3 caracteres válidos');
  }

  const usernameRef = db.collection('usernames').doc(normalized);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const usernameSnap = await tx.get(usernameRef);

    const exists = snapExists(usernameSnap);
    const owner = (usernameSnap.data() as UsernameDoc | undefined)?.uid;

    // Si existe y pertenece a otro UID -> no disponible
    if (exists && owner !== undefined && owner !== uid) {
      throw new Error('Gamertag no disponible. Prueba otro.');
    }

    // Si no existe, reservarlo
    if (!exists) {
      tx.set(usernameRef, {
        uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      } as UsernameDoc);
    }

    // Completar/actualizar perfil del usuario
    tx.set(
      userRef,
      {
        displayName: name,
        gamertag: normalized,
        isProfileComplete: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  // Mantener Auth en sync (nombre visible dentro del SDK)
  try {
    if (user.displayName !== name) {
      await user.updateProfile({ displayName: name });
    }
  } catch {
    // no romper flujo si falla esto
  }

  return { uid, gamertag: normalized };
}

/** (Opcional) Chequear disponibilidad rápida en UI */
export async function isGamertagAvailable(raw: string): Promise<boolean> {
  const tag = normalizeGamertag(raw);
  if (!tag) return false;
  const doc = await firestore().collection('usernames').doc(tag).get();
  return !snapExists(doc);
}
