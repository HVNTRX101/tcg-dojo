// Product Types
export interface Product {
  id: string;
  name: string;
  set: string;
  cardNumber: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Mythic Rare' | 'Special';
  price: number;
  condition: 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';
  finish: 'Normal' | 'Foil';
  image: string;
  seller: string;
  sellerRating: number;
  quantity: number;
  game: string;
  description?: string;
  releaseDate?: string;
  marketPrice?: number;
}

// Type alias for backwards compatibility (Card is the same as Product in this TCG marketplace)
export type Card = Product;

export interface ProductListing {
  id: string;
  productId: string;
  seller: string;
  condition: string;
  price: number;
  quantity: number;
  shipping: number;
  totalRatings: number;
  rating: number;
  sellerId: string;
}

export interface ProductFilter {
  game?: string;
  set?: string;
  rarity?: string;
  condition?: string;
  finish?: string;
  priceRange?: [number, number];
  search?: string;
  sortBy?: string;
}

export interface PriceHistory {
  date: string;
  price: number;
}

export interface GameData {
  name: string;
  bannerImage: string;
  color: string;
  sets: GameSet[];
  decks: GameDeck[];
  articles: GameArticle[];
}

export interface GameSet {
  name: string;
  code: string;
  releaseDate: string;
  image: string;
}

export interface GameDeck {
  name: string;
  count: number;
}

export interface GameArticle {
  title: string;
  date: string;
  author: string;
}
