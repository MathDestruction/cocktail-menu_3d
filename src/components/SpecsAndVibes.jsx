import { useState } from 'react';
import { Info, MapPin } from 'lucide-react';

export default function SpecsAndVibes({ cocktail }) {
  const [showMethodInfo, setShowMethodInfo] = useState(false);

  return (
    <>
      <section className="about-section" aria-labelledby="about-heading">
        <div className="about-header-row">
          <h2 id="about-heading" className="about-heading">
            ABOUT
          </h2>
          <span className="origin-pill">
            <MapPin size={11} />
            {cocktail.origin}
          </span>
        </div>

        <p className="about-copy">{cocktail.about}</p>
        <p className="about-lore">{cocktail.lore}</p>
      </section>

      {/* Row 1: Core Bartender Specs matching the reference image */}
      <section className="specs-grid" aria-label="Cocktail specifications">
        <div className="spec-card">
          <span className="spec-label">Time</span>
          <span className="spec-value">{cocktail.specs.time}</span>
        </div>

        <button
          id="method-info-card"
          type="button"
          className="spec-card interactive"
          onClick={() => setShowMethodInfo((prev) => !prev)}
          aria-expanded={showMethodInfo}
        >
          <span className="spec-label">Method</span>
          <span className="spec-value">
            {cocktail.specs.method}
            <Info size={14} style={{ opacity: 0.72 }} />
          </span>
        </button>

        <div className="spec-card">
          <span className="spec-label">ABV</span>
          <span className="spec-value">{cocktail.specs.abv}</span>
        </div>
      </section>

      {showMethodInfo && (
        <div className="method-tooltip" role="note">
          <strong>{cocktail.specs.method} technique:</strong> {cocktail.specs.methodDetail}
        </div>
      )}

      {/* Row 2: Vibe & Character Metrics */}
      <section className="vibes-row" aria-label="Cocktail vibe profile">
        {cocktail.vibes.map((vibe) => (
          <div key={vibe.label} className="vibe-card">
            <span className="vibe-label">{vibe.label}</span>
            <span className="vibe-descriptor">{vibe.descriptor}</span>
            <div className="vibe-meter-track" aria-hidden="true">
              <div
                className="vibe-meter-fill"
                style={{ width: `${vibe.level}%` }}
              />
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
