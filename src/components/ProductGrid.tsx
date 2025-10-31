import { ProductCard } from "./ProductCard";
import { Pagination } from "./Pagination";
import type { Card } from "../types/product.types";
import { useState } from "react";
import { ITEMS_PER_PAGE } from "../constants";

interface ProductGridProps {
  products: Card[];
  onViewDetails: (product: Card) => void;
}

export function ProductGrid({ products, onViewDetails }: ProductGridProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No cards found matching your criteria.</p>
        <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        Showing {startIndex + 1}-{Math.min(endIndex, products.length)} of {products.length} results
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}