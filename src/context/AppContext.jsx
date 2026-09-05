import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRODUCTS } from '../data/products';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activePage, setActivePage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnGarments, setTryOnGarments] = useState([]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState(null);
  const [cart, setCart] = useState([
    { product: PRODUCTS[0], size: 'M', color: PRODUCTS[0].colors[0], quantity: 1 }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tryOnHistory, setTryOnHistory] = useState([
    { product: PRODUCTS[0], timestamp: 'Just now' },
    { product: PRODUCTS[1], timestamp: '10 mins ago' },
    { product: PRODUCTS[4], timestamp: '1 hour ago' }
  ]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState(200);
  const [sortBy, setSortBy] = useState('popular');
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  // Synchronize color selection when selectedProduct changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.colors) {
      setSelectedColor(selectedProduct.colors[0]);
    }
  }, [selectedProduct]);

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setActivePage('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTryOn = (product = null) => {
    const itemToTry = product || selectedProduct || PRODUCTS[0];
    addToTryOnOutfit(itemToTry);
    addToHistory(itemToTry);
    setIsTryOnOpen(true);
  };

  const closeTryOn = () => {
    setIsTryOnOpen(false);
  };

  /**
   * Add a garment to the active try-on outfit.
   * Multiple garments of the SAME templateId can now coexist (layering).
   * A garment with the same `id` replaces the existing one.
   */
  const addToTryOnOutfit = (garment) => {
    setTryOnGarments(prev => {
      // Replace exact same id (re-selection = no duplicate)
      const filtered = prev.filter(g => g.id !== garment.id);
      // Ensure defaults
      const normalized = {
        visible: true,
        opacity: 1,
        ...garment,
      };
      return [...filtered, normalized];
    });
  };

  const removeFromTryOnOutfit = (garmentId) => {
    setTryOnGarments(prev => prev.filter(g => g.id !== garmentId));
  };

  /**
   * Add an uploaded garment (with a processed garmentCanvas) to the outfit.
   * Exposed separately so GarmentUploader can call it.
   */
  const addUploadedGarment = async (garment) => {
    addToTryOnOutfit(garment);
  };

  /**
   * Toggle a garment layer's visibility (hide/show without removing it).
   */
  const toggleGarmentVisibility = (garmentId) => {
    setTryOnGarments(prev =>
      prev.map(g =>
        g.id === garmentId ? { ...g, visible: !(g.visible !== false) } : g
      )
    );
  };

  /**
   * Move a garment up or down in the render stack.
   * 'up' means higher z-order (rendered later = visually on top).
   */
  const moveGarmentLayer = (garmentId, direction) => {
    setTryOnGarments(prev => {
      const idx = prev.findIndex(g => g.id === garmentId);
      if (idx === -1) return prev;

      const next = [...prev];
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;

      // Swap
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const addToHistory = (product) => {
    setTryOnHistory(prev => {
      if (prev.some(item => item.product.id === product.id)) return prev;
      return [{ product, timestamp: 'Just now' }, ...prev];
    });
  };

  const addToCart = (product = selectedProduct, size = selectedSize, color = selectedColor) => {
    const itemColor = color || (product.colors && product.colors[0]) || '#000';
    setCart(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.size === size && item.color === itemColor
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, { product, size, color: itemColor, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) return updated.filter((_, i) => i !== index);
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const getCartTotal = () =>
    cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

  const placeOrder = (orderDetails) => {
    const newOrder = {
      orderId: 'VYBE-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      }),
      items: [...cart],
      total: getCartTotal(),
      shippingAddress: orderDetails.address || '123 Fashion Ave, NY'
    };
    setOrderConfirmed(newOrder);
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        // Navigation
        activePage, setActivePage,
        selectedProduct, setSelectedProduct,
        openProductDetail,

        // Try-On
        isTryOnOpen, openTryOn, closeTryOn,
        tryOnGarments,
        addToTryOnOutfit,
        removeFromTryOnOutfit,
        addUploadedGarment,
        toggleGarmentVisibility,
        moveGarmentLayer,

        // Size & Color
        selectedSize, setSelectedSize,
        selectedColor, setSelectedColor,

        // Cart
        cart, addToCart, updateCartQuantity, removeFromCart, getCartTotal,
        isCartOpen, setIsCartOpen,

        // History
        tryOnHistory, isHistoryOpen, setIsHistoryOpen,

        // Catalog filters
        searchQuery, setSearchQuery,
        selectedGender, setSelectedGender,
        selectedCategory, setSelectedCategory,
        priceRange, setPriceRange,
        sortBy, setSortBy,

        // Orders
        orderConfirmed, setOrderConfirmed, placeOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
