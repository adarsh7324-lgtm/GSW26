import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, ArrowLeft, PackageCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Checkout = () => {
  const { cart, getCartTotal, placeOrder, orderConfirmed, setOrderConfirmed, setActivePage } = useApp();

  const [formData, setFormData] = useState({
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 234-5678',
    address: '742 Fashion Boulevard, Suite 4B',
    city: 'New York',
    zip: '10001',
    paymentMethod: 'card'
  });

  const total = getCartTotal();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    placeOrder(formData);
  };

  // Trigger confetti burst on order confirmation
  useEffect(() => {
    if (orderConfirmed) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [orderConfirmed]);

  if (orderConfirmed) {
    return (
      <div
        style={{
          maxWidth: '560px',
          margin: '2rem auto',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}
        >
          <CheckCircle2 size={40} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>
          Order Confirmed 🎉
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Thank you for shopping with <strong>VybeFit</strong>! Your virtual try-on selections are being prepared.
        </p>

        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Order Number</span>
            <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--accent)' }}>
              {orderConfirmed.orderId}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Estimated Delivery</span>
            <strong>{orderConfirmed.estimatedDelivery}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Shipping Address</span>
            <span>{orderConfirmed.shippingAddress}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Amount Paid</span>
            <strong style={{ fontSize: '1.1rem' }}>${orderConfirmed.total}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={() => {
              setOrderConfirmed(null);
              setActivePage('home');
            }}
          >
            Return to Home
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setOrderConfirmed(null);
              setActivePage('catalog');
            }}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2>Your bag is empty</h2>
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActivePage('catalog')}>
          Browse Fashion Catalog
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem 1.25rem 3rem' }}>
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
        <span>Back to Shopping</span>
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        Demo Checkout
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* 1. Contact & Shipping Address */}
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--accent)" />
              1. Delivery Address
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="form-input"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Street Address</label>
                <input
                  type="text"
                  name="address"
                  required
                  className="form-input"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>City</label>
                <input
                  type="text"
                  name="city"
                  required
                  className="form-input"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Postal / ZIP Code</label>
                <input
                  type="text"
                  name="zip"
                  required
                  className="form-input"
                  value={formData.zip}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* 2. Payment Method */}
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="var(--accent)" />
              2. Payment Method
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'card', label: 'Credit / Debit Card (Demo Instant)', icon: '💳' },
                { id: 'upi', label: 'UPI / Instant Pay', icon: '⚡' },
                { id: 'cod', label: 'Cash on Delivery', icon: '💵' }
              ].map(method => (
                <label
                  key={method.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${formData.paymentMethod === method.id ? 'var(--accent)' : 'var(--border-color)'}`,
                    background: formData.paymentMethod === method.id ? 'var(--accent-light)' : 'transparent',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={formData.paymentMethod === method.id}
                    onChange={handleChange}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>{method.icon} {method.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Order Summary & Place Order */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageCheck size={18} color="var(--accent)" />
            Order Summary ({cart.length} items)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span>{item.quantity}x {item.product.name} ({item.size})</span>
                <strong>${item.product.price * item.quantity}</strong>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem' }}>
            <span>Total Payable</span>
            <span style={{ color: 'var(--accent)' }}>${total}</span>
          </div>

          <button type="submit" className="btn-accent" style={{ padding: '16px', fontSize: '1.05rem' }}>
            <ShieldCheck size={20} />
            <span>Place Order</span>
          </button>
        </div>
      </form>
    </div>
  );
};
