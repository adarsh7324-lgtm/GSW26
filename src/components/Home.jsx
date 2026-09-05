import React from 'react';
import { useApp } from '../context/AppContext';
import { PRODUCTS, CATEGORIES, GENDERS } from '../data/products';
import { ProductCard } from './ProductCard';
import { Camera, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export const Home = () => {
  const {
    openTryOn,
    setActivePage,
    selectedCategory,
    setSelectedCategory,
    selectedGender,
    setSelectedGender
  } = useApp();

  const trendingProducts = PRODUCTS.slice(0, 8);

  return (
    <div>
      {/* Category Pills Navigation */}
      <div className="nav-categories">
        {GENDERS.map(gender => (
          <button
            key={gender}
            className={`cat-pill ${selectedGender === gender ? 'active' : ''}`}
            onClick={() => {
              setSelectedGender(gender);
              setActivePage('catalog');
            }}
          >
            {gender}
          </button>
        ))}
      </div>

      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div className="hero-bg-pattern" />

        <div className="hero-tag">
          <Sparkles size={14} />
          <span>Real-Time AR Camera Try-On</span>
        </div>

        <h1 className="hero-title">
          See it on you.<br />Before you buy.
        </h1>

        <p className="hero-subtitle">
          Experience live camera virtual try-on. See garments automatically scale and move on your body in real time before placing an order.
        </p>

        <button className="btn-hero" onClick={() => openTryOn()}>
          <Camera size={20} />
          <span>Try Virtual Try-On</span>
        </button>
      </div>

      {/* Value Props Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          padding: '0 1.25rem 1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)' }}>Camera AR</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Pose Tracking</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)' }}>Outfit Builder</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Layer Tops & Bottoms</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)' }}>Fit Score</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Size Confidence</div>
        </div>
      </div>

      {/* Featured Trending Products */}
      <div className="products-section" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Trending Styles</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tap any item to try it live on your camera stream.
            </p>
          </div>

          <button
            onClick={() => setActivePage('catalog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--accent)'
            }}
          >
            <span>View All</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="product-grid">
          {trendingProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};
