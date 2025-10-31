import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Star, MapPin, Calendar, Package, MessageCircle, Heart, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types/product.types';

// Mock seller data
const MOCK_SELLER = {
  id: "1",
  name: "CardVault Pro",
  email: "contact@cardvaultpro.com",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  bio: "Professional card dealer specializing in Magic: The Gathering, Pokemon, and Yu-Gi-Oh! cards. Over 10 years of experience in the TCG market.",
  location: "San Francisco, CA",
  website: "https://cardvaultpro.com",
  joinedDate: "2014-03-15",
  totalSales: 15420,
  totalProducts: 2847,
  rating: 4.9,
  reviewCount: 1247,
  responseTime: "Within 2 hours",
  shippingPolicy: "Free shipping on orders over $50. Standard shipping $4.99.",
  returnPolicy: "30-day return policy for unopened products. Buyer pays return shipping.",
  isFollowing: false,
};

// Mock seller listings
const MOCK_LISTINGS: Product[] = [
  {
    id: "1",
    name: "Lightning Bolt",
    set: "Alpha Edition",
    cardNumber: "161",
    rarity: "Common",
    price: 299.99,
    condition: "Near Mint",
    finish: "Normal",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop",
    seller: "CardVault Pro",
    sellerRating: 4.9,
    quantity: 1,
    game: "Magic: The Gathering"
  },
  {
    id: "9",
    name: "Liliana of the Veil",
    set: "Innistrad",
    cardNumber: "105",
    rarity: "Mythic Rare",
    price: 67.99,
    condition: "Near Mint",
    finish: "Normal",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop",
    seller: "CardVault Pro",
    sellerRating: 4.9,
    quantity: 4,
    game: "Magic: The Gathering"
  },
  {
    id: "14",
    name: "Ragavan, Nimble Pilferer",
    set: "Modern Horizons 2",
    cardNumber: "138",
    rarity: "Mythic Rare",
    price: 62.00,
    condition: "Near Mint",
    finish: "Normal",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop",
    seller: "CardVault Pro",
    sellerRating: 4.9,
    quantity: 2,
    game: "Magic: The Gathering"
  },
];

// Mock reviews
const MOCK_REVIEWS = [
  {
    id: "1",
    buyerName: "John D.",
    buyerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    rating: 5,
    comment: "Excellent seller! Cards arrived in perfect condition and shipping was fast.",
    date: "2024-01-15",
    productName: "Lightning Bolt",
    productImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=60&h=60&fit=crop",
  },
  {
    id: "2",
    buyerName: "Sarah M.",
    buyerAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    rating: 5,
    comment: "Great communication and packaging. Will definitely buy again!",
    date: "2024-01-10",
    productName: "Liliana of the Veil",
    productImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=60&h=60&fit=crop",
  },
  {
    id: "3",
    buyerName: "Mike R.",
    buyerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
    rating: 4,
    comment: "Good seller, cards as described. Minor delay in shipping but overall satisfied.",
    date: "2024-01-05",
    productName: "Ragavan, Nimble Pilferer",
    productImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=60&h=60&fit=crop",
  },
];

export default function SellerProfilePage() {
  const { sellerId } = useParams();
  const [activeTab, setActiveTab] = useState("listings");
  const [isFollowing, setIsFollowing] = useState(MOCK_SELLER.isFollowing);

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  const handleViewProduct = (productId: string) => {
    window.location.href = `/products/${productId}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Seller Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Seller Avatar and Basic Info */}
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={MOCK_SELLER.avatar} alt={MOCK_SELLER.name} />
                  <AvatarFallback>{MOCK_SELLER.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>

              {/* Seller Details */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{MOCK_SELLER.name}</h1>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1">
                        {renderStars(MOCK_SELLER.rating)}
                        <span className="ml-2 text-sm font-medium">
                          {MOCK_SELLER.rating} ({MOCK_SELLER.reviewCount} reviews)
                        </span>
                      </div>
                      <Badge variant="secondary">{MOCK_SELLER.totalSales} sales</Badge>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {MOCK_SELLER.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {new Date(MOCK_SELLER.joinedDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">{MOCK_SELLER.bio}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      onClick={handleFollowToggle}
                      className="gap-2"
                    >
                      <Heart className={`h-4 w-4 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{MOCK_SELLER.totalProducts}</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <div className="text-2xl font-bold">{MOCK_SELLER.rating}</div>
              <div className="text-sm text-muted-foreground">Rating</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{MOCK_SELLER.responseTime}</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold">{MOCK_SELLER.totalSales}</div>
              <div className="text-sm text-muted-foreground">Total Sales</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="listings">Listings ({MOCK_LISTINGS.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({MOCK_REVIEWS.length})</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_LISTINGS.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleViewProduct(product.id)}>
                    <CardContent className="p-4">
                      <div className="aspect-square mb-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <h3 className="font-semibold mb-2">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{product.set}</p>
                      <div className="flex gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs">{product.rarity}</Badge>
                        <Badge variant="outline" className="text-xs">{product.condition}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">Qty: {product.quantity}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-4">
              {MOCK_REVIEWS.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={review.buyerAvatar} alt={review.buyerName} />
                        <AvatarFallback>{review.buyerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{review.buyerName}</span>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">{review.comment}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Purchased:</span>
                          <img
                            src={review.productImage}
                            alt={review.productName}
                            className="w-6 h-6 rounded object-cover"
                          />
                          <span>{review.productName}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{MOCK_SELLER.shippingPolicy}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Return Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{MOCK_SELLER.returnPolicy}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
