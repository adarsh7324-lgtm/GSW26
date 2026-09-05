import React from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, X, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

export const Cart = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    getCartTotal,
    setActivePage
  } = useApp();

  if (!isCartOpen) return null;

  const total = getCartTotal();
  const shipping = total > 0 ? 0 : 0; // Free shipping promo

  return (
    <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)} style={{ zIndex: 1000 }}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Shopping Bag</h3>
          </div>
          <button className="icon-btn" onClick={() => setIsCartOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your bag is empty</p>
              <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>
                Discover stylish garments and try them on live before buying.
              </p>
              <button
                className="btn-primary"
                style={{ marginTop: '1.5rem', width: 'auto', display: 'inline-flex' }}
                onClick={() => {
                  setIsCartOpen(false);
                  setActivePage('catalog');
                }}
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    style={{ width: '70px', height: '90px', borderRadius: '8px', objectFit: 'cover' }}
                  />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {item.product.brand}
                        </span>
                        <button
                          onClick={() => removeFromCart(index)}
                          style={{ color: 'var(--text-light)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '2px 0 6px' }}>
                        {item.product.name}
                      </h4>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>Size: <strong>{item.size}</strong></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Color:
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: item.color || '#1A1A1A',
                              display: 'inline-block',
                              border: '1px solid #CCC'
                            }}
                          />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'var(--bg-subtle)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <button onClick={() => updateCartQuantity(index, -1)}>
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(index, 1)}>
                          <Plus size={14} />
                        </button>
                      </div>

                      <span style={{ fontWeight: 800, fontSize: '1rem' }}>
                        ${item.product.price * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>${total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Standard Delivery</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>FREE</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total</span>
                <span>${total}</span>
              </div>
            </div>

            <button
              className="btn-accent"
              onClick={() => {
                setIsCartOpen(false);
                setActivePage('checkout');
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
