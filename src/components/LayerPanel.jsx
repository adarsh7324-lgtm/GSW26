import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Eye, EyeOff, ChevronUp, ChevronDown, ShoppingBag, Layers } from 'lucide-react';

/**
 * LayerPanel — real-time garment layer manager.
 *
 * Shows active garment layers with controls to:
 *  - Toggle visibility (eye icon)
 *  - Move layer up/down in render order
 *  - Remove layer (X)
 *  - Add all to cart
 */
export const LayerPanel = ({ isOpen, onClose }) => {
  const {
    tryOnGarments,
    removeFromTryOnOutfit,
    toggleGarmentVisibility,
    moveGarmentLayer,
    addToCart,
  } = useApp();

  if (!isOpen) return null;

  const totalPrice = tryOnGarments
    .filter(g => g.price > 0)
    .reduce((s, g) => s + g.price, 0);

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="drawer-content"
        onClick={e => e.stopPropagation()}
        style={{ background: '#18181A', color: 'white' }}
      >
        {/* Header */}
        <div className="drawer-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>
              Outfit Layers ({tryOnGarments.length})
            </h3>
          </div>
          <button className="tryon-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Layer list */}
        <div className="drawer-body">
          {tryOnGarments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#666' }}>
              <Layers size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.92rem' }}>No garments in try-on yet.</p>
              <p style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>
                Select garments from the library below.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Note: rendered top → bottom means bottom = rendered last = visually on top */}
              {[...tryOnGarments].reverse().map((garment, revIdx) => {
                const idx = tryOnGarments.length - 1 - revIdx;
                const isHidden = garment.visible === false;
                return (
                  <div
                    key={garment.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      background: isHidden ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      opacity: isHidden ? 0.5 : 1, transition: 'opacity 0.15s',
                    }}
                  >
                    {/* Thumbnail */}
                    {garment.image ? (
                      <img
                        src={garment.image}
                        alt={garment.name}
                        style={{ width: '44px', height: '54px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: '44px', height: '54px', borderRadius: '6px', flexShrink: 0,
                        background: garment.overlayColor || '#333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}>👕</div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                        color: 'var(--accent)', marginBottom: '2px'
                      }}>
                        {garment.templateId || garment.overlayType}
                      </div>
                      <div style={{
                        fontSize: '0.85rem', fontWeight: 700, color: 'white',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {garment.name}
                      </div>
                      {garment.price > 0 && (
                        <div style={{ fontSize: '0.80rem', color: '#AAA', marginTop: '1px' }}>
                          ${garment.price}
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {/* Up/Down */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          disabled={idx === tryOnGarments.length - 1}
                          onClick={() => moveGarmentLayer(garment.id, 'up')}
                          style={{
                            width: '24px', height: '24px', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.08)', color: '#CCC',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: idx === tryOnGarments.length - 1 ? 0.3 : 1,
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          disabled={idx === 0}
                          onClick={() => moveGarmentLayer(garment.id, 'down')}
                          style={{
                            width: '24px', height: '24px', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.08)', color: '#CCC',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: idx === 0 ? 0.3 : 1,
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Visibility */}
                      <button
                        onClick={() => toggleGarmentVisibility(garment.id)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.08)', color: isHidden ? '#666' : '#CCC',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromTryOnOutfit(garment.id)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '6px',
                          background: 'rgba(239,68,68,0.12)', color: '#F87171',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {tryOnGarments.length > 0 && (
          <div className="drawer-footer" style={{ background: '#121212', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', marginBottom: '12px' }}>
              <span style={{ color: '#AAA', fontWeight: 600 }}>Outfit Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                {totalPrice > 0 ? `$${totalPrice}` : 'Free'}
              </span>
            </div>
            <button
              className="btn-accent"
              onClick={() => { tryOnGarments.forEach(g => g.price > 0 && addToCart(g)); onClose(); }}
            >
              <ShoppingBag size={18} />
              <span>Add Outfit to Bag</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
