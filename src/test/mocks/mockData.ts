import type { Product } from '../../types/product.types';

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER' as const,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockProduct: Product = {
  id: '1',
  name: 'Black Lotus',
  set: 'Alpha',
  cardNumber: '001',
  rarity: 'Rare' as const,
  price: 10000,
  condition: 'Near Mint' as const,
  finish: 'Normal' as const,
  image: 'https://example.com/black-lotus.jpg',
  seller: 'Premium Cards Inc',
  sellerRating: 4.8,
  quantity: 5,
  game: 'Magic: The Gathering',
  description: 'A powerful and rare card',
};

export const mockProducts: Product[] = [
  mockProduct,
  {
    id: '2',
    name: 'Mox Ruby',
    set: 'Alpha',
    cardNumber: '002',
    rarity: 'Rare' as const,
    price: 5000,
    condition: 'Near Mint' as const,
    finish: 'Foil' as const,
    image: 'https://example.com/mox-ruby.jpg',
    seller: 'Premium Cards Inc',
    sellerRating: 4.8,
    quantity: 10,
    game: 'Magic: The Gathering',
  },
  {
    id: '3',
    name: 'Time Walk',
    set: 'Alpha',
    cardNumber: '003',
    rarity: 'Mythic Rare' as const,
    price: 8000,
    condition: 'Lightly Played' as const,
    finish: 'Normal' as const,
    image: 'https://example.com/time-walk.jpg',
    seller: 'Card Collector',
    sellerRating: 4.5,
    quantity: 3,
    game: 'Magic: The Gathering',
  },
];

export const mockAuthResponse = {
  user: mockUser,
  token: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};
