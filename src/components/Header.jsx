import React from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Camera, Search, Sparkles, Clock, Layers } from 'lucide-react';
import { CATEGORIES } from '../data/products';

export const Header = () => {
  const {
    activePage,
    setActivePage,
    cart,
    setIsCartOpen,
    tryOnHistory,
    setIsHistoryOpen,
    openTryOn,
    selectedCategory,
    setSelectedCategory
  } = useApp();

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="header">
      {/* Brand Logo & Tag */}
      <div className="logo-container" onClick={() => setActivePage('home')}>
        <div className="logo-mark">V</div>
        <div>
          <span className="logo-text">VybeFit</span>
          <span className="logo-tag" style={{ marginLeft: '6px' }}>TRY-ON</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="header-actions">
        <button
          className="icon-btn"
          title="Search Catalog"
          onClick={() => setActivePage('catalog')}
        >
          <Search size={19} />
        </button>

        <button
          className="icon-btn"
          title="Try-On History"
          onClick={() => setIsHistoryOpen(true)}
        >
          <Clock size={19} />
          {tryOnHistory.length > 0 && (
            <span className="badge-count" style={{ background: '#2563EB' }}>
              {tryOnHistory.length}
            </span>
          )}
        </button>

        <button
          className="icon-btn"
          title="Camera Virtual Try-On"
          onClick={() => openTryOn()}
          style={{ background: '#FF2A5F', color: 'white', borderColor: '#FF2A5F' }}
        >
          <Camera size={19} />
        </button>

        <button
          className="icon-btn"
          title="Shopping Cart"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingBag size={19} />
          {totalCartCount > 0 && (
            <span className="badge-count">{totalCartCount}</span>
          )}
        </button>
      </div>
    </header>
  );
};
