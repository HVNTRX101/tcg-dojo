import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { useCart } from './CartContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { SHIPPING, CARD_SIZES } from '../constants';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const subtotal = getCartTotal();
  const shipping =
    subtotal > 0 ? (subtotal > SHIPPING.FREE_THRESHOLD ? 0 : SHIPPING.STANDARD_COST) : 0;
  const total = subtotal + shipping;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Shopping Cart ({cartItems.length})
          </SheetTitle>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button onClick={() => onOpenChange(false)}>Continue Shopping</Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-4 border rounded-lg p-3">
                    <div
                      className="rounded-md overflow-hidden bg-muted flex-shrink-0"
                      style={{
                        width: CARD_SIZES.CART_DRAWER_IMAGE_WIDTH,
                        height: CARD_SIZES.CART_DRAWER_IMAGE_HEIGHT,
                      }}
                    >
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.set} • {item.condition}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center">{item.cartQuantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                            disabled={item.cartQuantity >= item.quantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatPrice(item.price)} each
                        </span>
                        <span className="text-primary">
                          {formatPrice(item.price * item.cartQuantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
                {subtotal > 0 && subtotal <= SHIPPING.FREE_THRESHOLD && (
                  <p className="text-xs text-muted-foreground">
                    Add {formatPrice(SHIPPING.FREE_THRESHOLD - subtotal)} more for free shipping
                  </p>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="text-xl text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full" size="lg">
                  Checkout
                </Button>
                <Button variant="outline" className="w-full" onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
