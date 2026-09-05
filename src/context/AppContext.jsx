import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRODUCTS } from '../data/products';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activePage, setActivePage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnGarments, setTryOnGarments] = useState([PRODUCTS[0]]);
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

  const addToTryOnOutfit = (product) => {
    setTryOnGarments(prev => {
      // Filter out existing item of same layer type or duplicate ID
      const filtered = prev.filter(g => g.overlayType !== product.overlayType && g.id !== product.id);
      return [...filtered, product];
    });
  };

  const removeFromTryOnOutfit = (productId) => {
    setTryOnGarments(prev => prev.filter(g => g.id !== productId));
  };

  const addToHistory = (product) => {
    setTryOnHistory(prev => {
      if (prev.some(item => item.product.id === product.id)) return prev;
      return [{ product, timestamp: 'Just now' }, ...prev];
    });
  };

  const addToCart = (product = selectedProduct, size = selectedSize, color = selectedColor) => {
    const itemColor = color || product.colors[0];
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
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const placeOrder = (orderDetails) => {
    const newOrder = {
      orderId: 'VYBE-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
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
        activePage,
        setActivePage,
        selectedProduct,
        setSelectedProduct,
        openProductDetail,
        isTryOnOpen,
        openTryOn,
        closeTryOn,
        tryOnGarments,
        addToTryOnOutfit,
        removeFromTryOnOutfit,
        selectedSize,
        setSelectedSize,
        selectedColor,
        setSelectedColor,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        getCartTotal,
        isCartOpen,
        setIsCartOpen,
        tryOnHistory,
        isHistoryOpen,
        setIsHistoryOpen,
        searchQuery,
        setSearchQuery,
        selectedGender,
        setSelectedGender,
        selectedCategory,
        setSelectedCategory,
        priceRange,
        setPriceRange,
        sortBy,
        setSortBy,
        orderConfirmed,
        setOrderConfirmed,
        placeOrder
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
