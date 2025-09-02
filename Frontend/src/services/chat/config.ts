// src/services/chat/config.ts
import { getUserProfileByUid, getPublicProfileByUid } from '../userProfile';
import { usernameToUid, uidToUsername, normalizeGamertag } from '../usernames';

export type UIUser = {
  uid: string;
  displayName: string;        // siempre algún valor
  photoURL?: string | null;
  username?: string | null;   // gamertag en formato @handle
};

export const ChatConfig = {
  conversationsCollection: 'conversations',
  messagesSubcollection: 'messages',

  /** Obtiene el perfil de un usuario en formato uniforme para la UI */
  getUserByUid: async (uid: string): Promise<UIUser | null> => {
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
  },

  /** Resolución rápida de username -> uid */
  usernameToUid,
};
