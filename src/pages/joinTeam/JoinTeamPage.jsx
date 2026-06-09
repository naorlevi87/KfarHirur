// src/pages/joinTeam/JoinTeamPage.jsx
// Join-the-team page. Three sections — general intro, kitchen, hospitality.
// Kitchen + hospitality each open a prefilled WhatsApp message to the team contact.

import { Fragment } from 'react';
import { motion } from 'motion/react';
import { useJoinTeamPageData } from './resolveJoinTeamPageData.js';
import './JoinTeamPage.css';

function renderLines(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </Fragment>
  ));
}

function renderBody(body) {
  const paragraphs = (body || '').split('\n\n').filter(Boolean);
  return paragraphs.map((p, i) => (
    <p key={i} className="jt-body">{renderLines(p)}</p>
  ));
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

// Section with optional WhatsApp CTA. Used by kitchen + hospitality.
function ContactSection({ section, headingId }) {
  return (
    <motion.section
      className="jt-section"
      variants={blockVariants}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="jt-heading jt-heading--sub">{section.heading}</h2>
      <div className="jt-bodyWrap">{renderBody(section.body)}</div>
      {section.whatsappHref && section.buttonLabel && (
        <a
          href={section.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="jt-waBtn"
        >
          <svg className="jt-waIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>{section.buttonLabel}</span>
        </a>
      )}
    </motion.section>
  );
}

export function JoinTeamPage() {
  const { data, loading } = useJoinTeamPageData();

  if (loading) return null;

  const { general, kitchen, hospitality } = data;

  return (
    <div className="jt-page">
      <motion.div
        className="jt-inner"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section
          className="jt-section jt-section--hero"
          variants={blockVariants}
          aria-labelledby="jt-generalHeading"
        >
          <h1 id="jt-generalHeading" className="jt-heading">{general.heading}</h1>
          <div className="jt-bodyWrap">{renderBody(general.body)}</div>
        </motion.section>

        <ContactSection section={kitchen}     headingId="jt-kitchenHeading" />
        <ContactSection section={hospitality} headingId="jt-hospitalityHeading" />
      </motion.div>
    </div>
  );
}
