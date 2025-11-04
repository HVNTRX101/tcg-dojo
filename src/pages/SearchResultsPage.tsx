import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchAndFilter } from '../components/SearchAndFilter';
import { ProductGrid } from '../components/ProductGrid';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FilterSidebar } from '../components/FilterSidebar';
import { Button } from '../components/ui/button';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types/product.types';
import { MOCK_CARDS } from '../mocks/products';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedSet, setSelectedSet] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedFinish, setSelectedFinish] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [sortBy, setSortBy] = useState('name');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Get unique filter options
  const filterOptions = {
    games: [...new Set(MOCK_CARDS.map(card => card.game))].sort(),
    sets: [...new Set(MOCK_CARDS.map(card => card.set))].sort(),
    rarities: [...new Set(MOCK_CARDS.map(card => card.rarity))].sort(),
    conditions: [...new Set(MOCK_CARDS.map(card => card.condition))].sort(),
    finishes: [...new Set(MOCK_CARDS.map(card => card.finish))].sort(),
  };

  // Filter and sort cards based on search query and filters
  const filteredAndSortedCards = MOCK_CARDS.filter(card => {
    const matchesSearch =
      query === '' ||
      card.name.toLowerCase().includes(query.toLowerCase()) ||
      card.set.toLowerCase().includes(query.toLowerCase()) ||
      card.seller.toLowerCase().includes(query.toLowerCase());
    const matchesGame = selectedGame === 'all' || card.game === selectedGame;
    const matchesSet = selectedSet === 'all' || card.set === selectedSet;
    const matchesRarity = selectedRarity === 'all' || card.rarity === selectedRarity;
    const matchesCondition = selectedCondition === 'all' || card.condition === selectedCondition;
    const matchesFinish = selectedFinish === 'all' || card.finish === selectedFinish;
    const matchesPrice = card.price >= priceRange[0] && card.price <= priceRange[1];

    return (
      matchesSearch &&
      matchesGame &&
      matchesSet &&
      matchesRarity &&
      matchesCondition &&
      matchesFinish &&
      matchesPrice
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'set':
        return a.set.localeCompare(b.set);
      case 'rarity':
        return a.rarity.localeCompare(b.rarity);
      default:
        return 0;
    }
  });

  const handleViewDetails = (card: Product) => {
    // Navigate to product detail page
    window.location.href = `/products/${card.id}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Left Sidebar - Filters */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -280, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 280 }}
              exit={{ opacity: 0, x: -280, width: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="hidden lg:block flex-shrink-0 overflow-hidden"
            >
              <FilterSidebar
                selectedGame={selectedGame}
                onGameChange={setSelectedGame}
                selectedSet={selectedSet}
                onSetChange={setSelectedSet}
                selectedRarity={selectedRarity}
                onRarityChange={setSelectedRarity}
                selectedCondition={selectedCondition}
                onConditionChange={setSelectedCondition}
                selectedFinish={selectedFinish}
                onFinishChange={setSelectedFinish}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                filterOptions={filterOptions}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Right Content - Search Results */}
        <main className="flex-1 min-w-0">
          {/* Filter Toggle Button */}
          <div className="mb-6">
            <Button
              variant={isSidebarOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="gap-2 dark:neon-border transition-all duration-300 hidden lg:flex"
            >
              {isSidebarOpen ? (
                <>
                  <X className="h-4 w-4" />
                  Hide Filters
                </>
              ) : (
                <>
                  <SlidersHorizontal className="h-4 w-4" />
                  Show Filters
                </>
              )}
            </Button>
          </div>

          <Breadcrumbs items={[{ label: 'Products', href: '/' }, { label: 'Search Results' }]} />

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Search className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">
                {query ? `Search Results for "${query}"` : 'Search Results'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {filteredAndSortedCards.length}{' '}
              {filteredAndSortedCards.length === 1 ? 'result' : 'results'} found
            </p>
          </div>

          <SearchAndFilter
            searchTerm={query}
            onSearchChange={() => {}} // Read-only for search results page
            selectedGame={selectedGame}
            onGameChange={setSelectedGame}
            selectedSet={selectedSet}
            onSetChange={setSelectedSet}
            selectedRarity={selectedRarity}
            onRarityChange={setSelectedRarity}
            selectedCondition={selectedCondition}
            onConditionChange={setSelectedCondition}
            selectedFinish={selectedFinish}
            onFinishChange={setSelectedFinish}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterOptions={filterOptions}
          />

          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAndSortedCards.length} of {MOCK_CARDS.length} listings
            </p>
          </div>

          {filteredAndSortedCards.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search terms or filters to find what you&apos;re looking for.
              </p>
              <Button onClick={() => (window.location.href = '/')}>Browse All Products</Button>
            </div>
          ) : (
            <ProductGrid products={filteredAndSortedCards} onViewDetails={handleViewDetails} />
          )}
        </main>
      </div>
    </div>
  );
}
