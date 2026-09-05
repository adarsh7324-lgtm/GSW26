import React from 'react';
import { useApp } from '../context/AppContext';
import { PRODUCTS, CATEGORIES, GENDERS } from '../data/products';
import { ProductCard } from './ProductCard';
import { Search, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

export const ProductCatalog = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedGender,
    setSelectedGender,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy
  } = useApp();

  // Filter products based on active criteria
  const filteredProducts = PRODUCTS.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGender =
      selectedGender === 'All' ||
      product.gender === selectedGender ||
      product.gender === 'Unisex';

    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;

    const matchesPrice = product.price <= priceRange;

    return matchesSearch && matchesGender && matchesCategory && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // Default popular
  });

  return (
    <div className="products-section" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Title & Search Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Explore Collection
        </h1>

        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8E8E93'
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '44px' }}
            placeholder="Search tops, jackets, jeans, dresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Gender Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', overflowX: 'auto' }}>
        {GENDERS.map(gender => (
          <button
            key={gender}
            className={`cat-pill ${selectedGender === gender ? 'active' : ''}`}
            onClick={() => setSelectedGender(gender)}
          >
            {gender}
          </button>
        ))}
      </div>

      {/* Category Pills */}
      <div className="nav-categories" style={{ padding: '0 0 1rem 0', background: 'transparent' }}>
        {CATEGORIES.map(category => (
          <button
            key={category}
            className={`cat-pill ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Toolbar: Filters & Sort */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          padding: '12px 16px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
            {filteredProducts.length} Items
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={14} />
            <span>Max ${priceRange}</span>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              style={{ width: '80px', accentColor: 'var(--accent)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: 700,
              color: 'var(--text-main)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="popular">Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-color)'
          }}
        >
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            No products found matching your filters.
          </p>
          <button
            className="btn-secondary"
            style={{ marginTop: '1rem', width: 'auto', display: 'inline-flex' }}
            onClick={() => {
              setSearchQuery('');
              setSelectedGender('All');
              setSelectedCategory('All');
              setPriceRange(250);
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
