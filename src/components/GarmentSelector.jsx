import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PRODUCTS } from '../data/products';

export const GarmentSelector = () => {
  const { tryOnGarments, addToTryOnOutfit } = useApp();
  const [activeCategory, setActiveCategory] = useState('T-Shirts');

  const categories = ['T-Shirts', 'Shirts', 'Jackets', 'Dresses', 'Jeans', 'Hoodies'];

  const filteredProducts = PRODUCTS.filter(p => p.category === activeCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Category Tabs */}
      <div className="outfit-layer-pills">
        {categories.map(cat => (
          <button
            key={cat}
            className={`layer-tag ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Garment Thumbnail Carousel */}
      <div className="garment-carousel">
        {filteredProducts.map(garment => {
          const isSelected = tryOnGarments.some(g => g.id === garment.id);
          return (
            <div
              key={garment.id}
              className={`garment-thumb-card ${isSelected ? 'selected' : ''}`}
              onClick={() => addToTryOnOutfit(garment)}
            >
              <img
                src={garment.image}
                alt={garment.name}
                className="garment-thumb-img"
              />
              <span className="garment-thumb-title">
                {garment.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
