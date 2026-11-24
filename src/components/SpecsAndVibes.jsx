import { useState } from 'react';
import { ChevronDown, Info, MapPin } from 'lucide-react';

export default function SpecsAndVibes({ cocktail }) {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [showMethodInfo, setShowMethodInfo] = useState(false);

  return (
    <div className="lower-editorial-stack">
      {/* ABOUT Slot: visible top subtext that fades off near the bottom; expands UP when tapped */}
      <div className="about-slot-wrapper">
        <button
          id="about-expand-trigger"
          type="button"
          className="about-collapsed-trigger"
          style={{ visibility: aboutExpanded ? 'hidden' : 'visible' }}
          onClick={() => setAboutExpanded(true)}
          aria-expanded={aboutExpanded}
          aria-label="Expand full cocktail story and tasting notes"
        >
          <span className="about-heading">ABOUT</span>
          <div className="about-fading-preview">
            <p className="about-copy">{cocktail.about}</p>
            <p className="about-lore-preview">{cocktail.lore}</p>
          </div>
        </button>

        {aboutExpanded && (
          <div
            className="about-expanded-upward"
            role="region"
            aria-label={`About ${cocktail.name}`}
            onClick={() => setAboutExpanded(false)}
          >
            <div className="about-expanded-header">
              <span className="about-heading">ABOUT</span>
              <div className="about-expanded-meta">
                <span className="origin-pill">
                  <MapPin size={10} />
                  {cocktail.origin}
                </span>
                <ChevronDown size={15} className="about-collapse-icon" />
              </div>
            </div>
            <p className="about-copy expanded">{cocktail.about}</p>
            <p className="about-lore-full">{cocktail.lore}</p>
          </div>
        )}
      </div>

      {/* Bottom Specs + Slim Vibes Anchor */}
      <div className="bottom-specs-block">
        {showMethodInfo && (
          <div
            className="method-floating-popover"
            role="note"
            onClick={() => setShowMethodInfo(false)}
          >
            <strong>{cocktail.specs.method}:</strong> {cocktail.specs.methodDetail}
          </div>
        )}

        {/* Row 1: Compact Time · Method · ABV Cards */}
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
              <Info size={13} className="spec-info-icon" />
            </span>
          </button>

          <div className="spec-card">
            <span className="spec-label">ABV</span>
            <span className="spec-value">{cocktail.specs.abv}</span>
          </div>
        </section>

        {/* Row 2: Ultra-Thin Vibe Meters (clean labels + thin level bar only) */}
        <section className="vibes-slim-row" aria-label="Cocktail vibe profile">
          {cocktail.vibes.map((vibe) => (
            <div key={vibe.label} className="vibe-slim-item">
              <div className="vibe-slim-top">
                <span className="vibe-slim-label">{vibe.label}</span>
              </div>
              <div className="vibe-slim-track" aria-hidden="true">
                <div
                  className="vibe-slim-fill"
                  style={{ width: `${vibe.level}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
