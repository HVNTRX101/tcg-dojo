// Cart Types
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  condition: string;
  quantity: number;
  cartQuantity: number;
  game: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  cart: Cart;
  message?: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
  sellerId?: string;
  condition?: string;
}

export interface UpdateCartItemRequest {
  itemId: string;
  quantity: number;
}

export interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
}
