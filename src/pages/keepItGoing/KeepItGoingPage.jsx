// src/pages/keepItGoing/KeepItGoingPage.jsx
// Fundraising page — structure + composition only.
// All copy from useKeepItGoingPageData. Motion via staggered section entries.

import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import '../../styles/app/KeepItGoingPage.css';
import { getText } from '../../utils/content/getText.js';
import { useKeepItGoingPageData } from './resolveKeepItGoingPageData.js';
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

export function KeepItGoingPage() {
  const { hero, cta, progress, video, longText, transparency, share, footer } =
    useKeepItGoingPageData();

  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    getText(share, 'whatsappMessage') + window.location.href
  )}`;

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

        {/* Block 6 — Share */}
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
              className="kig-whatsappBtn"
              aria-label={getText(share, 'whatsappLabel')}
            >
              {getText(share, 'whatsappLabel')}
            </a>
            <button
              type="button"
              className="kig-copyBtn"
              onClick={handleCopyLink}
              aria-live="polite"
            >
              {copied ? '✓ הועתק' : getText(share, 'copyLabel')}
            </button>
          </div>
        </motion.section>

        {/* Block 7 — Footer link */}
        <motion.div className="kig-footer" variants={blockVariants}>
          <Link to="/" className="kig-backLink">
            {getText(footer, 'backLabel')}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
