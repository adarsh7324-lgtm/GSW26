import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetail } from './components/ProductDetail';
import { Checkout } from './components/Checkout';
import { TryOnCanvas } from './components/TryOnCanvas';
import { Cart } from './components/Cart';
import { TryOnHistory } from './components/TryOnHistory';
import { Camera, Sparkles, Heart } from 'lucide-react';

const AppContent = () => {
  const { activePage, openTryOn } = useApp();

  return (
    <div className="app-container">
      <Header />

      <main className="main-content">
        {activePage === 'home' && <Home />}
        {activePage === 'catalog' && <ProductCatalog />}
        {activePage === 'detail' && <ProductDetail />}
        {activePage === 'checkout' && <Checkout />}
      </main>

      {/* Hero Try-On Modal Screen */}
      <TryOnCanvas />

      {/* Cart Drawer */}
      <Cart />

      {/* Try-On History Drawer */}
      <TryOnHistory />

      {/* Floating Bottom Quick Try-On Action for Mobile */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 90
        }}
      >
        <button
          onClick={() => openTryOn()}
          style={{
            background: 'var(--accent)',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.9rem',
            padding: '14px 22px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(255, 42, 95, 0.45)',
            border: '2px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <Camera size={20} />
          <span>Try Virtual Try-On</span>
        </button>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          padding: '2rem 1.25rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>
          VybeFit
        </div>
        <p style={{ fontStyle: 'italic', marginBottom: '12px' }}>
          "Try clothes. Before you buy."
        </p>
        <p style={{ fontSize: '0.78rem' }}>
          © 2026 VybeFit Inc. Powered by Pose-Aware AR Garment Engine.
        </p>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
