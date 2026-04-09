import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Package, Star } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { Listing, CardCondition } from '../../types';
import { ANIMATION_DURATION, MOTION_SCALE, MOTION_Y_OFFSET, CARD_SIZES } from '../../constants';

interface MarketplaceCardProps {
  listing: Listing;
}

const conditionLabel: Record<CardCondition, string> = {
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  D: 'Damaged',
};

const conditionColor: Record<CardCondition, string> = {
  NM: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  LP: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MP: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HP: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  D: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function MarketplaceCard({ listing }: MarketplaceCardProps) {
  const coverImage = listing.images[0] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION.NORMAL }}
      whileHover={{
        y: MOTION_Y_OFFSET.HOVER_UP,
        transition: { duration: ANIMATION_DURATION.FAST },
      }}
    >
      <Card className="group hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(192,38,211,0.3)] transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 dark:neon-border">
        <Link to={`/products/${listing.cardId}`} className="block">
          <div
            className="overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative"
            style={{ aspectRatio: CARD_SIZES.PRODUCT_ASPECT_RATIO }}
          >
            <ImageWithFallback
              src={coverImage}
              alt={listing.cardName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Price badge — top right */}
            <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded-md text-sm font-bold shadow">
              {formatPrice(listing.price)}
            </div>
          </div>
        </Link>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Card name + condition */}
            <div>
              <h3 className="line-clamp-2 mb-1">{listing.cardName}</h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${conditionColor[listing.condition]}`}
                >
                  {conditionLabel[listing.condition]}
                </Badge>
                {listing.quantity > 1 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="w-3 h-3" />
                    <span>{listing.quantity} available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seller info */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Sold by</p>
                <Link
                  to={`/seller/${listing.sellerId}`}
                  className="text-sm truncate hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  {listing.sellerName}
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </div>
            </div>

            {/* Buy button */}
            <motion.div whileHover={{ scale: MOTION_SCALE.HOVER }} whileTap={{ scale: MOTION_SCALE.TAP }}>
              <Button
                size="sm"
                className="w-full dark:bg-gradient-primary dark:border-0"
                asChild
              >
                <Link to={`/products/${listing.cardId}`}>Buy Now</Link>
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
