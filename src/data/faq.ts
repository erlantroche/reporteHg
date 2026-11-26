/**
 * Preguntas frecuentes verificadas del equipo (src/data/faq.json).
 * Están dentro de la app, así que el asistente puede responderlas SIN internet.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RAW: FaqItem[] = require('./faq.json');

export type FaqTopic = 'peces' | 'salud' | 'mineria' | 'agua';
export type FaqVerification = 'sí' | 'parcial' | 'propio';

export interface FaqItem {
  id: number;
  pregunta: string;
  respuesta: string;
  fuente: string;
  tema: FaqTopic;
  palabras_clave: string[];
  verificado: FaqVerification;
}

export const FAQ: FaqItem[] = RAW;

export const FAQ_TOPICS: { id: FaqTopic; label: string; icon: 'fish' | 'medical-bag' | 'pickaxe' | 'water' }[] = [
  { id: 'peces', label: 'Pescado', icon: 'fish' },
  { id: 'salud', label: 'Salud', icon: 'medical-bag' },
  { id: 'mineria', label: 'Minería', icon: 'pickaxe' },
  { id: 'agua', label: 'Agua y ríos', icon: 'water' },
];

export const VERIFICATION_LABEL: Record<FaqVerification, string> = {
  sí: 'Verificado con documentos',
  parcial: 'Verificado en parte',
  propio: 'Información del equipo',
};

export function faqById(id: number): FaqItem | undefined {
  return FAQ.find((f) => f.id === id);
}

export function faqByTopic(topic: FaqTopic): FaqItem[] {
  return FAQ.filter((f) => f.tema === topic);
}

/** Minúsculas y sin tildes, para comparar texto escrito de cualquier forma. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(
  'el la los las un una unos unas de del al a en y o que es son se mi mis tu tus su sus por para con sin como cual cuales hay me te le lo ya muy mas pero si no yo puedo debo hago sobre esta este eso esto'.split(' ')
);

function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Formas comunes de decir lo mismo (se agregan a la consulta antes de buscar). */
const SYNONYMS: Record<string, string> = {
  tiemblo: 'temblor', tiembla: 'temblor', temblando: 'temblor', duele: 'dolor', mareo: 'sintomas',
  azogue: 'mercurio', derramo: 'derrame', derrame: 'derrame', cayo: 'derrame', rompio: 'derrame',
  denuncio: 'denunciar reportar', denunciar: 'reportar', reporto: 'reportar', avisar: 'reportar', aviso: 'reportar',
  hijo: 'ninos', hija: 'ninos', hijos: 'ninos', nino: 'ninos', nina: 'ninos', wawa: 'ninos', wawas: 'ninos', guagua: 'ninos',
  embarazo: 'embarazada', gestante: 'embarazada', pez: 'pescado', peces: 'pescado', pescados: 'pescado',
  beber: 'tomar agua', toma: 'tomar', potable: 'tomar agua', hiervo: 'hervir', hirviendo: 'hervir',
  quemo: 'quemar', queman: 'quemar', quema: 'quemar', amalgamar: 'amalgama', cola: 'relave', colas: 'relave',
  ley: 'ley', leyes: 'ley', norma: 'ley', autoridad: 'institucion', denuncia: 'reportar',
  concesion: 'ajam institucion', concesiones: 'ajam institucion', controla: 'institucion', encarga: 'institucion',
};

const WEAK_KEYWORDS = new Set(['como', 'que es', 'que hago', 'quien', 'cuanto', 'comer', 'agua', 'casa', 'seguro']);

function expandQuery(query: string): string {
  const base = normalize(query);
  const extra = base
    .split(' ')
    .map((w) => SYNONYMS[w])
    .filter(Boolean);
  return extra.length ? base + ' ' + extra.join(' ') : base;
}

export interface FaqMatch {
  item: FaqItem;
  score: number;
}

/** Busca la pregunta frecuente que mejor responde a lo que escribió la persona. */
export function searchFaq(query: string, limit = 3): FaqMatch[] {
  const q = expandQuery(query);
  const qTokens = tokens(q);
  if (!q) return [];

  const results = FAQ.map((item) => {
    let score = 0;
    const preguntaN = normalize(item.pregunta);
    if (preguntaN === q) score += 20;

    // Palabras clave (pueden ser frases como "dejar de comer")
    for (const kw of item.palabras_clave) {
      const k = normalize(kw);
      if (!k) continue;
      const weight = WEAK_KEYWORDS.has(k) ? 0.6 : k.includes(' ') ? 5 : 3;
      if (q.includes(k)) score += weight;
      else if (k.length >= 5 && qTokens.some((t) => t.startsWith(k.slice(0, 5)))) score += 1.5;
    }

    // Coincidencia con las palabras de la pregunta
    const pTokens = new Set(tokens(item.pregunta));
    for (const t of qTokens) {
      if (pTokens.has(t)) score += 1.2;
      else if (t.length >= 5 && [...pTokens].some((p) => p.startsWith(t.slice(0, 5)))) score += 0.6;
    }
    return { item, score };
  })
    .filter((r) => r.score >= 2.4)
    .sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/** Preguntas relacionadas (mismo tema), para sugerir después de una respuesta. */
export function relatedFaq(item: FaqItem, count = 2): FaqItem[] {
  return FAQ.filter((f) => f.tema === item.tema && f.id !== item.id).slice(0, count);
}

/** Consejos según el tipo de aviso que se está reportando. */
export const FAQ_FOR_REPORT_TYPE: Record<string, number[]> = {
  draga: [27, 22],
  agua_turbia: [26, 25],
  quema_amalgama: [17, 16],
  peces_muertos: [1, 2],
};

/** Preguntas destacadas para la portada. */
export const FEATURED_FAQ_IDS = [1, 3, 8, 12, 17, 26];
