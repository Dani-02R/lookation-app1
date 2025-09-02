// src/screens/FriendsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useFriends } from '../hooks/useFriends';
import { sendFriendRequest, respondFriendRequest } from '../services/friends';
import { searchUsernames } from '../services/usernames';
import { fetchOrCreateOneToOne } from '../services/chat';
import { getPublicProfileByUid } from '../services/userProfile';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FriendsScreen() {
  const navigation = useNavigation<Nav>();
  const myUid = auth().currentUser?.uid ?? null;
  const { incoming, outgoing, friends, loading } = useFriends(myUid);

  // ==== búsqueda/autocompletar ====
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Array<{ tag: string; uid: string }>>([]);
  const [searching, setSearching] = React.useState(false);

  // uids para impedir duplicados (ya soy amigo o ya hay solicitud)
  const pendingOutgoingUids = React.useMemo(
    () => new Set(outgoing.map(r => r.to)),
    [outgoing]
  );
  const pendingIncomingUids = React.useMemo(
    () => new Set(incoming.map(r => r.from)),
    [incoming]
  );
  const friendUids = React.useMemo(() => {
    const s = new Set<string>();
    friends.forEach(r => {
      const other = r.members?.find?.(m => m !== myUid);
      if (other) s.add(other);
    });
    return s;
  }, [friends, myUid]);

  // Debounce simple de búsqueda
  React.useEffect(() => {
    const q = query.trim().replace(/^@/, '').toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const rows = await searchUsernames(q, 10);
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const sendReqTo = async (otherUid: string) => {
    try {
      if (!myUid) return Alert.alert('Sesión', 'Inicia sesión primero.');
      if (otherUid === myUid) return Alert.alert('Atención', 'No puedes agregarte a ti mismo.');
      if (friendUids.has(otherUid)) return Alert.alert('Info', 'Ya son amigos.');
      if (pendingOutgoingUids.has(otherUid)) return Alert.alert('Info', 'Solicitud ya enviada.');
      if (pendingIncomingUids.has(otherUid)) return Alert.alert('Info', 'Tienes una solicitud de esa persona.');

      await sendFriendRequest(myUid, otherUid);
      Alert.alert('Listo', 'Solicitud enviada.');
      setQuery('');
      setResults([]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar la solicitud.');
    }
  };

  const accept = async (id: string) => {
    try {
      await respondFriendRequest(id, true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo aceptar.');
    }
  };

  const reject = async (id: string) => {
    try {
      await respondFriendRequest(id, false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo rechazar.');
    }
  };

  const openChat = async (otherUid: string) => {
    try {
      if (!myUid) return;
      if (!friendUids.has(otherUid)) {
        Alert.alert('Amigos', 'Solo puedes chatear con tus amigos aceptados.');
        return;
      }
      const cid = await fetchOrCreateOneToOne(myUid, otherUid);
      const params: RootStackParamList['ChatRoom'] = { conversationId: cid, otherId: otherUid };
      navigation.navigate('ChatRoom', params);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo abrir el chat');
    }
  };

  // ==== fila de usuario (lee SIEMPRE desde /publicProfiles) ====
  const FriendRow = ({ otherUid, right }: { otherUid: string; right?: React.ReactNode }) => {
    const [other, setOther] = React.useState<{ displayName?: string; photoURL?: string | null; gamertag?: string | null } | null>(null);

    React.useEffect(() => {
      let alive = true;
      (async () => {
        try {
          const p = await getPublicProfileByUid(otherUid);
          if (alive) setOther(p ?? null);
        } catch {
          if (alive) setOther(null);
        }
      })();
      return () => { alive = false; };
    }, [otherUid]);

    const title = other?.displayName || (other?.gamertag ? `@${other.gamertag}` : 'Usuario');
    const handle = other?.gamertag ? `@${other.gamertag}` : null;

    return (
      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {other?.photoURL ? (
            <Image source={{ uri: other.photoURL }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
          ) : (
            <Icon name="account-circle" size={40} color="#0082FA" style={{ marginRight: 10 }} />
          )}
          <View>
            <Text style={{ fontWeight: '800', color: '#0f172a' }}>{title}</Text>
            {handle ? <Text style={{ color: '#64748b' }}>{handle}</Text> : null}
          </View>
        </View>
        {right}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!myUid) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: '#64748b', textAlign: 'center' }}>Inicia sesión para gestionar amigos.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* BUSCAR / AGREGAR */}
      <Text style={{ fontWeight: '800', fontSize: 16 }}>Agregar amigos</Text>
      <View
        style={{
          flexDirection: 'row',
          marginTop: 8,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 12,
          alignItems: 'center',
        }}
      >
        <Icon name="account-search-outline" size={20} color="#64748b" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="@usuario"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, paddingVertical: 10, marginLeft: 8 }}
        />
        {searching ? <ActivityIndicator /> : null}
      </View>

      {/* RESULTADOS */}
      {!!results.length && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#475569', marginBottom: 6 }}>Resultados</Text>
          {results.map((r) => {
            const disabled =
              !myUid ||
              r.uid === myUid ||
              friendUids.has(r.uid) ||
              pendingOutgoingUids.has(r.uid) ||
              pendingIncomingUids.has(r.uid);

            const label = friendUids.has(r.uid)
              ? 'Amigos'
              : pendingOutgoingUids.has(r.uid)
              ? 'Enviada'
              : pendingIncomingUids.has(r.uid)
              ? 'Te envió'
              : 'Agregar';

            return (
              <FriendRow
                key={r.uid}
                otherUid={r.uid}
                right={
                  <TouchableOpacity
                    onPress={() => !disabled && sendReqTo(r.uid)}
                    disabled={disabled}
                    style={{
                      backgroundColor: disabled ? '#94a3b8' : '#0082FA',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{label}</Text>
                  </TouchableOpacity>
                }
              />
            );
          })}
        </View>
      )}

      {/* SOLICITUDES ENTRANTES */}
      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 8 }}>Solicitudes</Text>
      <FlatList
        data={incoming}
        keyExtractor={(it) => it.id}
        ListEmptyComponent={<Text style={{ color: '#64748b', marginVertical: 8 }}>Sin solicitudes</Text>}
        renderItem={({ item }) => (
          <FriendRow
            otherUid={item.from}
            right={
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => accept(item.id)}
                  style={{ backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => reject(item.id)}
                  style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      />

      {/* ENVIADAS */}
      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 8 }}>Solicitudes enviadas</Text>
      <FlatList
        data={outgoing}
        keyExtractor={(it) => it.id}
        ListEmptyComponent={<Text style={{ color: '#64748b', marginVertical: 8 }}>No has enviado solicitudes</Text>}
        renderItem={({ item }) => (
          <FriendRow
            otherUid={item.to}
            right={<Text style={{ color: '#64748b' }}>Pendiente</Text>}
          />
        )}
      />

      {/* AMIGOS */}
      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 8 }}>Amigos</Text>
      <FlatList
        data={friends}
        keyExtractor={(it) => it.id}
        ListEmptyComponent={<Text style={{ color: '#64748b', marginVertical: 8 }}>Aún no tienes amigos</Text>}
        renderItem={({ item }) => {
          const otherId = item.members.find(m => m !== myUid)!;
          return (
            <FriendRow
              otherUid={otherId}
              right={
                <TouchableOpacity
                  onPress={() => openChat(otherId)}
                  style={{ backgroundColor: '#0082FA', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Mensaje</Text>
                </TouchableOpacity>
              }
            />
          );
        }}
      />
    </View>
  );
}
