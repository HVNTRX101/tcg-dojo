import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Star, TrendingUp, Package, MessageSquare, Award } from "lucide-react";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface SellerProfileModalProps {
  sellerName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SellerReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  cardName: string;
}

const SELLER_REVIEWS: SellerReview[] = [
  {
    id: "1",
    userName: "CardMaster2000",
    rating: 5,
    date: "2025-10-12",
    comment: "Amazing seller! Cards always arrive in perfect condition. Very responsive to messages.",
    cardName: "Lightning Bolt"
  },
  {
    id: "2",
    userName: "MTGCollector",
    rating: 5,
    date: "2025-10-10",
    comment: "Great prices and fast shipping. One of my go-to sellers for vintage cards.",
    cardName: "Black Lotus"
  },
  {
    id: "3",
    userName: "TradingCardPro",
    rating: 4,
    date: "2025-10-08",
    comment: "Good experience overall. Card condition was accurately described.",
    cardName: "Tarmogoyf"
  },
  {
    id: "4",
    userName: "DeckBuilder99",
    rating: 5,
    date: "2025-10-05",
    comment: "Excellent packaging and communication. Highly recommend!",
    cardName: "Force of Will"
  },
  {
    id: "5",
    userName: "VintageHunter",
    rating: 5,
    date: "2025-10-03",
    comment: "Best seller on the platform. Always has rare finds at fair prices.",
    cardName: "Mox Sapphire"
  },
];

export function SellerProfileModal({ sellerName, open, onOpenChange }: SellerProfileModalProps) {
  if (!sellerName) return null;

  const averageRating = 4.8;
  const ratingDistribution = [
    { stars: 5, count: 287, percentage: 88 },
    { stars: 4, count: 31, percentage: 10 },
    { stars: 3, count: 4, percentage: 1 },
    { stars: 2, count: 2, percentage: 1 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seller Profile</DialogTitle>
          <DialogDescription>
            View detailed seller information, ratings, and customer reviews
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seller Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div>
                <h2>{sellerName}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl">{averageRating}</span>
                    <span className="text-muted-foreground">(324 reviews)</span>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Award className="w-3 h-3" />
                    Top Seller
                  </Badge>
                </div>
              </div>

              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Member Since</p>
                  <p>January 2020</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Sales</p>
                  <p>1,247</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Response Time</p>
                  <p>&lt; 2 hours</p>
                </div>
              </div>
            </div>
            <Button>Contact Seller</Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span className="text-sm">Shipping Speed</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={95} className="flex-1" />
                <span className="text-sm">95%</span>
              </div>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={98} className="flex-1" />
                <span className="text-sm">98%</span>
              </div>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Communication</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={96} className="flex-1" />
                <span className="text-sm">96%</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="ratings">Rating Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="space-y-4">
              <div className="space-y-3">
                {SELLER_REVIEWS.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p>{review.userName}</p>
                        <div className="flex items-center gap-1">
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
                    <Badge variant="outline" className="text-xs">
                      Purchase: {review.cardName}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ratings" className="space-y-4">
              <div className="space-y-3">
                {ratingDistribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm">{item.stars}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border rounded-lg p-4 space-y-2 mt-6">
                <h4>Review Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Most Mentioned</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">Fast Shipping</Badge>
                      <Badge variant="secondary">Great Packaging</Badge>
                      <Badge variant="secondary">Fair Prices</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Positive Feedback</p>
                    <p className="mt-1">
                      <span className="text-green-600" style={{ fontSize: '1.5rem' }}>99.4%</span>
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
