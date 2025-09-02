// src/screens/ChatsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';

import { useAuth } from '../auth/AuthProvider';
import { useChats } from '../hooks/useChats';
import { useFriendUids } from '../hooks/useFriendUids';
import { ChatConfig } from '../services/chat/config';
import { fetchOrCreateOneToOne } from '../services/chat';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type UiRow = {
  id: string;                 // conversationId o 'temp:<uid>'
  otherId: string;            // uid del amigo
  lastMessage?: string | null;
  isNew?: boolean;            // true si aún no existe la conversación
};

export default function ChatsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const uid = user?.uid ?? auth().currentUser?.uid ?? null;

  // Conversaciones existentes
  const { items, loading } = useChats(uid);

  // UIDs de amigos aceptados (array) + lo convertimos a Set para búsquedas rápidas
  const { uids: friendUids, loading: friendsLoading } = useFriendUids(uid);
  const friendSet = React.useMemo(() => new Set(friendUids), [friendUids]);

  // Construir lista combinada: amigos -> (conversación existente o placeholder)
  const rows: UiRow[] = React.useMemo(() => {
    if (!uid) return [];
    const list: UiRow[] = [];

    const convByOther = new Map<string, { id: string; lastMessage?: string | null }>();
    (items || []).forEach((it) => {
      const other = (it?.members || []).find((m: string) => m !== uid);
      if (other) convByOther.set(other, { id: it.id, lastMessage: it.lastMessage ?? null });
    });

    friendUids.forEach((otherId) => {
      const existing = convByOther.get(otherId);
      if (existing) {
        list.push({
          id: existing.id,
          otherId,
          lastMessage: existing.lastMessage ?? null,
          isNew: false,
        });
      } else {
        list.push({
          id: `temp:${otherId}`,
          otherId,
          lastMessage: null,
          isNew: true,
        });
      }
    });

    // Orden: primero los que ya tienen conversación (por actividad se ordenan en useChats),
    // luego los nuevos; dentro del mismo grupo por uid para estabilidad.
    return list.sort((a, b) => {
      if (a.isNew && !b.isNew) return 1;
      if (!a.isNew && b.isNew) return -1;
      return a.otherId.localeCompare(b.otherId);
    });
  }, [uid, items, friendUids]);

  const openChat = async (row: UiRow) => {
    try {
      if (!uid) return;

      // Seguridad: debe ser amigo
      if (!friendSet.has(row.otherId)) {
        Alert.alert('Amigos', 'Solo puedes chatear con tus amigos aceptados.');
        return;
      }

      let conversationId = row.id;
      if (row.isNew) {
        conversationId = await fetchOrCreateOneToOne(uid, row.otherId);
      }

      const params: RootStackParamList['ChatRoom'] = {
        conversationId,
        otherId: row.otherId,
      };
      navigation.navigate('ChatRoom', params);
    } catch (e: any) {
      let msg = e?.message ?? 'No se pudo abrir el chat.';
      if (e?.code === 'permission-denied') {
        msg = 'Permiso denegado. Revisa las reglas de Firestore y que estés autenticado.';
      } else if (e?.code === 'failed-precondition') {
        msg = 'Falta un índice en Firestore (members + updatedAt). Créalo desde la consola.';
      }
      Alert.alert('Error', msg);
    }
  };

  if (loading || friendsLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ textAlign: 'center', color: '#64748b' }}>
          Inicia sesión para ver y crear chats.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={rows}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <ChatRow
            row={item}
            onPress={() => openChat(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#64748b' }}>
            Agrega amigos para comenzar a chatear.
          </Text>
        }
      />
    </View>
  );
}

function ChatRow({ row, onPress }: { row: UiRow; onPress: () => void }) {
  const [other, setOther] = React.useState<Awaited<ReturnType<typeof ChatConfig.getUserByUid>> | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const u = await ChatConfig.getUserByUid(row.otherId);
      if (alive) setOther(u);
    })();
    return () => { alive = false; };
  }, [row.otherId]);

  // Mostrar SIEMPRE el gamertag (@). Si por algo no lo hubiera, usa displayName.
  const title = other?.username ?? other?.displayName ?? '...';
  const subtitle = row.isNew ? 'Nuevo chat' : (row.lastMessage || '');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {other?.photoURL ? (
        <Image source={{ uri: other.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
      ) : (
        <Icon name="account-circle" size={40} color="#0082FA" />
      )}

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ fontWeight: '800', color: '#0F172A' }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ color: '#475569' }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <Icon name="chevron-right" size={24} color="#94a3b8" />
    </TouchableOpacity>
  );
}
