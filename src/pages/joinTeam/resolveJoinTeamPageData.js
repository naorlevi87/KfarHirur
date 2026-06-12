// src/pages/joinTeam/resolveJoinTeamPageData.js
// Hook for the join-team page. Loads editable copy from DB and builds the
// ready-to-use WhatsApp URLs so the page never sees raw phone/message data.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay } from '../../data/pageContent/resolvePageContent.js';

// Israeli phone normalization: strip non-digits, convert leading 0 → 972.
function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D+/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

function buildWhatsappHref(phone, message) {
  const tel = normalizePhone(phone);
  if (!tel) return '';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${tel}${text}`;
}

function resolveSection(raw) {
  const section = raw ?? {};
  return {
    heading:      section.heading      ?? '',
    body:         section.body         ?? '',
    buttonLabel:  section.buttonLabel  ?? '',
    whatsappHref: buildWhatsappHref(section.whatsappPhone, section.whatsappMessage),
  };
}

export function useJoinTeamPageData() {
  const { locale, mode } = useAppContext();
  // forLocale tags which locale the rows belong to, so loading is derived (no
  // synchronous reset needed) and a stale in-flight fetch can't overwrite newer data.
  const [state, setState] = useState({ rows: null, forLocale: null });

  useEffect(() => {
    let active = true;
    fetchPageContent('joinTeam', locale)
      .then(rows => { if (active) setState({ rows, forLocale: locale }); })
      .catch(() => { if (active) setState({ rows: [], forLocale: locale }); });
    return () => { active = false; };
  }, [locale]);

  if (state.forLocale !== locale) return { loading: true, data: null };

  const db = buildDbOverlay(state.rows, mode);

  return {
    loading: false,
    data: {
      general:     { heading: db.general?.heading ?? '', body: db.general?.body ?? '' },
      kitchen:     resolveSection(db.kitchen),
      hospitality: resolveSection(db.hospitality),
    },
  };
}
