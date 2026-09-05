import React from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Camera, X, ArrowRight } from 'lucide-react';

export const TryOnHistory = () => {
  const {
    isHistoryOpen,
    setIsHistoryOpen,
    tryOnHistory,
    openTryOn,
    openProductDetail
  } = useApp();

  if (!isHistoryOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={() => setIsHistoryOpen(false)} style={{ zIndex: 1000 }}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Recently Tried</h3>
          </div>
          <button className="icon-btn" onClick={() => setIsHistoryOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {tryOnHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Camera size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 700 }}>No recently tried garments yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Tap "Try On" on any product to see how it looks on you!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {tryOnHistory.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    style={{
                      width: '60px',
                      height: '75px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setIsHistoryOpen(false);
                      openProductDetail(item.product);
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {item.product.brand} • {item.timestamp}
                    </span>
                    <h4
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        margin: '2px 0',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setIsHistoryOpen(false);
                        openProductDetail(item.product);
                      }}
                    >
                      {item.product.name}
                    </h4>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                      ${item.product.price}
                    </span>
                  </div>

                  <button
                    className="btn-accent"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      width: 'auto',
                      borderRadius: 'var(--radius-full)'
                    }}
                    onClick={() => {
                      setIsHistoryOpen(false);
                      openTryOn(item.product);
                    }}
                  >
                    <Camera size={14} />
                    <span>Try Again</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
