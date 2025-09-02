import React from 'react';
import { View, Text } from 'react-native';

export default function MessageBubble({ text, isOwn }: { text: string; isOwn: boolean }) {
  return (
    <View style={{
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
      backgroundColor: isOwn ? '#0082FA' : '#E6F0FF',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginVertical: 4,
      maxWidth: '78%'
    }}>
      <Text style={{ color: isOwn ? '#fff' : '#0F172A' }}>{text}</Text>
    </View>
  );
}
