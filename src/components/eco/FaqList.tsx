import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accent, ink, line, radius, shadow, space, surface, type } from '../../constants/hg-theme';
import { FAQ, FAQ_TOPICS, FaqItem, FaqTopic, FaqVerification, VERIFICATION_LABEL } from '../../data/faq';
import { Reveal } from '../motion/Reveal';

const VERIFY_STYLE: Record<FaqVerification, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  sí: { icon: 'shield-checkmark', color: '#166534', bg: '#DCFCE7' },
  parcial: { icon: 'shield-half', color: '#B45309', bg: '#FEF3C7' },
  propio: { icon: 'people', color: '#1E5AA8', bg: '#DBEAFE' },
};

/** Etiqueta de verificación + fuente de una respuesta. */
export function FaqSource({ item, compact }: { item: FaqItem; compact?: boolean }) {
  const v = VERIFY_STYLE[item.verificado] ?? VERIFY_STYLE.parcial;
  return (
    <View style={styles.sourceWrap}>
      <View style={[styles.verify, { backgroundColor: v.bg }]}>
        <Ionicons name={v.icon} size={11} color={v.color} />
        <Text style={[styles.verifyText, { color: v.color }]}>{VERIFICATION_LABEL[item.verificado] ?? item.verificado}</Text>
      </View>
      {!compact ? (
        <Text style={styles.source} numberOfLines={2}>
          Fuente: {item.fuente}
        </Text>
      ) : null}
    </View>
  );
}

/** Lista de preguntas frecuentes por tema, con respuestas desplegables. */
export function FaqList({
  ids,
  initialTopic = 'peces',
  showTopics = true,
  onAsk,
  askLabel = 'Preguntar al asistente',
}: {
  /** Mostrar solo estas preguntas (ignora los temas). */
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
        <View style={styles.topics}>
          {FAQ_TOPICS.map((t) => {
            const active = t.id === topic;
            const count = FAQ.filter((f) => f.tema === t.id).length;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  setTopic(t.id);
                  setOpen(null);
                }}
                style={({ pressed }) => [styles.topic, active && styles.topicActive, pressed && styles.pressed]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons name={t.icon} size={16} color={active ? ink.onSolid : accent.primary} />
                <Text style={[styles.topicText, active && styles.topicTextActive]}>{t.label}</Text>
                <Text style={[styles.topicCount, active && styles.topicTextActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {items.map((item, i) => {
        const isOpen = open === item.id;
        return (
          <Reveal key={`${topic}-${item.id}`} delay={Math.min(i, 6) * 60} distance={18}>
            <View style={[styles.item, isOpen && styles.itemOpen]}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : item.id)}
                style={styles.question}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <Text style={[styles.questionText, isOpen && styles.questionTextOpen]}>{item.pregunta}</Text>
                <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                  <Ionicons name={isOpen ? 'remove' : 'add'} size={18} color={isOpen ? ink.onSolid : accent.primary} />
                </View>
              </Pressable>
              {isOpen ? (
                <Reveal from="fade" duration={500}>
                  <View style={styles.answer}>
                    <Text style={styles.answerText}>{item.respuesta}</Text>
                    <FaqSource item={item} />
                    {onAsk ? (
                      <Pressable onPress={() => onAsk(item)} style={({ pressed }) => [styles.ask, pressed && styles.pressed]}>
                        <Ionicons name="chatbubbles-outline" size={15} color={accent.primary} />
                        <Text style={styles.askText}>{askLabel}</Text>
                        <Ionicons name="arrow-forward" size={14} color={accent.primary} />
                      </Pressable>
                    ) : null}
                  </View>
                </Reveal>
              ) : null}
            </View>
          </Reveal>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s12 },
  pressed: { opacity: 0.8 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginBottom: space.s4 },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.s16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: accent.border,
    backgroundColor: surface.panel,
  },
  topicActive: { backgroundColor: accent.primary, borderColor: accent.primary, ...shadow.glow },
  topicText: { ...type.label, fontSize: 13, color: accent.primary },
  topicTextActive: { color: ink.onSolid },
  topicCount: { ...type.data, fontSize: 11, color: ink.tertiary },

  item: {
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: line.subtle,
    backgroundColor: surface.panel,
    overflow: 'hidden',
    ...shadow.card,
  },
  itemOpen: { borderColor: accent.border },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.s16, paddingVertical: 14 },
  questionText: { ...type.label, flex: 1, fontSize: 15, lineHeight: 21, color: ink.heading },
  questionTextOpen: { color: accent.primary },
  chevron: { width: 30, height: 30, borderRadius: 15, backgroundColor: accent.soft, alignItems: 'center', justifyContent: 'center' },
  chevronOpen: { backgroundColor: accent.primary },
  answer: { paddingHorizontal: space.s16, paddingBottom: space.s16, gap: space.s12 },
  answerText: { ...type.body, fontSize: 15, lineHeight: 23, color: ink.body },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  askText: { ...type.label, fontSize: 13, color: accent.primary },

  sourceWrap: { gap: 6 },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  verifyText: { ...type.caption, fontSize: 9, letterSpacing: 0.4 },
  source: { ...type.bodySm, fontSize: 11, lineHeight: 15, color: ink.tertiary },
});
