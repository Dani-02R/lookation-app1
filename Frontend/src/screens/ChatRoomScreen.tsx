import React, { useCallback, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../auth/AuthProvider';
import { useMessages } from '../hooks/useMessages';
import { sendMessage } from '../services/chat';
import MessageBubble from '../components/MessageBubble';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen({ route }: Props) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const { msgs, loadMore, hasMore } = useMessages(conversationId);
  const [text, setText] = useState('');

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !user?.uid) return;
    setText('');
    await sendMessage(conversationId, user.uid, t);
  }, [text, user?.uid, conversationId]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
        <FlatList
          data={[...msgs].reverse()} // mostramos ascendente (antiguo -> nuevo)
          keyExtractor={(m) => m.id}
          onEndReachedThreshold={0.2}
          onEndReached={() => hasMore && loadMore()}
          renderItem={({ item }) => (
            <MessageBubble text={item.text} isOwn={item.senderId === user?.uid} />
          )}
          ListFooterComponent={
            hasMore ? (
              <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 8 }}>
                Cargar más…
              </Text>
            ) : null
          }
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 8,
          borderTopWidth: 1,
          borderColor: '#e5e7eb',
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje"
          style={{ flex: 1, padding: 12 }}
          multiline
        />
        <TouchableOpacity onPress={onSend} style={{ padding: 8 }} disabled={!text.trim()}>
          <Icon name="send" size={24} color={text.trim() ? '#0082FA' : '#94a3b8'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
