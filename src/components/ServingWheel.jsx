import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;
const SUBDIVISIONS = 4; // 1 major tick + 3 fine subdivisions per drink

export default function ServingWheel({ servings, onChangeServings, servingVolumeMl }) {
  // Continuous floating-point dial position for buttery-smooth thumb dragging
  const [dialPos, setDialPos] = useState(servings);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartValRef = useRef(servings);

  // Sync smooth position when +/- buttons or drink switches update `servings`
  useEffect(() => {
    if (!isDraggingRef.current) {
      setDialPos(servings);
    }
  }, [servings]);

  const clamp = (val) => Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, val));

  const handlePointerDown = (e) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartValRef.current = dialPos;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartXRef.current;
    // Dragging thumb right sweeps ruler right (or natural scrub: drag right increases / drag dial)
    // Natural dial feel: dragging right increases count smoothly (26px per drink)
    const rawNext = clamp(dragStartValRef.current + dx / 26);
    setDialPos(rawNext);
    const snapped = Math.round(rawNext);
    if (snapped !== servings) {
      onChangeServings(snapped);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    isDraggingRef.current = false;
    const snapped = clamp(Math.round(dialPos));
    setDialPos(snapped);
    onChangeServings(snapped);
  };

  const handleWheel = (e) => {
    const dominant = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(dominant) < 4) return;
    e.preventDefault();
    const dir = dominant > 0 ? 1 : -1;
    onChangeServings((s) => clamp(s + dir));
  };

  // Arc geometry: center well below the control so the arc follows a natural thumb sweep
  const svgW = 168;
  const svgH = 32;
  const cx = svgW / 2;
  const cy = 228;
  const radius = 212;
  const degPerDrink = 6.2; // angular spacing per integer serving
  const maxVisibleDeg = 20.5;

  const totalTicks = (MAX_SERVINGS - MIN_SERVINGS) * SUBDIVISIONS;
  const ticks = [];

  for (let t = -4; t <= totalTicks + 4; t++) {
    const tickValue = MIN_SERVINGS + t / SUBDIVISIONS;
    const offsetDrinks = tickValue - dialPos;
    const angleDeg = offsetDrinks * degPerDrink;

    if (Math.abs(angleDeg) > maxVisibleDeg) continue;

    const isInBounds = tickValue >= MIN_SERVINGS - 0.01 && tickValue <= MAX_SERVINGS + 0.01;
    const isMajor = ((t % SUBDIVISIONS) + SUBDIVISIONS) % SUBDIVISIONS === 0 && isInBounds;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Proximity to top-dead-center apex (0..1)
    const centerFocus = Math.max(0, 1 - Math.abs(angleDeg) / maxVisibleDeg);
    const isCurrentApex = Math.abs(offsetDrinks) < 0.14 && isMajor;

    const tickLen = isCurrentApex ? 10.5 : isMajor ? 7.5 : 4.2;
    const rOuter = radius + tickLen / 2;
    const rInner = radius - tickLen / 2;

    const x1 = cx + Math.sin(angleRad) * rInner;
    const y1 = cy - Math.cos(angleRad) * rInner;
    const x2 = cx + Math.sin(angleRad) * rOuter;
    const y2 = cy - Math.cos(angleRad) * rOuter;

    const baseAlpha = !isInBounds ? 0.1 : isCurrentApex ? 1 : isMajor ? 0.62 : 0.28;
    const opacity = baseAlpha * Math.pow(centerFocus, 0.85);

    ticks.push({
      key: t,
      x1,
      y1,
      x2,
      y2,
      strokeWidth: isCurrentApex ? 2.1 : isMajor ? 1.45 : 1.0,
      opacity,
      isCurrentApex,
    });
  }

  // Subtle base guide arc path
  const arcSpanRad = (maxVisibleDeg * Math.PI) / 180;
  const arcStartX = cx - Math.sin(arcSpanRad) * (radius - 6);
  const arcStartY = cy - Math.cos(arcSpanRad) * (radius - 6);
  const arcEndX = cx + Math.sin(arcSpanRad) * (radius - 6);
  const arcEndY = cy - Math.cos(arcSpanRad) * (radius - 6);
  const guideArcPath = `M ${arcStartX.toFixed(2)} ${arcStartY.toFixed(2)} A ${radius - 6} ${
    radius - 6
  } 0 0 1 ${arcEndX.toFixed(2)} ${arcEndY.toFixed(2)}`;

  const totalMl = servings * servingVolumeMl;

  return (
    <div
      className="serving-dial-zone"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="serving-readout">
        <span className="serving-readout-count">{servings}</span>
        <span className="serving-readout-unit">
          {servings === 1 ? 'drink' : 'drinks'}
        </span>
        <span className="serving-readout-sep">·</span>
        <span className="serving-readout-vol">{totalMl} ml</span>
      </div>

      <div className="serving-arc-row" role="group" aria-label="Number of drinks">
        <button
          id="decrease-servings-btn"
          type="button"
          className="dial-step-btn"
          disabled={servings <= MIN_SERVINGS}
          onClick={() => onChangeServings((s) => clamp(s - 1))}
          aria-label="Decrease number of drinks"
        >
          <Minus size={14} strokeWidth={2.2} />
        </button>

        <div
          id="servings-scroll-wheel"
          className="curved-ruler-touch"
          role="slider"
          tabIndex={0}
          aria-valuemin={MIN_SERVINGS}
          aria-valuemax={MAX_SERVINGS}
          aria-valuenow={servings}
          aria-label="Curved serving dial — drag thumb left or right"
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
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="curved-ruler-svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="arcFadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="22%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="78%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Hairline thumb-curve track */}
            <path
              d={guideArcPath}
              fill="none"
              stroke="url(#arcFadeGrad)"
              strokeOpacity="0.16"
              strokeWidth="1"
            />

            {/* Radial incremental ticks along the thumb curve */}
            {ticks.map((tk) => (
              <line
                key={tk.key}
                x1={tk.x1}
                y1={tk.y1}
                x2={tk.x2}
                y2={tk.y2}
                stroke={tk.isCurrentApex ? '#ffffff' : 'rgba(255, 245, 240, 0.95)'}
                strokeWidth={tk.strokeWidth}
                strokeOpacity={tk.opacity}
                strokeLinecap="round"
              />
            ))}

            {/* Crisp center apex dot right above the active tick */}
            <circle cx={cx} cy={5.5} r={1.8} fill="var(--accent-color)" />
          </svg>
        </div>

        <button
          id="increase-servings-btn"
          type="button"
          className="dial-step-btn"
          disabled={servings >= MAX_SERVINGS}
          onClick={() => onChangeServings((s) => clamp(s + 1))}
          aria-label="Increase number of drinks"
        >
          <Plus size={14} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
