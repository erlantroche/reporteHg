import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RAG_MOCK_ANSWERS } from '../data/mocks';

export default function ChatScreen() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    {
      sender: 'bot',
      text: 'Hola, pregúntame sobre prevención ante mercurio, quema de amalgama o precauciones en zonas ribereñas.',
    },
  ]);

  const sendQuestion = () => {
    const q = question.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const reply = lower.includes('quema') || lower.includes('amalgama')
      ? RAG_MOCK_ANSWERS.quema
      : lower.includes('pescado') || lower.includes('consum')
      ? RAG_MOCK_ANSWERS.pescado
      : RAG_MOCK_ANSWERS.default;

    setMessages((prev) => [...prev, { sender: 'user', text: q }, { sender: 'bot', text: reply }]);
    setQuestion('');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.chatBox}>
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={m.sender === 'user' ? styles.userText : styles.botText}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Escribe tu consulta..."
          value={question}
          onChangeText={setQuestion}
        />
        <Pressable style={styles.sendBtn} onPress={sendQuestion}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  chatBox: { gap: 10, paddingBottom: 12 },
  bubble: { padding: 12, borderRadius: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#e5e7eb' },
  userText: { color: '#ffffff' },
  botText: { color: '#111827' },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#ffffff' },
  sendBtn: { backgroundColor: '#111827', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  sendText: { color: '#ffffff', fontWeight: '700' },
});
