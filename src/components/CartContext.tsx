import { createContext, useContext, useState, ReactNode } from 'react';
import type { Product } from '../types/product.types';

// Type alias for backwards compatibility
export type Card = Product;

export interface CartItem extends Product {
  cartQuantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (card: Product, quantity?: number) => void;
  removeFromCart: (cardId: string) => void;
  updateQuantity: (cardId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (card: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === card.id);

      if (existingItem) {
        return prev.map(item =>
          item.id === card.id
            ? { ...item, cartQuantity: Math.min(item.cartQuantity + quantity, item.quantity) }
            : item
        );
      }

      return [...prev, { ...card, cartQuantity: quantity }];
    });
  };

  const removeFromCart = (cardId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cardId));
  };

  const updateQuantity = (cardId: string, quantity: number) => {
    setCartItems(prev =>
      prev
        .map(item =>
          item.id === cardId
            ? { ...item, cartQuantity: Math.max(0, Math.min(quantity, item.quantity)) }
            : item
        )
        .filter(item => item.cartQuantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.cartQuantity, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.cartQuantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
