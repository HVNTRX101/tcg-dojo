import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Star, Sparkles, Package } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { useCart } from './CartContext';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { Card as TCGCard } from '../types/product.types';
import { ANIMATION_DURATION, MOTION_SCALE, MOTION_Y_OFFSET, CARD_SIZES } from '../constants';

interface ProductCardProps {
  product: TCGCard;
  onViewDetails?: (product: TCGCard) => void;
}

export function ProductCard({ product, onViewDetails: _onViewDetails }: ProductCardProps) {
  const { addToCart } = useCart();
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

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'Near Mint':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Lightly Played':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Moderately Played':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Heavily Played':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

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
        <Link to={`/products/${product.id}`} className="block">
          <div
            className="overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative"
            style={{ aspectRatio: CARD_SIZES.PRODUCT_ASPECT_RATIO }}
          >
            <ImageWithFallback
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {product.finish === 'Foil' && (
              <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-2 py-1 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span className="text-xs">Foil</span>
              </div>
            )}
            <div
              className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs ${getRarityColor(product.rarity)}`}
            >
              {product.rarity}
            </div>
          </div>
        </Link>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Card Name and Set */}
            <div>
              <h3 className="line-clamp-2 mb-1">{product.name}</h3>
              <p className="text-xs text-muted-foreground">
                {product.set} • #{product.cardNumber}
              </p>
            </div>

            {/* Condition Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${getConditionBadge(product.condition)}`}
              >
                {product.condition}
              </Badge>
              {product.quantity > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{product.quantity} available</span>
                </div>
              )}
            </div>

            {/* Seller Info */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Sold by</p>
                <p className="text-sm truncate">{product.seller}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{product.sellerRating}</span>
              </div>
            </div>

            {/* Price and Action */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xl text-primary dark:text-[#E85002]">
                {formatPrice(product.price)}
              </span>
              <motion.div
                whileHover={{ scale: MOTION_SCALE.HOVER }}
                whileTap={{ scale: MOTION_SCALE.TAP }}
              >
                <Button
                  size="sm"
                  className="shrink-0 dark:bg-gradient-primary dark:border-0"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
