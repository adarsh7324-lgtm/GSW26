import React from 'react';
import { useApp } from '../context/AppContext';
import { Layers, X, Plus, ShoppingBag } from 'lucide-react';

export const OutfitBuilder = ({ isOpen, onClose }) => {
  const { tryOnGarments, removeFromTryOnOutfit, addToCart } = useApp();

  if (!isOpen) return null;

  const totalOutfitPrice = tryOnGarments.reduce((sum, g) => sum + g.price, 0);

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#18181A', color: 'white' }}
      >
        <div className="drawer-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
              Outfit Layers ({tryOnGarments.length})
            </h3>
          </div>
          <button className="tryon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <p style={{ fontSize: '0.82rem', color: '#AAA', marginBottom: '1rem' }}>
            Combine tops, bottoms, and outerwear into a custom outfit rendered live on camera.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tryOnGarments.map((garment) => (
              <div
                key={garment.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <img
                  src={garment.image}
                  alt={garment.name}
                  style={{ width: '48px', height: '60px', borderRadius: '6px', objectFit: 'cover' }}
                />

                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      background: 'rgba(255,42,95,0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {garment.overlayType}
                  </span>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white', marginTop: '2px' }}>
                    {garment.name}
                  </h4>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DDD' }}>
                    ${garment.price}
                  </span>
                </div>

                <button
                  onClick={() => removeFromTryOnOutfit(garment.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#AAA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="drawer-footer" style={{ background: '#121212', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'white' }}>
            <span style={{ fontWeight: 600, color: '#AAA' }}>Total Outfit Price</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>${totalOutfitPrice}</span>
          </div>

          <button
            className="btn-accent"
            onClick={() => {
              tryOnGarments.forEach(g => addToCart(g));
              onClose();
            }}
          >
            <ShoppingBag size={18} />
            <span>Add Entire Outfit to Bag</span>
          </button>
        </div>
      </div>
    </div>
  );
};
