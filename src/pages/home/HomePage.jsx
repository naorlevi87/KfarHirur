// src/pages/home/HomePage.jsx
// Home page — narrative scroll. Each section = text block + its media, alternating bg.

import { Link } from 'react-router-dom';
import { useHomePageData } from './resolveHomePageData.js';
import { HomeCarousel } from './HomeCarousel.jsx';
import { FundraisingVideo } from './FundraisingVideo.jsx';
import { IconFacebook, IconInstagram, IconOntopo } from './SocialIcons.jsx';
import './HomePage.css';

export function HomePage() {
  const { data, loading } = useHomePageData();

  if (loading) return null;

  const { origin, community, joz, visit, fundraising, join, timeline, images } = data;

  return (
    <main className="hp" dir="rtl" lang="he">

      {/* 1 — Joz Veloz + Joz photos */}
      <section className="hp-section">
        <div className="hp-block">
          <h1 className="hp-heading">{joz.heading}</h1>
          <p className="hp-body">{joz.body}</p>
          <p className="hp-visit-label">{visit.heading}</p>
          <div className="hp-joz-links">
            <a href={visit.reserveUrl} target="_blank" rel="noopener noreferrer" className="hp-joz-link" aria-label={visit.reserveLabel}>
              <IconOntopo className="hp-joz-link__icon" />
              {visit.reserveLabel}
            </a>
            <a href={visit.instagramUrl} target="_blank" rel="noopener noreferrer" className="hp-joz-link" aria-label={visit.instagramLabel}>
              <IconInstagram className="hp-joz-link__icon" />
              {visit.instagramLabel}
            </a>
            <a href={visit.facebookUrl} target="_blank" rel="noopener noreferrer" className="hp-joz-link" aria-label={visit.facebookLabel}>
              <IconFacebook className="hp-joz-link__icon" />
              {visit.facebookLabel}
            </a>
          </div>
        </div>
        <HomeCarousel images={images.joz} altPrefix="ג׳וז ולוז" />
      </section>

      {/* 2 — Community + Atlit */}
      <section className="hp-section">
        <div className="hp-block">
          <h2 className="hp-heading">{community.heading}</h2>
          <p className="hp-body">{community.body}</p>
        </div>
        <HomeCarousel images={images.atlit} altPrefix="עתלית" />
      </section>

      {/* 3 — Fundraising + video */}
      <section className="hp-section">
        <div className="hp-block">
          <h2 className="hp-heading">{fundraising.heading}</h2>
          <p className="hp-body">{fundraising.subtext}</p>
          <Link to="/ken-ze-oved" className="hp-cta">{fundraising.ctaLabel}</Link>
        </div>
        {fundraising.videoUrl && <FundraisingVideo src={fundraising.videoUrl} />}
      </section>

      {/* 4 — Origins + Zola + timeline CTA */}
      <section className="hp-section">
        <div className="hp-block">
          <h2 className="hp-heading">{origin.heading}</h2>
          <p className="hp-body">{origin.body}</p>
          <Link to="/timeline" className="hp-cta">{timeline.label}</Link>
        </div>
        <HomeCarousel images={images.zola} altPrefix="זולה" />
      </section>

      {/* 5 — Join team + crew photo */}
      <section className="hp-section">
        <div className="hp-block">
          <h2 className="hp-heading">{join.heading}</h2>
          <p className="hp-body">{join.subtext}</p>
          <Link to="/ken-ze-oved" className="hp-cta">{join.ctaLabel}</Link>
        </div>
        {images.crew && (
          <HomeCarousel images={[images.crew]} altPrefix="צוות ג׳וז ולוז" />
        )}
      </section>

    </main>
  );
}
