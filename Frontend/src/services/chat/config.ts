// src/services/chat/config.ts
import { getUserProfileByUid, getPublicProfileByUid } from '../userProfile';
import { usernameToUid, uidToUsername, normalizeGamertag } from '../usernames';

export type UIUser = {
  uid: string;
  displayName: string;        // siempre algún valor
  photoURL?: string | null;
  username?: string | null;   // gamertag en formato @handle
};

// ===== Cache en memoria (por sesión de app) =====
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días
type CacheEntry = { ts: number; value: UIUser | null };
const memCache = new Map<string, CacheEntry>();

function getFromCache(uid: string): UIUser | null | undefined {
  const e = memCache.get(uid);
  if (!e) return undefined;
  if (Date.now() - e.ts > CACHE_TTL_MS) {
    memCache.delete(uid);
    return undefined;
  }
  return e.value;
}
function putInCache(uid: string, value: UIUser | null) {
  memCache.set(uid, { ts: Date.now(), value });
}

// Implementación real (sin cache) para un solo usuario
async function fetchUserByUid(uid: string): Promise<UIUser | null> {
  if (!uid) return null;

  // --- 1) Intentar perfil público ---
  const pub = await getPublicProfileByUid(uid);
  if (pub) {
    const normTag = pub.gamertag ? normalizeGamertag(pub.gamertag) : null;
    return {
      uid,
      displayName:
        (pub.displayName?.trim() || '') ||
        (normTag ? `@${normTag}` : 'Usuario'),
      photoURL: pub.photoURL ?? null,
      username: normTag ? `@${normTag}` : null,
    };
  }

  // --- 2) Fallback a perfil privado (/users) ---
  const p = await getUserProfileByUid(uid);
  if (p) {
    const normTag =
      p.gamertag ? normalizeGamertag(p.gamertag) : (await uidToUsername(uid));
    return {
      uid,
      displayName:
        (p.displayName?.trim() || '') ||
        (normTag ? `@${normTag}` : '') ||
        (p.email?.trim() || 'Usuario'),
      photoURL: p.photoURL ?? null,
      username: normTag ? `@${normTag}` : null,
    };
  }

  // --- 3) Último recurso: solo mapping username ---
  const uname = await uidToUsername(uid);
  if (uname) {
    const norm = normalizeGamertag(uname);
    return {
      uid,
      displayName: `@${norm}`,
      photoURL: null,
      username: `@${norm}`,
    };
  }

  // --- 4) Nada encontrado ---
  return {
    uid,
    displayName: 'Usuario',
    photoURL: null,
    username: null,
  };
}

export const ChatConfig = {
  conversationsCollection: 'conversations',
  messagesSubcollection: 'messages',

  /** Obtiene el perfil de un usuario (con cache en memoria + TTL). */
  getUserByUid: async (uid: string): Promise<UIUser | null> => {
    // 1) cache fresco
    const cached = getFromCache(uid);
    if (cached !== undefined) return cached;

    // 2) red
    const user = await fetchUserByUid(uid);

    // 3) guardar cache (incluye null para evitar reintentos infinitos)
    putInCache(uid, user);
    return user;
  },

  /**
   * Obtiene múltiples perfiles por uid.
   * - Deduplica
   * - Sirve primero desde cache
   * - Solo va a red por los que falten/estén vencidos
   * - Concurrencia limitada para no saturar IO
   */
  getManyUsersByUid: async (uids: string[]): Promise<Record<string, UIUser | null>> => {
    const unique = Array.from(new Set((uids || []).filter(Boolean)));
    if (!unique.length) return {};

    const out: Record<string, UIUser | null> = {};
    const needNetwork: string[] = [];

    // 1) Resolver desde cache
    for (const u of unique) {
      const cached = getFromCache(u);
      if (cached !== undefined) {
        out[u] = cached;
      } else {
        needNetwork.push(u);
      }
    }

    if (!needNetwork.length) return out;

    // 2) Red con concurrencia limitada
    const CONCURRENCY = 12;
    for (let i = 0; i < needNetwork.length; i += CONCURRENCY) {
      const slice = needNetwork.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        slice.map(async (u) => {
          try {
            const user = await fetchUserByUid(u);
            return [u, user] as const;
          } catch {
            return [u, null] as const;
          }
        })
      );
      results.forEach(([u, user]) => {
        putInCache(u, user); // guarda cache (incluye null)
        out[u] = user;
      });
    }

    return out;
  },

  /** Resolución rápida de username -> uid */
  usernameToUid,

  /** Utilidades opcionales de mantenimiento del cache */
  _cache: {
    get size() { return memCache.size; },
    invalidate(uid: string) { memCache.delete(uid); },
    clear() { memCache.clear(); },
    prime(dict: Record<string, UIUser | null>) {
      const ts = Date.now();
      Object.entries(dict || {}).forEach(([u, v]) => memCache.set(u, { ts, value: v }));
    },
  },
} as const;
