import React from 'react';
import { Camera, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProductCard = ({ product }) => {
  const { openProductDetail, openTryOn } = useApp();

  return (
    <div className="product-card">
      <div className="product-img-wrapper" onClick={() => openProductDetail(product)}>
        <img
          src={product.image}
          alt={product.name}
          className="product-img"
          loading="lazy"
        />

        {/* Quick Hero Try-On Badge Button */}
        <button
          className="try-on-badge-btn"
          onClick={(e) => {
            e.stopPropagation();
            openTryOn(product);
          }}
          title="Try garment live on camera"
        >
          <Camera size={14} />
          <span>Try On</span>
        </button>
      </div>

      <div className="product-details" onClick={() => openProductDetail(product)}>
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name">{product.name}</h3>

        <div className="product-bottom-row">
          <span className="product-price">${product.price}</span>
          <div className="product-rating">
            <Star size={12} fill="#D97706" color="#D97706" />
            <span>{product.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
