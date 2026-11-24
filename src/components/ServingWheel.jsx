import { useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

export default function ServingWheel({ servings, onChangeServings, servingVolumeMl }) {
  const dragStartX = useRef(null);
  const startServings = useRef(servings);

  const clamp = (val) => Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, val));

  const handlePointerDown = (e) => {
    e.stopPropagation();
    dragStartX.current = e.clientX;
    startServings.current = servings;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragStartX.current === null) return;
    e.stopPropagation();
    const deltaX = e.clientX - dragStartX.current;
    // Every 22px of horizontal scrub steps 1 drink detent
    const stepDelta = Math.round(deltaX / 22);
    const nextVal = clamp(startServings.current + stepDelta);
    if (nextVal !== servings) {
      onChangeServings(nextVal);
    }
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    dragStartX.current = null;
  };

  const handleWheel = (e) => {
    const dominant = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(dominant) < 4) return;
    e.preventDefault();
    const dir = dominant > 0 ? 1 : -1;
    onChangeServings(clamp(servings + dir));
  };

  const totalMl = servings * servingVolumeMl;

  return (
    <div
      className="serving-wheel-card"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="serving-wheel-shell" role="group" aria-label="Number of drinks">
        <button
          id="decrease-servings-btn"
          type="button"
          className="wheel-step-btn"
          disabled={servings <= MIN_SERVINGS}
          onClick={() => onChangeServings((s) => clamp(s - 1))}
          aria-label="Decrease number of drinks"
        >
          <Minus size={16} strokeWidth={2.4} />
        </button>

        <div
          id="servings-scroll-wheel"
          className="wheel-drum-track"
          role="slider"
          tabIndex={0}
          aria-valuemin={MIN_SERVINGS}
          aria-valuemax={MAX_SERVINGS}
          aria-valuenow={servings}
          aria-label="Drag left or right to adjust servings"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChangeServings((s) => clamp(s + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChangeServings((s) => clamp(s - 1));
            }
          }}
        >
          <div className="wheel-value-row">
            <span className="wheel-count-num">{servings}</span>
            <span className="wheel-count-unit">
              {servings === 1 ? 'drink' : 'drinks'}
            </span>
          </div>

          <div className="wheel-ticks" aria-hidden="true">
            {Array.from({ length: MAX_SERVINGS }, (_, idx) => {
              const num = idx + 1;
              const isActive = num === servings;
              const isMajor = num === 1 || num % 4 === 0;
              return (
                <span
                  key={num}
                  className={`wheel-tick ${isActive ? 'active' : isMajor ? 'major' : ''}`}
                />
              );
            })}
          </div>
        </div>

        <button
          id="increase-servings-btn"
          type="button"
          className="wheel-step-btn"
          disabled={servings >= MAX_SERVINGS}
          onClick={() => onChangeServings((s) => clamp(s + 1))}
          aria-label="Increase number of drinks"
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>

      <p className="serving-caption">
        Drag dial or tap ± · {totalMl} ml {servings > 1 ? 'total batch' : 'single pour'}
      </p>
    </div>
  );
}
