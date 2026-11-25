import React, { createContext, useContext, useState } from 'react';

export type AppLang = 'es' | 'ay' | 'qu' | 'gn';

const TRANSLATIONS: Record<AppLang, Record<string, string>> = {
  es: {
    appTitle: 'ReporteHg — Riesgo y Alerta',
    tabMap: 'Mapa de Riesgo',
    tabReport: 'Reportar (Offline)',
    tabChat: 'Asistente RAG',
    tabLang: 'Idioma',
    offlineBanner: 'Modo offline listo: tus reportes se guardan en el equipo y se sincronizan al haber red.',
    saveOffline: 'Guardar reporte sin conexión',
    syncNow: 'Sincronizar pendientes',
    pendingLabel: 'Pendiente',
    syncedLabel: 'Sincronizado',
  },
  ay: {
    appTitle: 'ReporteHg — Qullqi Quri / Janq’u Uma',
    tabMap: 'Riesgo Mapa',
    tabReport: 'Yatiyawi (Offline)',
    tabChat: 'Yanapiri',
    tabLang: 'Aru',
    offlineBanner: 'Internet jan ukäñkamax yatiyawix imatäniwa, qhipatsti apasiniwa.',
    saveOffline: 'Jan internetamp imaña',
    syncNow: 'Mayacht’ayaña',
    pendingLabel: 'Suyaskakiwa',
    syncedLabel: 'Apatawa',
  },
  qu: {
    appTitle: 'ReporteHg — Riesgo Mapa',
    tabMap: 'Riesgo Mapa',
    tabReport: 'Willay (Offline)',
    tabChat: 'Yanapaq',
    tabLang: 'Simi',
    offlineBanner: 'Mana internet kaptinpas willayqa waqaychasqa kanqa, chaymanta apachikunqa.',
    saveOffline: 'Mana redwan waqaychay',
    syncNow: 'Tinkichiy',
    pendingLabel: 'Suyachkan',
    syncedLabel: 'Apachisqa',
  },
  gn: {
    appTitle: 'ReporteHg — Mapa de Riesgo',
    tabMap: 'Mapa',
    tabReport: 'Mombe’u (Offline)',
    tabChat: 'Pytyvõhára',
    tabLang: 'Ñe’ẽ',
    offlineBanner: 'Internet ỹre jepe oñongatu mombe’u ha oñemondóta oĩ vove conexión.',
    saveOffline: 'Ñongatu conexión ỹre',
    syncNow: 'Sincronizar',
    pendingLabel: 'Oha’arõ',
    syncedLabel: 'Oñemondóma',
  },
};

interface LanguageContextType {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'es',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<AppLang>('es');
  const t = (key: string) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.es[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
