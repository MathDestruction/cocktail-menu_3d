import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Plus, Sparkles } from 'lucide-react';
import { COCKTAILS } from './data/cocktails';
import TopBar from './components/TopBar';
import CocktailStage3D from './components/CocktailStage3D';
import ServingWheel from './components/ServingWheel';
import SpecsAndVibes from './components/SpecsAndVibes';
import RecipeDrawer from './components/RecipeDrawer';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');
  const [servingsByDrink, setServingsByDrink] = useState({});
  const [savedDrinks, setSavedDrinks] = useState({});
  const [showRiff, setShowRiff] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customModels, setCustomModels] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const swipeStartRef = useRef(null);
  const toastTimerRef = useRef(null);

  const cocktail = COCKTAILS[activeIndex];
  const servings = servingsByDrink[cocktail.id] ?? 1;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Apply per-cocktail atmospheric CSS custom properties & browser theme-color
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(cocktail.theme).forEach(([key, value]) => {
      if (key.startsWith('--')) {
        root.style.setProperty(key, value);
      }
    });

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', cocktail.theme['--bg-top']);
    }
  }, [cocktail]);

  const switchToIndex = useCallback(
    (nextIdx, dir = 'next') => {
      const total = COCKTAILS.length;
      const wrapped = ((nextIdx % total) + total) % total;
      if (wrapped === activeIndex) return;
      setSlideDirection(dir);
      setActiveIndex(wrapped);
      setShowRiff(false);
      setActiveTag(null);
    },
    [activeIndex]
  );

  const handleNextDrink = useCallback(() => {
    switchToIndex(activeIndex + 1, 'next');
  }, [activeIndex, switchToIndex]);

  const handlePrevDrink = useCallback(() => {
    switchToIndex(activeIndex - 1, 'prev');
  }, [activeIndex, switchToIndex]);

  // Keyboard left/right navigation when drawer is closed
  useEffect(() => {
    const onKeyDown = (e) => {
      if (drawerOpen) {
        if (e.key === 'Escape') setDrawerOpen(false);
        return;
      }
      if (e.target?.getAttribute?.('role') === 'slider') return;
      if (e.key === 'ArrowRight') handleNextDrink();
      if (e.key === 'ArrowLeft') handlePrevDrink();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, handleNextDrink, handlePrevDrink]);

  // Horizontal swipe gesture across the cocktail UI body
  const handleSwipeStart = (clientX, clientY) => {
    swipeStartRef.current = { x: clientX, y: clientY };
  };

  const handleSwipeEnd = (clientX, clientY) => {
    if (!swipeStartRef.current) return;
    const dx = clientX - swipeStartRef.current.x;
    const dy = clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    // Require clear horizontal intent (> 48px and more horizontal than vertical)
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if (dx < 0) {
        handleNextDrink();
      } else {
        handlePrevDrink();
      }
    }
  };

  const handleChangeServings = (nextOrUpdater) => {
    setServingsByDrink((prev) => {
      const current = prev[cocktail.id] ?? 1;
      const resolved =
        typeof nextOrUpdater === 'function'
          ? nextOrUpdater(current)
          : nextOrUpdater;
      return {
        ...prev,
        [cocktail.id]: resolved,
      };
    });
  };

  const handleToggleSave = () => {
    const nextSaved = !savedDrinks[cocktail.id];
    setSavedDrinks((prev) => ({
      ...prev,
      [cocktail.id]: nextSaved,
    }));
    showToast(
      nextSaved
        ? `${cocktail.name} saved to My Bar`
        : `Removed ${cocktail.name} from My Bar`
    );
  };

  const handleShare = async () => {
    const shareSummary = `${cocktail.name} (${cocktail.shortIngredients}) — ${cocktail.about}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${cocktail.name} — 3D Cocktail Menu`,
          text: shareSummary,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or share unavailable
      }
    }
    try {
      await navigator.clipboard.writeText(shareSummary);
      showToast('Cocktail spec copied to clipboard');
    } catch {
      showToast(`${cocktail.name} · ${cocktail.specs.abv}`);
    }
  };

  const handleUploadGlb = (file) => {
    const objectUrl = URL.createObjectURL(file);
    setCustomModels((prev) => {
      if (prev[cocktail.id]) {
        URL.revokeObjectURL(prev[cocktail.id]);
      }
      return {
        ...prev,
        [cocktail.id]: objectUrl,
      };
    });
    showToast(`Loaded ${file.name} on ${cocktail.name}`);
  };

  const handleResetGlb = () => {
    setCustomModels((prev) => {
      if (prev[cocktail.id]) {
        URL.revokeObjectURL(prev[cocktail.id]);
      }
      const next = { ...prev };
      delete next[cocktail.id];
      return next;
    });
    showToast('Restored procedural 3D glass');
  };

  const isSaved = !!savedDrinks[cocktail.id];

  return (
    <div className="app-outer-stage">
      <main className="phone-viewport">
        <TopBar
          cocktails={COCKTAILS}
          activeIndex={activeIndex}
          onSelectIndex={(idx) =>
            switchToIndex(idx, idx > activeIndex ? 'next' : 'prev')
          }
          onPrevDrink={handlePrevDrink}
          onShare={handleShare}
          hasCustomModel={!!customModels[cocktail.id]}
          onUploadGlb={handleUploadGlb}
          onResetGlb={handleResetGlb}
        />

        <CocktailStage3D
          cocktail={cocktail}
          customModelUrl={customModels[cocktail.id]}
          onPrevDrink={handlePrevDrink}
          onNextDrink={handleNextDrink}
        />

        <div
          key={cocktail.id}
          className={`cocktail-body ${
            slideDirection === 'next' ? 'animating-next' : 'animating-prev'
          }`}
          onTouchStart={(e) => {
            const t = e.changedTouches[0];
            if (t) handleSwipeStart(t.clientX, t.clientY);
          }}
          onTouchEnd={(e) => {
            const t = e.changedTouches[0];
            if (t) handleSwipeEnd(t.clientX, t.clientY);
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') {
              handleSwipeStart(e.clientX, e.clientY);
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'mouse') {
              handleSwipeEnd(e.clientX, e.clientY);
            }
          }}
        >
          {/* Identity & Filter Tags */}
          <div className="identity-block">
            <div className="tag-row" role="list" aria-label="Flavor and method tags">
              {cocktail.tags.map((tag) => (
                <button
                  key={tag}
                  id={`tag-${cocktail.id}-${tag.toLowerCase()}`}
                  type="button"
                  className={`filter-tag ${activeTag === tag ? 'active' : ''}`}
                  onClick={() =>
                    setActiveTag((prev) => (prev === tag ? null : tag))
                  }
                >
                  {tag}
                </button>
              ))}
            </div>

            <h1 className="cocktail-title">{cocktail.name}</h1>
            <p className="ingredients-subtext">{cocktail.shortIngredients}</p>
          </div>

          {/* Primary Action Cluster: (+) [Start making it] (✦) */}
          <div className="action-cluster">
            <button
              id="save-to-bar-btn"
              type="button"
              className={`action-round-btn ${isSaved ? 'saved' : ''}`}
              onClick={handleToggleSave}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Saved to My Bar' : 'Save cocktail to My Bar'}
            >
              {isSaved ? (
                <Check size={19} strokeWidth={2.5} />
              ) : (
                <Plus size={20} strokeWidth={2.2} />
              )}
            </button>

            <button
              id="start-making-btn"
              type="button"
              className="primary-cta-pill"
              onClick={() => setDrawerOpen(true)}
            >
              Start making it
            </button>

            <button
              id="bartender-riff-btn"
              type="button"
              className={`action-round-btn ${showRiff ? 'active-riff' : ''}`}
              onClick={() => setShowRiff((prev) => !prev)}
              aria-expanded={showRiff}
              aria-label="Show bartender variation and secret tip"
            >
              <Sparkles size={18} strokeWidth={2.1} />
            </button>
          </div>

          {/* Optional Bartender's Riff / Twist Callout */}
          {showRiff && (
            <div className="riff-callout" role="region" aria-label="Bartender's Twist">
              <div className="riff-callout-label">
                <Sparkles size={12} />
                <span>Bartender’s Twist</span>
              </div>
              <p>{cocktail.riff}</p>
            </div>
          )}

          {/* Tactile Serving Scroll Wheel */}
          <ServingWheel
            servings={servings}
            onChangeServings={handleChangeServings}
            servingVolumeMl={cocktail.specs.servingVolumeMl}
          />

          {/* Editorial ABOUT + Specs + Vibe Cards */}
          <SpecsAndVibes cocktail={cocktail} />
        </div>

        {/* Slide-Up Recipe Drawer */}
        {drawerOpen && (
          <RecipeDrawer
            cocktail={cocktail}
            servings={servings}
            onChangeServings={handleChangeServings}
            onClose={() => setDrawerOpen(false)}
          />
        )}

        {toastMessage && (
          <div className="toast-pill" role="status" aria-live="polite">
            {toastMessage}
          </div>
        )}
      </main>
    </div>
  );
}
