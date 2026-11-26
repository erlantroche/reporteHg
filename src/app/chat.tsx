import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FaqList, FaqSource } from '../components/eco/FaqList';
import { IMAGES } from '../components/eco/ui';
import { Float, Reveal } from '../components/motion/Reveal';
import { accent, ink, layout, line, radius, shadow, space, statusTone, surface, type } from '../constants/hg-theme';
import { useReports } from '../context/ReportsContext';
import { FAQ, faqById, FaqItem, relatedFaq, searchFaq } from '../data/faq';
import { RAG_MOCK_ANSWERS } from '../data/mocks';

type Message = {
  sender: 'user' | 'bot';
  text: string;
  /** Respuesta tomada de las preguntas frecuentes verificadas. */
  faqId?: number;
  /** Preguntas sugeridas para seguir. */
  suggestIds?: number[];
};

const FILL = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;
const QUICK_IDS = [1, 8, 17, 26, 12];
/** Panel lateral de preguntas solo en pantallas anchas (la barra de navegación ya ocupa 220 px). */
const WIDE = 1280;

/** Respuesta de demostración del RAG en línea (se usa si no hay pregunta frecuente que coincida). */
function getOnlineReply(q: string): string {
  const lower = q.toLowerCase();
  return lower.includes('quema') || lower.includes('amalgama')
    ? RAG_MOCK_ANSWERS.quema
    : lower.includes('pescado') || lower.includes('consum')
    ? RAG_MOCK_ANSWERS.pescado
    : RAG_MOCK_ANSWERS.default;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const params = useLocalSearchParams<{ faq?: string }>();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { isOnline } = useReports();
  const [question, setQuestion] = useState('');
  const [faqOpen, setFaqOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: `Hola, pregúntame sobre el mercurio: qué pescado comer, síntomas, cómo usar la retorta o qué hacer con el agua. Tengo ${FAQ.length} respuestas verificadas que funcionan incluso sin internet.`,
      suggestIds: QUICK_IDS.slice(0, 3),
    },
  ]);

  const answer = (q: string, forcedFaq?: FaqItem) => {
    const best = forcedFaq ?? searchFaq(q, 1)[0]?.item;
    if (best) {
      return { sender: 'bot' as const, text: best.respuesta, faqId: best.id, suggestIds: relatedFaq(best, 2).map((f) => f.id) };
    }
    if (isOnline) {
      return { sender: 'bot' as const, text: getOnlineReply(q), suggestIds: QUICK_IDS.slice(0, 2) };
    }
    return {
      sender: 'bot' as const,
      text: 'Sin señal solo puedo responder las preguntas frecuentes guardadas en tu celular. Prueba con una de estas o abre la lista completa:',
      suggestIds: QUICK_IDS.slice(0, 3),
    };
  };

  const sendQuestion = (preset?: string, forcedFaq?: FaqItem) => {
    const q = (preset ?? question).trim();
    if (!q) return;
    setMessages((prev) => [...prev, { sender: 'user', text: q }, answer(q, forcedFaq)]);
    setQuestion('');
  };

  const askFaq = (item: FaqItem) => {
    setFaqOpen(false);
    sendQuestion(item.pregunta, item);
  };

  // Llegar desde otra pantalla con ?faq=ID (p. ej. "Preguntar al asistente" en el mapa).
  useEffect(() => {
    const id = Number(params.faq);
    const item = id ? faqById(id) : undefined;
    if (item) askFaq(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.faq]);

  const canSend = question.trim().length > 0;

  const chat = (
    <View style={[styles.chatCol, wide && styles.chatColWide]}>
      <Reveal from="blur" duration={1000}>
        <View style={[styles.heroCard, shadow.float]}>
          <Image source={IMAGES.forestCard} resizeMode="cover" style={FILL} />
          <View style={styles.heroDim} />
          <Float style={styles.heroDeco} amplitude={6} period={4600}>
            <View style={styles.heroDisc} />
          </Float>
          <View style={styles.heroContent}>
            <View style={styles.heroAvatar}>
              <Ionicons name="sparkles" size={20} color={accent.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroTitle}>Asistente ReporteHg</Text>
              <Text style={styles.heroText}>Respuestas verificadas sobre mercurio, pescado, salud y minería.</Text>
            </View>
            {!wide ? (
              <Pressable onPress={() => setFaqOpen(true)} style={({ pressed }) => [styles.faqBtn, pressed && styles.pressed]}>
                <Ionicons name="list" size={14} color={ink.onLime} />
                <Text style={styles.faqBtnText}>FAQ</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Reveal>

      <View style={[styles.statusRow, !isOnline && styles.statusRowOffline]}>
        <Ionicons
          name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={15}
          color={isOnline ? statusTone.sincronizado.text : statusTone.pendiente.text}
        />
        <Text style={styles.statusText}>
          {isOnline
            ? 'Con señal: preguntas frecuentes + asistente en línea (demo RAG).'
            : 'Sin señal: respondo con las preguntas frecuentes guardadas en tu celular.'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.chatBox}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, idx) => {
          if (m.sender === 'user') {
            return (
              <Reveal key={idx} from="right" distance={18} duration={500} style={styles.userWrap}>
                <View style={[styles.bubble, styles.userBubble]}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              </Reveal>
            );
          }
          const faq = m.faqId ? faqById(m.faqId) : undefined;
          return (
            <Reveal key={idx} from="left" distance={18} duration={600} delay={idx === 0 ? 400 : 250} style={styles.botRow}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={14} color={ink.onSolid} />
              </View>
              <View style={styles.botColumn}>
                <Text style={styles.senderLabel}>{faq ? 'Respuesta verificada' : 'Asistente ReporteHg'}</Text>
                <View style={[styles.bubble, styles.botBubble]}>
                  {faq ? <Text style={styles.faqQuestion}>{faq.pregunta}</Text> : null}
                  <Text style={styles.botText}>{m.text}</Text>
                  {faq ? <FaqSource item={faq} /> : null}
                </View>
                {m.suggestIds?.length ? (
                  <View style={styles.followUps}>
                    {m.suggestIds.map((id) => {
                      const s = faqById(id);
                      if (!s) return null;
                      return (
                        <Pressable key={id} onPress={() => askFaq(s)} style={({ pressed }) => [styles.followUp, pressed && styles.pressed]}>
                          <Ionicons name="return-down-forward" size={13} color={accent.primary} />
                          <Text style={styles.followUpText}>{s.pregunta}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </Reveal>
          );
        })}
        <Text style={styles.disclaimer}>Información orientativa. Ante síntomas, acude al centro de salud.</Text>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionsScroll}
        contentContainerStyle={styles.suggestions}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_IDS.map((id) => {
          const s = faqById(id);
          if (!s) return null;
          return (
            <Pressable key={id} onPress={() => askFaq(s)} style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}>
              <Text style={styles.suggestionText}>{s.pregunta}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={isOnline ? 'Escribe tu consulta...' : 'Pregunta (sin señal: respuestas guardadas)'}
          placeholderTextColor={ink.tertiary}
          selectionColor={accent.primary}
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={() => sendQuestion()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          onPress={() => sendQuestion()}
          disabled={!canSend}
          style={({ pressed }) => [styles.sendBtn, !canSend && styles.sendBtnDisabled, pressed && canSend && styles.sendBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Enviar consulta"
        >
          <Ionicons name="arrow-up" size={20} color={canSend ? ink.onSolid : ink.tertiary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      {wide ? (
        <View style={styles.wideRow}>
          {chat}
          <View style={styles.faqPanel}>
            <ScrollView contentContainerStyle={styles.faqPanelContent}>
              <Text style={styles.faqTitle}>
                Preguntas frecuentes{'\n'}
                <Text style={styles.faqTitleHighlight}>respuestas verificadas</Text>
              </Text>
              <Text style={styles.faqSubtitle}>{FAQ.length} respuestas basadas en estudios, la OMS y guías mineras. Funcionan sin internet.</Text>
              <FaqList onAsk={askFaq} askLabel="Preguntar en el chat" />
            </ScrollView>
          </View>
        </View>
      ) : (
        chat
      )}

      <Modal visible={faqOpen} animationType="slide" transparent onRequestClose={() => setFaqOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.s16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Preguntas frecuentes</Text>
              <Pressable onPress={() => setFaqOpen(false)} hitSlop={10} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={22} color={ink.body} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <FaqList onAsk={askFaq} askLabel="Preguntar en el chat" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.floor },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  chatCol: { flex: 1, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  chatColWide: { width: undefined, alignSelf: 'stretch', minWidth: 0 },
  wideRow: { flex: 1, flexDirection: 'row', gap: space.s24, paddingHorizontal: space.s24 },
  faqPanel: { width: 420, flexShrink: 0, paddingTop: space.s12 },
  faqPanelContent: { gap: space.s12, paddingBottom: space.s40 },
  faqTitle: { ...type.headingSm, color: ink.heading },
  faqTitleHighlight: { color: accent.primary },
  faqSubtitle: { ...type.bodySm, fontSize: 13, color: ink.secondary, marginBottom: space.s8 },

  heroCard: { marginHorizontal: space.s16, marginTop: space.s12, height: 120, borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#14261A' },
  heroDim: { ...FILL, backgroundColor: 'rgba(10, 30, 14, 0.35)' },
  heroDeco: { position: 'absolute', right: -20, top: -24 },
  heroDisc: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.14)' },
  heroContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.s20 },
  heroAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...type.subheading, color: ink.onImage },
  heroText: { ...type.bodySm, fontSize: 13, lineHeight: 18, color: ink.onImageSoft, marginTop: 2 },
  faqBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: accent.lime },
  faqBtnText: { ...type.label, fontSize: 12, fontWeight: '800', color: ink.onLime },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    marginHorizontal: space.s16,
    marginTop: space.s12,
    paddingHorizontal: space.s12,
    paddingVertical: 8,
    borderRadius: radius.chip,
    backgroundColor: statusTone.sincronizado.soft,
  },
  statusRowOffline: { backgroundColor: statusTone.pendiente.soft },
  statusText: { ...type.bodySm, flex: 1, fontSize: 12, lineHeight: 16, color: ink.body },

  chatBox: { padding: space.s16, gap: space.s16 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, maxWidth: '92%' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: accent.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  botColumn: { flexShrink: 1, gap: 6 },
  senderLabel: { ...type.caption, color: accent.primary, marginLeft: 2 },
  bubble: { paddingHorizontal: space.s16, paddingVertical: space.s12, borderRadius: 20, gap: space.s8 },
  botBubble: { backgroundColor: surface.panel, borderWidth: 1, borderColor: line.subtle, borderTopLeftRadius: 6, ...shadow.card },
  userWrap: { alignSelf: 'flex-end', maxWidth: '82%' },
  userBubble: { backgroundColor: accent.primary, borderBottomRightRadius: 6, ...shadow.glow },
  faqQuestion: { ...type.label, fontSize: 14, color: accent.primary },
  botText: { ...type.body, fontSize: 15, lineHeight: 22, color: ink.body },
  userText: { ...type.body, fontSize: 15, lineHeight: 22, color: ink.onSolid },
  followUps: { gap: 6, marginTop: 2 },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: space.s12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: accent.soft,
  },
  followUpText: { ...type.label, fontSize: 12, color: accent.primary, flexShrink: 1 },
  disclaimer: { ...type.bodySm, fontSize: 11, color: ink.tertiary, textAlign: 'center' },

  suggestionsScroll: { flexGrow: 0 },
  suggestions: { paddingHorizontal: space.s16, paddingBottom: 10, gap: space.s8 },
  suggestion: {
    paddingHorizontal: space.s16,
    paddingVertical: space.s8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: accent.border,
    backgroundColor: surface.panel,
  },
  suggestionPressed: { backgroundColor: accent.soft },
  suggestionText: { ...type.label, fontSize: 12, color: accent.primary },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    marginHorizontal: space.s12,
    marginBottom: space.s12,
    paddingLeft: space.s20,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: surface.panel,
    borderWidth: 1,
    borderColor: line.muted,
    ...shadow.card,
  },
  input: { ...type.body, flex: 1, fontSize: 15, color: ink.heading, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: accent.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnPressed: { backgroundColor: accent.pressed },
  sendBtnDisabled: { backgroundColor: surface.overlay },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 38, 26, 0.45)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: surface.floor, paddingTop: space.s8 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: line.ghost, marginBottom: space.s8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s20, paddingBottom: space.s8 },
  sheetTitle: { ...type.headingSm, fontSize: 22, color: ink.heading },
  sheetContent: { paddingHorizontal: space.s16, paddingBottom: space.s24 },
});
