// src/pages/kenZeOved/KenZeOvedPage.jsx
// Fundraising page — structure + composition only.
// All copy from useKenZeOvedPageData. Motion via staggered section entries.

import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import '../../styles/app/KenZeOvedPage.css';
import { getText } from '../../utils/content/getText.js';
import { useKenZeOvedPageData } from './resolveKenZeOvedPageData.js';
import { ProgressBar } from './ProgressBar.jsx';
import { DonateButton } from './DonateButton.jsx';

// Stagger parent — reveals children sequentially as page loads
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

export function KenZeOvedPage() {
  const { hero, cta, progress, video, longText, transparency, share } =
    useKenZeOvedPageData();

  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const pageUrl = window.location.href;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    getText(share, 'whatsappMessage') + pageUrl
  )}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

  const heroParagraphs = (getText(hero, 'body') || '').split('\n\n').filter(Boolean);
  const longParagraphs = longText.paragraphs ?? [];

  return (
    <div className="kig-page">
      <motion.div
        className="kig-inner"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Block 1 — Story header */}
        <motion.section
          className="kig-hero"
          variants={blockVariants}
          aria-labelledby="kig-heading"
        >
          <h1 id="kig-heading" className="kig-heading">
            {getText(hero, 'heading')}
          </h1>
          <div className="kig-heroCopy">
            {heroParagraphs.map((p, i) => (
              <p key={i} className="kig-heroP">{p}</p>
            ))}
          </div>
        </motion.section>

        {/* Block 2 — CTAs + progress */}
        <motion.section className="kig-cta" variants={blockVariants} aria-label="תמיכה">
          <DonateButton
            href={cta.donateUrl}
            label={getText(cta, 'donateLabel')}
            ariaLabel={getText(cta, 'donateAriaLabel')}
          />
          <a
            href={cta.visitUrl}
            className="kig-visitBtn"
            aria-label={getText(cta, 'visitAriaLabel')}
          >
            {getText(cta, 'visitLabel')}
          </a>
          <ProgressBar progress={progress} />
        </motion.section>

        {/* Block 3 — Video placeholder */}
        <motion.section
          className="kig-video"
          variants={blockVariants}
          aria-label={getText(video, 'placeholder')}
        >
          <div className="kig-videoCard" role="img" aria-label={getText(video, 'placeholder')}>
            <p className="kig-videoPlaceholder">{getText(video, 'placeholder')}</p>
          </div>
        </motion.section>

        {/* Block 4 — Long emotional text */}
        <motion.section className="kig-longText" variants={blockVariants}>
          {longParagraphs.map((p, i) => (
            <p key={i} className="kig-longP">{p}</p>
          ))}
        </motion.section>

        {/* Block 5 — Financial transparency placeholder */}
        <motion.section
          className="kig-transparency"
          variants={blockVariants}
          aria-labelledby="kig-transparencyHeading"
        >
          <h2 id="kig-transparencyHeading" className="kig-transparencyHeading">
            {getText(transparency, 'heading')}
          </h2>
          <p className="kig-transparencyPlaceholder">
            {getText(transparency, 'placeholder')}
          </p>
        </motion.section>

        {/* Block 6 — Repeat donate CTA */}
        <motion.section className="kig-cta" variants={blockVariants} aria-label="תמיכה חוזרת">
          <DonateButton
            href={cta.donateUrl}
            label={getText(cta, 'donateLabel')}
            ariaLabel={getText(cta, 'donateAriaLabel')}
          />
        </motion.section>

        {/* Block 7 — Share */}
        <motion.section
          className="kig-share"
          variants={blockVariants}
          aria-labelledby="kig-shareHeading"
        >
          <h2 id="kig-shareHeading" className="kig-shareHeading">
            {getText(share, 'heading')}
          </h2>
          <div className="kig-shareActions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kig-socialBtn kig-socialBtn--whatsapp"
              aria-label={getText(share, 'whatsappLabel')}
            >
              <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {getText(share, 'whatsappLabel')}
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kig-socialBtn kig-socialBtn--facebook"
              aria-label={getText(share, 'facebookLabel')}
            >
              <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {getText(share, 'facebookLabel')}
            </a>
            <button
              type="button"
              className="kig-copyBtn"
              onClick={handleCopyLink}
              aria-live="polite"
            >
              {copied ? (
                <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ) : (
                <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              )}
              {getText(share, 'copyLabel')}
            </button>
          </div>
        </motion.section>

      </motion.div>
    </div>
  );
}
