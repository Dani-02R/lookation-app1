// src/hooks/useFriends.ts
import { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import {
  listenIncoming,
  listenOutgoing,
  listenAccepted,
  type FriendDoc,
  sendFriendRequest,
} from '../services/friends';
import { usernameToUid } from '../services/usernames';

export function useFriends(uid?: string | null) {
  const [incoming, setIncoming] = useState<FriendDoc[]>([]);
  const [outgoing, setOutgoing] = useState<FriendDoc[]>([]);
  const [friends, setFriends] = useState<FriendDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIncoming([]); setOutgoing([]); setFriends([]); setLoading(false);
      return;
    }
    setLoading(true);
    const a = listenIncoming(uid, setIncoming);
    const b = listenOutgoing(uid, setOutgoing);
    const c = listenAccepted(uid, setFriends);
    return () => { a(); b(); c(); };
  }, [uid]);

  useEffect(() => {
    if (uid !== undefined) setLoading(false);
  }, [incoming, outgoing, friends, uid]);

  return { incoming, outgoing, friends, loading };
}

// helper opcional: enviar solicitud por @gamertag
export async function addFriendByGamertag(handle: string) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('No hay sesión');
  const tag = handle.trim().replace(/^@/, '').toLowerCase();
  if (!tag) throw new Error('Gamertag vacío');
  const other = await usernameToUid(tag);
  if (!other) throw new Error('Usuario no encontrado');
  if (other === me) throw new Error('No puedes agregarte a ti mismo');
  return sendFriendRequest(me, other);
}
