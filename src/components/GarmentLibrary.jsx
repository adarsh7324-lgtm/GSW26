import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEMO_WARDROBE, GARMENT_CATEGORIES } from '../data/garmentLibrary';
import { Plus, Check, Upload } from 'lucide-react';

/**
 * GarmentLibrary — browseable garment library for the Try-On screen.
 *
 * Shows the demo wardrobe grouped by category.
 * Tapping a garment toggles it in the active try-on outfit.
 */
export const GarmentLibrary = ({ onUploadClick }) => {
  const { tryOnGarments, addToTryOnOutfit, removeFromTryOnOutfit } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? DEMO_WARDROBE
    : DEMO_WARDROBE.filter(g => g.category === activeCategory);

  const isActive = (id) => tryOnGarments.some(g => g.id === id);

  const toggle = (garment) => {
    if (isActive(garment.id)) {
      removeFromTryOnOutfit(garment.id);
    } else {
      addToTryOnOutfit(garment);
    }
  };

  return (
    <div className="garment-library">
      {/* Category tabs */}
      <div className="library-tabs">
        {GARMENT_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`library-tab${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Garment scroll row */}
      <div className="library-scroll">
        {filtered.map(garment => {
          const active = isActive(garment.id);
          return (
            <button
              key={garment.id}
              className={`library-card${active ? ' active' : ''}`}
              onClick={() => toggle(garment)}
            >
              {/* Thumbnail */}
              <div className="library-thumb-wrap">
                <img
                  src={garment.image}
                  alt={garment.name}
                  className="library-thumb-img"
                  loading="lazy"
                />
                {/* Color swatch */}
                <div
                  className="library-color-dot"
                  style={{ background: garment.overlayColor }}
                />
                {/* Active check */}
                {active && (
                  <div className="library-active-badge">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="library-card-name">{garment.name}</div>
              <div className="library-card-price">${garment.price}</div>
            </button>
          );
        })}

        {/* Upload card */}
        <button className="library-card library-upload-card" onClick={onUploadClick}>
          <div className="library-thumb-wrap library-upload-thumb">
            <Upload size={24} color="var(--accent)" />
          </div>
          <div className="library-card-name" style={{ color: 'var(--accent)' }}>
            Upload
          </div>
          <div className="library-card-price" style={{ color: '#AAA' }}>
            Your image
          </div>
        </button>
      </div>
    </div>
  );
};
