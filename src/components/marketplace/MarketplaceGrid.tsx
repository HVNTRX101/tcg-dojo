import { MarketplaceCard } from './MarketplaceCard';
import type { Listing } from '../../types';

interface MarketplaceGridProps {
  listings: Listing[];
}

export function MarketplaceGrid({ listings }: MarketplaceGridProps) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No listings found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {listings.map(listing => (
        <MarketplaceCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
