// src/services/friends.ts
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

const friendsCol = firestore().collection('friends');
const now = () => firestore.FieldValue.serverTimestamp();

export type FriendDoc = {
  id: string;
  from: string;
  to: string;
  members: string[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
};

export function friendDocId(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `${x}__${y}`;
}

export async function sendFriendRequest(from: string, to: string) {
  const id = friendDocId(from, to);
  const members = [from, to].sort();
  await friendsCol.doc(id).set(
    {
      from,
      to,
      members,
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    },
    { merge: true }
  );
  return id;
}

export async function respondFriendRequest(id: string, accept: boolean) {
  await friendsCol.doc(id).update({
    status: accept ? 'accepted' : 'rejected',
    updatedAt: now(),
  });
}

/** Util para mostrar el motivo real (índice/reglas) */
function handleSnapshotError(prefix: string) {
  return (err: any) => {
    console.warn(`[friends][${prefix}]`, err?.code, err?.message);
    // Muchos errores de índice traen un URL para "Create index…"
    const msg = `${String(err?.code ?? 'error')} - ${String(err?.message ?? '')}`;
    Alert.alert('Firestore', msg); // verás el link si es failed-precondition
  };
}

/** Entrantes: to==uid AND status==pending  (requiere índice compuesto) */
export function listenIncoming(uid: string, cb: (rows: FriendDoc[]) => void) {
  return friendsCol
    .where('to', '==', uid)
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        const rows = (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() as any) })) as FriendDoc[];
        cb(rows);
      },
      handleSnapshotError('incoming')
    );
}

/** Salientes: from==uid AND status==pending  (requiere índice compuesto) */
export function listenOutgoing(uid: string, cb: (rows: FriendDoc[]) => void) {
  return friendsCol
    .where('from', '==', uid)
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        const rows = (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() as any) })) as FriendDoc[];
        cb(rows);
      },
      handleSnapshotError('outgoing')
    );
}

/** Aceptados: members array-contains uid AND status==accepted  (índice compuesto) */
export function listenAccepted(uid: string, cb: (rows: FriendDoc[]) => void) {
  return friendsCol
    .where('members', 'array-contains', uid)
    .where('status', '==', 'accepted')
    .onSnapshot(
      (snap) => {
        const rows = (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() as any) })) as FriendDoc[];
        cb(rows);
      },
      handleSnapshotError('accepted')
    );
}
