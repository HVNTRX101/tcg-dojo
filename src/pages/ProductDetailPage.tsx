import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ShoppingCart, Star, ArrowLeft } from 'lucide-react';
import { useCart } from '../components/CartContext';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { ProductCard } from '../components/ProductCard';
import { Card } from '../types/product.types';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Listing {
  id: string;
  seller: string;
  condition: string;
  price: number;
  quantity: number;
  shipping: number;
  totalRatings: number;
  rating: number;
}

const mockListings: Listing[] = [
  {
    id: '1',
    seller: 'CardKingdom',
    condition: 'Near Mint',
    price: 64.44,
    quantity: 1,
    shipping: 0,
    totalRatings: 18500,
    rating: 5,
  },
  {
    id: '2',
    seller: 'StarCityGames',
    condition: 'Near Mint',
    price: 65.99,
    quantity: 2,
    shipping: 0,
    totalRatings: 12300,
    rating: 5,
  },
  {
    id: '3',
    seller: 'MagicMart124',
    condition: 'Near Mint',
    price: 66.5,
    quantity: 1,
    shipping: 2.99,
    totalRatings: 850,
    rating: 4.9,
  },
  {
    id: '4',
    seller: 'GamerzParadise',
    condition: 'Lightly Played',
    price: 58.99,
    quantity: 3,
    shipping: 1.99,
    totalRatings: 430,
    rating: 4.8,
  },
  {
    id: '5',
    seller: 'CollectorCorner',
    condition: 'Near Mint',
    price: 67.25,
    quantity: 1,
    shipping: 0,
    totalRatings: 6700,
    rating: 4.95,
  },
  {
    id: '6',
    seller: 'ProCards',
    condition: 'Near Mint',
    price: 68.0,
    quantity: 2,
    shipping: 3.5,
    totalRatings: 2100,
    rating: 4.7,
  },
  {
    id: '7',
    seller: 'UltraGames',
    condition: 'Moderately Played',
    price: 52.99,
    quantity: 1,
    shipping: 1.5,
    totalRatings: 950,
    rating: 4.6,
  },
  {
    id: '8',
    seller: 'CardMaster99',
    condition: 'Near Mint',
    price: 69.99,
    quantity: 4,
    shipping: 0,
    totalRatings: 3200,
    rating: 4.85,
  },
];

const relatedProducts = [
  {
    id: 'related-1',
    name: 'Mega Evolution 2 Pack Blister',
    set: 'MEW2: Mega Evolution',
    cardNumber: '001',
    price: 52.99,
    image: 'https://images.unsplash.com/photo-1664997296099-5a0b63ab0196?w=300',
    rarity: 'Rare' as const,
    condition: 'Near Mint' as const,
    finish: 'Normal' as const,
    seller: 'CardKingdom',
    sellerRating: 4.9,
    quantity: 10,
    game: 'Pokémon',
  },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock product data - in real app, this would come from API
  const mockProduct: Card = {
    id: id || '1',
    name: 'Lightning Bolt',
    set: 'Alpha Edition',
    cardNumber: '161',
    rarity: 'Common',
    price: 299.99,
    condition: 'Near Mint',
    finish: 'Normal',
    image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop',
    seller: 'CardVault Pro',
    sellerRating: 4.9,
    quantity: 1,
    game: 'Magic: The Gathering',
  };

  const [selectedCondition, setSelectedCondition] = useState(mockProduct.condition);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [_quantity, _setQuantity] = useState(1);
  const { addToCart } = useCart();

  // Generate mock price history data with stable random values.
  // Use useState with initializer function to generate random prices once on mount
  const [priceHistoryData] = useState(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const randomVariation = 0.85 + Math.random() * 0.3;
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        price: mockProduct.price * randomVariation,
      };
    });
  });

  const productInfo = {
    id: mockProduct.id,
    name: mockProduct.name,
    set: mockProduct.set,
    game: mockProduct.game,
    productLine: mockProduct.game,
    setCode: mockProduct.cardNumber,
    releaseDate: 'October 2023',
    image: mockProduct.image,
    marketPrice: mockProduct.price,
    description: `Premium ${mockProduct.game} trading card from the ${mockProduct.set} set. This ${mockProduct.rarity} card is in ${mockProduct.condition} condition with ${mockProduct.finish} finish. A highly sought-after card perfect for collectors and competitive players alike.`,
  };

  const handleAddToCart = (listing: Listing) => {
    addToCart({
      id: listing.id,
      name: productInfo.name,
      price: listing.price + listing.shipping,
      image: productInfo.image,
      seller: listing.seller,
      condition: listing.condition,
      quantity: 1,
    });
    toast.success('Added to cart!');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Breadcrumb */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </motion.button>
            <div className="text-sm text-muted-foreground hidden md:block">
              <button onClick={() => navigate('/')} className="hover:underline">
                Home
              </button>
              {' > '}
              <span className="hover:underline cursor-pointer">{productInfo.game}</span>
              {' > '}
              <span className="hover:underline cursor-pointer">{productInfo.set}</span>
              {' > '}
              <span className="text-foreground">{productInfo.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Product Image */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card rounded-lg shadow-lg dark:shadow-[0_0_30px_rgba(192,38,211,0.15)] p-6 sticky top-4 dark:neon-border"
            >
              <ImageWithFallback
                src={productInfo.image}
                alt={productInfo.name}
                className="w-full rounded-lg mb-4 hover:scale-105 transition-transform duration-300"
                lazy={false}
              />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Set:</span>
                  <span>{productInfo.set}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game:</span>
                  <span>{productInfo.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Number:</span>
                  <span>{productInfo.setCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Rarity:</span>
                  <Badge variant="secondary" className="dark:bg-neon-purple/20">
                    {mockProduct.rarity}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finish:</span>
                  <span>{mockProduct.finish}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seller:</span>
                  <span>{mockProduct.seller}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Middle Column - Product Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-card rounded-lg shadow-lg dark:shadow-[0_0_30px_rgba(192,38,211,0.15)] p-6 dark:neon-border"
            >
              <h1 className="mb-2">{productInfo.name}</h1>
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <Badge variant="secondary" className="dark:bg-neon-purple/20">
                  {productInfo.set}
                </Badge>
                <span className="text-muted-foreground">Product #{productInfo.id}</span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl text-primary dark:text-neon-pink">
                  ${productInfo.marketPrice.toFixed(2)}
                </span>
                <span className="text-muted-foreground">Market Price</span>
              </div>

              {/* Quick Purchase Section */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-4">Quick Purchase</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-2">Condition</label>
                    <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Near Mint">Near Mint</SelectItem>
                        <SelectItem value="Lightly Played">Lightly Played</SelectItem>
                        <SelectItem value="Moderately Played">Moderately Played</SelectItem>
                        <SelectItem value="Heavily Played">Heavily Played</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Language</label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Japanese">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 dark:bg-neon-pink dark:hover:bg-neon-pink/90">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart - ${productInfo.marketPrice.toFixed(2)}
                </Button>
              </div>
            </motion.div>

            {/* Tabs for Details and Price History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Tabs
                defaultValue="listings"
                className="bg-card rounded-lg shadow-lg dark:shadow-[0_0_30px_rgba(192,38,211,0.15)] dark:neon-border"
              >
                <TabsList className="w-full justify-start border-b border-border bg-transparent rounded-none p-0">
                  <TabsTrigger
                    value="listings"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary dark:data-[state=active]:border-neon-pink data-[state=active]:bg-transparent"
                  >
                    {mockListings.length} Listings
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary dark:data-[state=active]:border-neon-pink data-[state=active]:bg-transparent"
                  >
                    Product Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="price-history"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary dark:data-[state=active]:border-neon-pink data-[state=active]:bg-transparent"
                  >
                    Price History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="listings" className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-accent/50 border-b border-border">
                        <tr>
                          <th className="text-left p-4">Seller</th>
                          <th className="text-left p-4">Condition</th>
                          <th className="text-right p-4">Price</th>
                          <th className="text-center p-4">Quantity</th>
                          <th className="text-right p-4">Shipping</th>
                          <th className="text-center p-4">Total</th>
                          <th className="text-right p-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockListings.map(listing => (
                          <motion.tr
                            key={listing.id}
                            className="border-b border-border hover:bg-accent/30 transition-colors"
                            whileHover={{ backgroundColor: 'var(--accent)' }}
                          >
                            <td className="p-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  {listing.seller}
                                  {listing.totalRatings > 10000 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs dark:bg-neon-purple/20"
                                    >
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{listing.rating}</span>
                                  <span className="text-xs">
                                    ({listing.totalRatings.toLocaleString()})
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{listing.condition}</Badge>
                            </td>
                            <td className="p-4 text-right">${listing.price.toFixed(2)}</td>
                            <td className="p-4 text-center">{listing.quantity}</td>
                            <td className="p-4 text-right">
                              {listing.shipping === 0 ? (
                                <span className="text-green-600 dark:text-green-400">FREE</span>
                              ) : (
                                `$${listing.shipping.toFixed(2)}`
                              )}
                            </td>
                            <td className="p-4 text-center">
                              ${(listing.price + listing.shipping).toFixed(2)}
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 dark:bg-neon-pink dark:hover:bg-neon-pink/90"
                                onClick={() => handleAddToCart(listing)}
                              >
                                Add to Cart
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 flex justify-center gap-2 border-t border-border">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-primary text-primary-foreground dark:bg-neon-pink"
                    >
                      1
                    </Button>
                    <Button variant="outline" size="sm">
                      2
                    </Button>
                    <Button variant="outline" size="sm">
                      3
                    </Button>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2">Description</h3>
                      <p className="text-muted-foreground">{productInfo.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Product Line</h4>
                        <p>{productInfo.productLine}</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Release Date</h4>
                        <p>{productInfo.releaseDate}</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Available Quantity</h4>
                        <p>{mockProduct.quantity} in stock</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Seller Rating</h4>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{mockProduct.sellerRating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="price-history" className="p-6">
                  <h3 className="mb-4">Market Price - Last 6 Months</h3>
                  <PriceHistoryChart data={priceHistoryData} />
                  <div className="mt-6 p-4 bg-accent/50 dark:bg-neon-purple/10 rounded-lg dark:neon-border">
                    <h4 className="mb-2">Market Price Breakdown</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Low (6mo)</div>
                        <div className="text-lg">
                          ${(productInfo.marketPrice * 0.85).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Market Price</div>
                        <div className="text-lg text-primary dark:text-neon-pink">
                          ${productInfo.marketPrice.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">High (6mo)</div>
                        <div className="text-lg">
                          ${(productInfo.marketPrice * 1.15).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Customers Also Purchased */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-card rounded-lg shadow-lg dark:shadow-[0_0_30px_rgba(192,38,211,0.15)] p-6 dark:neon-border"
            >
              <h3 className="mb-6">Customers Also Purchased</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedProducts.map(relatedProduct => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
