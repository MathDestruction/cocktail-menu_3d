import { useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';

function formatAmount(ing, servings, unit) {
  if (ing.amountCount) {
    const count = ing.amountCount * servings;
    const label =
      count === 1 && ing.unitLabel.endsWith('s')
        ? ing.unitLabel.slice(0, -1)
        : count > 1 && !ing.unitLabel.endsWith('s')
          ? `${ing.unitLabel}s`
          : ing.unitLabel;
    return `${count} ${label}`;
  }

  if (unit === 'oz') {
    const oz = ing.amountOz * servings;
    const rounded = Math.round(oz * 4) / 4;
    return `${rounded} oz`;
  }

  const ml = Math.round(ing.amountMl * servings * 10) / 10;
  return `${ml} ml`;
}

export default function RecipeDrawer({
  cocktail,
  servings,
  onChangeServings,
  onClose,
}) {
  const [unit, setUnit] = useState('ml');
  const [completedSteps, setCompletedSteps] = useState({});

  const toggleStep = (idx) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-cocktail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="recipe-drawer">
        <div className="drawer-grab-handle" aria-hidden="true" />

        <div className="drawer-header">
          <div>
            <h2 id="drawer-cocktail-title" className="drawer-title">
              {cocktail.name}
            </h2>
            <p className="drawer-subtitle">
              {cocktail.specs.method} · {cocktail.specs.time} · Scaled for{' '}
              {servings} {servings === 1 ? 'drink' : 'drinks'}
            </p>
          </div>

          <button
            id="close-recipe-drawer-btn"
            type="button"
            className="icon-circle-btn"
            onClick={onClose}
            aria-label="Close recipe drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-controls-bar">
          <div className="drawer-servings-inline">
            <button
              id="drawer-decrease-servings-btn"
              type="button"
              className="wheel-step-btn"
              disabled={servings <= 1}
              onClick={() => onChangeServings(Math.max(1, servings - 1))}
              aria-label="Decrease servings"
            >
              <Minus size={14} />
            </button>
            <span>
              {servings} {servings === 1 ? 'Serving' : 'Servings'}
            </span>
            <button
              id="drawer-increase-servings-btn"
              type="button"
              className="wheel-step-btn"
              disabled={servings >= 12}
              onClick={() => onChangeServings(Math.min(12, servings + 1))}
              aria-label="Increase servings"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="unit-toggle" role="group" aria-label="Measurement unit">
            <button
              id="unit-ml-btn"
              type="button"
              className={`unit-btn ${unit === 'ml' ? 'active' : ''}`}
              onClick={() => setUnit('ml')}
            >
              ML
            </button>
            <button
              id="unit-oz-btn"
              type="button"
              className={`unit-btn ${unit === 'oz' ? 'active' : ''}`}
              onClick={() => setUnit('oz')}
            >
              OZ
            </button>
          </div>
        </div>

        <h3 className="drawer-section-label">Ingredients</h3>
        <ul className="ingredient-list">
          {cocktail.ingredients.map((ing) => (
            <li key={ing.name} className="ingredient-row">
              <div>
                <span className="ingredient-name">{ing.name}</span>
                {ing.note && <span className="ingredient-note">{ing.note}</span>}
              </div>
              <span className="ingredient-amount">
                {formatAmount(ing, servings, unit)}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="drawer-section-label">
          Preparation · Tap steps as you go
        </h3>
        <ol className="step-list">
          {cocktail.steps.map((step, idx) => {
            const done = !!completedSteps[idx];
            return (
              <li
                key={idx}
                className={`step-item ${done ? 'completed' : ''}`}
                onClick={() => toggleStep(idx)}
              >
                <span className="step-badge">
                  {done ? <Check size={13} strokeWidth={2.8} /> : idx + 1}
                </span>
                <span className="step-text">{step}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
