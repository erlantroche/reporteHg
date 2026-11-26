import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT, ink, line, palette, space, type } from '../../constants/hg-theme';
import { FAQ, FAQ_TOPICS, FaqItem, FaqTopic, FaqVerification, VERIFICATION_LABEL } from '../../data/faq';

const VERIFY_ICON: Record<FaqVerification, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  sí: { icon: 'checkmark-circle', color: '#2C5C33' },
  parcial: { icon: 'ellipse-outline', color: '#8A5B07' },
  propio: { icon: 'people-outline', color: '#5A6459' },
};

/** Nivel de verificación y fuente de una respuesta. */
export function FaqSource({ item, compact }: { item: FaqItem; compact?: boolean }) {
  const v = VERIFY_ICON[item.verificado] ?? VERIFY_ICON.parcial;
  return (
    <View style={styles.sourceWrap}>
      <View style={styles.verify}>
        <Ionicons name={v.icon} size={14} color={v.color} />
        <Text style={[styles.verifyText, { color: v.color }]}>{VERIFICATION_LABEL[item.verificado] ?? item.verificado}</Text>
      </View>
      {!compact ? <Text style={styles.source}>Fuente: {item.fuente}</Text> : null}
    </View>
  );
}

/** Preguntas frecuentes por tema, con respuestas que se despliegan al tocarlas. */
export function FaqList({
  ids,
  initialTopic = 'peces',
  showTopics = true,
  onAsk,
  askLabel = 'Preguntar al asistente',
}: {
  ids?: number[];
  initialTopic?: FaqTopic;
  showTopics?: boolean;
  onAsk?: (item: FaqItem) => void;
  askLabel?: string;
}) {
  const [topic, setTopic] = useState<FaqTopic>(initialTopic);
  const [open, setOpen] = useState<number | null>(null);

  const items = useMemo(
    () => (ids ? ids.map((id) => FAQ.find((f) => f.id === id)).filter((f): f is FaqItem => !!f) : FAQ.filter((f) => f.tema === topic)),
    [ids, topic]
  );

  return (
    <View style={styles.wrap}>
      {showTopics && !ids ? (
        <View style={styles.tabs} accessibilityRole="tablist">
          {FAQ_TOPICS.map((t) => {
            const active = t.id === topic;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  setTopic(t.id);
                  setOpen(null);
                }}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label} <Text style={styles.tabCount}>{FAQ.filter((f) => f.tema === t.id).length}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View>
        {items.map((item) => {
          const isOpen = open === item.id;
          return (
            <View key={`${topic}-${item.id}`} style={styles.item}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : item.id)}
                style={({ pressed }) => [styles.question, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <Text style={[styles.questionText, isOpen && styles.questionTextOpen]}>{item.pregunta}</Text>
                <Ionicons name={isOpen ? 'remove' : 'add'} size={22} color={palette.selva} />
              </Pressable>
              {isOpen ? (
                <View style={styles.answer}>
                  <Text style={styles.answerText}>{item.respuesta}</Text>
                  <FaqSource item={item} />
                  {onAsk ? (
                    <Pressable onPress={() => onAsk(item)} style={({ pressed }) => [styles.ask, pressed && styles.pressed]}>
                      <Ionicons name="chatbubbles-outline" size={16} color={palette.rio} />
                      <Text style={styles.askText}>{askLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s8 },
  pressed: { opacity: 0.7 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s20, borderBottomWidth: 1, borderBottomColor: line.muted },
  tab: { paddingVertical: space.s12, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive: { borderBottomColor: palette.selva },
  tabText: { fontFamily: FONT.narrowSemi, fontSize: 19, color: ink.tertiary },
  tabTextActive: { color: palette.selva },
  tabCount: { fontFamily: FONT.text, fontSize: 13, color: ink.tertiary },

  item: { borderBottomWidth: 1, borderBottomColor: line.subtle },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s16 },
  questionText: { flex: 1, fontFamily: FONT.textSemi, fontSize: 16, lineHeight: 22, color: ink.heading },
  questionTextOpen: { color: palette.rio },
  answer: { paddingBottom: space.s20, gap: space.s12, maxWidth: 680 },
  answerText: { ...type.body, fontSize: 16, lineHeight: 26, color: ink.body },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  askText: { fontFamily: FONT.textSemi, fontSize: 14, color: palette.rio, textDecorationLine: 'underline' },

  sourceWrap: { gap: 4 },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifyText: { fontFamily: FONT.textSemi, fontSize: 13 },
  source: { ...type.bodySm, fontSize: 12, lineHeight: 17, color: ink.tertiary },
});
