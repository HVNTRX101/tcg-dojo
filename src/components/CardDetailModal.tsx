import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Star, Package, Sparkles, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { PriceHistoryChart } from './PriceHistoryChart';
import { useState } from 'react';
import { useCart } from './CartContext';
import type { Card } from '../types/product.types';
import { PRICE_VARIANCE, CARD_SIZES } from '../constants';

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

interface CardDetailModalProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewSeller: (sellerId: string) => void;
}

// Mock price history data
const generatePriceHistory = (currentPrice: number) => {
  const data = [];
  const basePrice = currentPrice * PRICE_VARIANCE.BASE_FACTOR;
  const dates = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  for (let i = 0; i < dates.length; i++) {
    const variance = Math.random() * PRICE_VARIANCE.RANGE - PRICE_VARIANCE.OFFSET;
    const price =
      basePrice + (currentPrice - basePrice) * (i / (dates.length - 1)) + currentPrice * variance;
    data.push({
      date: dates[i],
      price: Math.max(price, currentPrice * PRICE_VARIANCE.MIN_FACTOR),
    });
  }

  return data;
};

// Mock reviews
const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    userName: 'CardCollector99',
    rating: 5,
    date: '2025-10-10',
    comment: 'Card arrived in perfect condition, exactly as described. Fast shipping!',
    verified: true,
  },
  {
    id: '2',
    userName: 'MagicPlayer42',
    rating: 4,
    date: '2025-10-08',
    comment: 'Great seller, card was well protected. Slightly slower shipping than expected.',
    verified: true,
  },
  {
    id: '3',
    userName: 'TCGEnthusiast',
    rating: 5,
    date: '2025-10-05',
    comment: 'Excellent communication and packaging. Will buy from again!',
    verified: true,
  },
];

export function CardDetailModal({ card, open, onOpenChange, onViewSeller }: CardDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!card) return null;

  const priceHistory = generatePriceHistory(card.price);
  const priceChange = ((card.price - priceHistory[0].price) / priceHistory[0].price) * 100;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Mythic Rare':
        return 'bg-orange-500 text-white';
      case 'Rare':
        return 'bg-yellow-500 text-black';
      case 'Uncommon':
        return 'bg-gray-400 text-black';
      case 'Special':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-300 text-black';
    }
  };

  const handleAddToCart = () => {
    addToCart(card, quantity);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-card dark:neon-border">
        <DialogHeader>
          <DialogTitle>{card.name}</DialogTitle>
          <DialogDescription>
            {card.set} • #{card.cardNumber} • {card.condition}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Image */}
          <div className="space-y-4">
            <div
              className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative"
              style={{ aspectRatio: CARD_SIZES.PRODUCT_ASPECT_RATIO }}
            >
              <ImageWithFallback
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover"
              />
              {card.finish === 'Foil' && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1.5 rounded-md flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Foil</span>
                </div>
              )}
              <div
                className={`absolute top-4 left-4 px-3 py-1.5 rounded-md ${getRarityColor(card.rarity)}`}
              >
                {card.rarity}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Market Price</p>
                <p className="text-xl text-primary">{formatPrice(card.price)}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">6M Change</p>
                <div className="flex items-center gap-1">
                  {priceChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {priceChange >= 0 ? '+' : ''}
                    {priceChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-4">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="price">Price History</TabsTrigger>
                <TabsTrigger value="seller">Seller</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Set</span>
                    <span>{card.set}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Card Number</span>
                    <span>#{card.cardNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Game</span>
                    <span>{card.game}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Condition</span>
                    <Badge variant="outline">{card.condition}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Finish</span>
                    <span>{card.finish}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>{card.quantity} in stock</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Quantity</p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(card.quantity, quantity + 1))}
                        disabled={quantity >= card.quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" size="lg" onClick={handleAddToCart}>
                      Add to Cart - {formatPrice(card.price * quantity)}
                    </Button>
                    <Button variant="outline" className="w-full">
                      Add to Watchlist
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="price" className="space-y-4">
                <div>
                  <h4 className="mb-4">6 Month Price Trend</h4>
                  <PriceHistoryChart data={priceHistory} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Lowest (6M)</p>
                    <p>{formatPrice(Math.min(...priceHistory.map(d => d.price)))}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Highest (6M)</p>
                    <p>{formatPrice(Math.max(...priceHistory.map(d => d.price)))}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seller" className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4>{card.seller}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{card.sellerRating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">(324 reviews)</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onViewSeller(card.seller)}>
                      View Profile
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Member Since</p>
                      <p>Jan 2020</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Sales</p>
                      <p>1,247</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3">Recent Reviews</h4>
                  <div className="space-y-3">
                    {MOCK_REVIEWS.map(review => (
                      <div key={review.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm">{review.userName}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        {review.verified && (
                          <Badge variant="secondary" className="text-xs">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
