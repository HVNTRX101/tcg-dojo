export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'D';
export type GameType = 'Pokemon' | 'MTG' | 'Yu-Gi-Oh' | 'Lorcana' | 'Other';
export type ListingStatus = 'available' | 'sold';

export interface Listing {
  id: string;
  cardId: string;
  sellerId: string;
  sellerName: string;
  price: number; // stored in USD cents (e.g. 999 = $9.99)
  condition: CardCondition;
  quantity: number;
  images: string[];
  gameType: GameType;
  status: ListingStatus;
  cardName: string; // denormalized for client-side search
  createdAt: Date;
}
