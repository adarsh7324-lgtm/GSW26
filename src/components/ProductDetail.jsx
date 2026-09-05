import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Camera, ShoppingBag, Star, ShieldCheck, Sparkles, ArrowLeft, Ruler } from 'lucide-react';
import { SizeGuideModal } from './SizeGuideModal';

export const ProductDetail = () => {
  const {
    selectedProduct,
    setActivePage,
    openTryOn,
    addToCart,
    selectedSize,
    setSelectedSize,
    selectedColor,
    setSelectedColor
  } = useApp();

  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  if (!selectedProduct) return null;

  return (
    <div className="pdp-container">
      {/* Back Button */}
      <button
        onClick={() => setActivePage('catalog')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          marginBottom: '1.25rem'
        }}
      >
        <ArrowLeft size={18} />
        <span>Back to Catalog</span>
      </button>

      <div className="pdp-grid">
        {/* Large Product Gallery */}
        <div className="pdp-gallery">
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            className="pdp-gallery-img"
          />

          {/* Quick Try-On Overlay floating badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(255, 42, 95, 0.9)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(255,42,95,0.4)'
            }}
          >
            <Sparkles size={14} />
            <span>CAMERA TRY-ON READY</span>
          </div>
        </div>

        {/* Product Details & Actions */}
        <div className="pdp-info">
          <div>
            <span className="product-brand" style={{ fontSize: '0.85rem' }}>
              {selectedProduct.brand}
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '4px 0 8px' }}>
              {selectedProduct.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                ${selectedProduct.price}
              </span>
              {selectedProduct.originalPrice && (
                <span
                  style={{
                    fontSize: '1.1rem',
                    color: 'var(--text-light)',
                    textDecoration: 'line-through'
                  }}
                >
                  ${selectedProduct.originalPrice}
                </span>
              )}
              <div className="product-rating" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                <Star size={14} fill="#D97706" color="#D97706" />
                <span>{selectedProduct.rating} ({selectedProduct.reviewsCount} reviews)</span>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Color Selector */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Color: {selectedProduct.colorNames ? selectedProduct.colorNames[selectedProduct.colors.indexOf(selectedColor)] || 'Selected' : 'Standard'}
            </span>
            <div className="swatch-group">
              {selectedProduct.colors.map((hex, idx) => (
                <button
                  key={hex}
                  className={`color-swatch ${selectedColor === hex ? 'active' : ''}`}
                  style={{ background: hex }}
                  onClick={() => setSelectedColor(hex)}
                  title={selectedProduct.colorNames ? selectedProduct.colorNames[idx] : hex}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Size: {selectedSize}
              </span>
              <button
                onClick={() => setIsSizeGuideOpen(true)}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Ruler size={14} /> Size Guide
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {selectedProduct.sizes.map(size => (
                <button
                  key={size}
                  className={`size-pill ${selectedSize === size ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* HERO CTA BUTTON - VIRTUAL TRY-ON (HERO FEATURE) */}
          <div style={{ marginTop: '8px' }}>
            <button
              className="pdp-cta-tryon"
              onClick={() => openTryOn(selectedProduct)}
            >
              <Camera size={24} />
              <span>TRY THIS ON</span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <ShieldCheck size={16} color="var(--accent)" />
              <span>See how this looks on you using your camera.</span>
            </div>
          </div>

          {/* Secondary CTA - Add to Cart */}
          <button
            className="btn-secondary"
            onClick={() => addToCart(selectedProduct, selectedSize, selectedColor)}
            style={{ padding: '16px' }}
          >
            <ShoppingBag size={18} />
            <span>Add to Bag</span>
          </button>

          {/* Product Description */}
          <div style={{ marginTop: '12px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>
              Product Details
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {selectedProduct.description}
            </p>
          </div>
        </div>
      </div>

      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </div>
  );
};
