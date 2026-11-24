import { useRef, useState } from 'react';
import {
  ChevronLeft,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Upload,
} from 'lucide-react';

export default function TopBar({
  cocktails,
  activeIndex,
  onSelectIndex,
  onPrevDrink,
  onShare,
  hasCustomModel,
  onUploadGlb,
  onResetGlb,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadGlb(file);
      setMenuOpen(false);
    }
    e.target.value = '';
  };

  return (
    <>
      <header className="top-chrome">
        <div className="top-chrome-group">
          <button
            id="top-back-cycle-btn"
            type="button"
            className="icon-circle-btn"
            onClick={onPrevDrink}
            aria-label="Previous drink"
          >
            <ChevronLeft size={19} strokeWidth={2.2} />
          </button>
        </div>

        {/* Minimalist active cocktail indicator pills */}
        <nav className="drink-pagination-pills" aria-label="Cocktail selector">
          {cocktails.map((drink, idx) => (
            <button
              key={drink.id}
              id={`drink-dot-${drink.id}`}
              type="button"
              className={`pagination-dot ${idx === activeIndex ? 'active' : ''}`}
              onClick={() => onSelectIndex(idx)}
              aria-label={`View ${drink.name}`}
              aria-current={idx === activeIndex ? 'true' : undefined}
            />
          ))}
        </nav>

        <div className="top-chrome-group">
          <button
            id="share-drink-btn"
            type="button"
            className="icon-circle-btn"
            onClick={onShare}
            aria-label="Share cocktail recipe"
          >
            <Share2 size={17} strokeWidth={2.1} />
          </button>
          <button
            id="more-options-btn"
            type="button"
            className="icon-circle-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="3D model and menu options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={19} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="top-dropdown-menu" role="menu">
          <button
            id="upload-custom-glb-btn"
            type="button"
            className="dropdown-item"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>Preview custom Blender .glb</span>
          </button>

          {hasCustomModel && (
            <button
              id="reset-procedural-model-btn"
              type="button"
              className="dropdown-item"
              onClick={() => {
                onResetGlb();
                setMenuOpen(false);
              }}
            >
              <RotateCcw size={16} />
              <span>Restore procedural 3D model</span>
            </button>
          )}

          <p className="dropdown-hint">
            Swipe left or right anywhere below the glass to switch drinks, or drop{' '}
            <code>.glb</code> files into <code>public/models/</code>.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
