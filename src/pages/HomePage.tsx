import { useState, useMemo } from "react";
import { SearchAndFilter } from "../components/SearchAndFilter";
import { ProductGrid } from "../components/ProductGrid";
import { CardDetailModal } from "../components/CardDetailModal";
import { SellerProfileModal } from "../components/SellerProfileModal";
import { GameNavigation } from "../components/GameNavigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { HeroSection } from "../components/HeroSection";
import { FilterSidebar } from "../components/FilterSidebar";
import { Button } from "../components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types/product.types";
import { MOCK_CARDS } from "../mocks/products";
import { PRICE_RANGE, SIDEBAR_CONFIG } from "../constants";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGame, setSelectedGame] = useState("all");
  const [selectedSet, setSelectedSet] = useState("all");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedFinish, setSelectedFinish] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_RANGE.DEFAULT);
  const [sortBy, setSortBy] = useState("name");
  const [selectedCard, setSelectedCard] = useState<Product | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const [isSellerProfileOpen, setIsSellerProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    return {
      games: [...new Set(MOCK_CARDS.map(card => card.game))].sort(),
      sets: [...new Set(MOCK_CARDS.map(card => card.set))].sort(),
      rarities: [...new Set(MOCK_CARDS.map(card => card.rarity))].sort(),
      conditions: [...new Set(MOCK_CARDS.map(card => card.condition))].sort(),
      finishes: [...new Set(MOCK_CARDS.map(card => card.finish))].sort(),
    };
  }, []);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = MOCK_CARDS.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           card.set.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           card.seller.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGame = selectedGame === "all" || card.game === selectedGame;
      const matchesSet = selectedSet === "all" || card.set === selectedSet;
      const matchesRarity = selectedRarity === "all" || card.rarity === selectedRarity;
      const matchesCondition = selectedCondition === "all" || card.condition === selectedCondition;
      const matchesFinish = selectedFinish === "all" || card.finish === selectedFinish;
      const matchesPrice = card.price >= priceRange[0] && card.price <= priceRange[1];
      
      return matchesSearch && matchesGame && matchesSet && matchesRarity && 
             matchesCondition && matchesFinish && matchesPrice;
    });

    // Sort cards
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "set":
          return a.set.localeCompare(b.set);
        case "rarity":
          return a.rarity.localeCompare(b.rarity);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedGame, selectedSet, selectedRarity, selectedCondition, selectedFinish, priceRange, sortBy]);

  const handleViewDetails = (card: Product) => {
    setSelectedCard(card);
    setIsCardDetailOpen(true);
  };

  const handleViewSeller = (sellerName: string) => {
    setSelectedSeller(sellerName);
    setIsCardDetailOpen(false);
    setIsSellerProfileOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <GameNavigation selectedGame={selectedGame} onGameSelect={setSelectedGame} />
      
      <div className="flex gap-6">
        {/* Left Sidebar - Filters */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, x: SIDEBAR_CONFIG.ANIMATION_OFFSET, width: 0 }}
              animate={{ opacity: 1, x: 0, width: SIDEBAR_CONFIG.WIDTH }}
              exit={{ opacity: 0, x: SIDEBAR_CONFIG.ANIMATION_OFFSET, width: 0 }}
              transition={{ duration: SIDEBAR_CONFIG.ANIMATION_DURATION, ease: "easeInOut" }}
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

        {/* Right Content - Products */}
        <main className="flex-1 min-w-0">
          <HeroSection cards={MOCK_CARDS} />
          
          {/* Filter Toggle Button */}
          <div className="mb-6">
            <Button
              variant={isSidebarOpen ? "default" : "outline"}
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
          
          <Breadcrumbs 
            items={[
              { label: 'Products', href: '#' },
              { label: selectedGame !== 'all' ? selectedGame : 'All Games' }
            ]}
          />
          
          <div className="mb-8">
            <h1 className="mb-2">TCG Marketplace</h1>
            <p className="text-muted-foreground">
              Buy and sell trading cards from Magic: The Gathering, Pokemon, Yu-Gi-Oh! and more
            </p>
          </div>

          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
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

          <ProductGrid 
            products={filteredAndSortedCards} 
            onViewDetails={handleViewDetails}
          />
        </main>
      </div>

      <CardDetailModal
        card={selectedCard}
        open={isCardDetailOpen}
        onOpenChange={setIsCardDetailOpen}
        onViewSeller={handleViewSeller}
      />

      <SellerProfileModal
        sellerName={selectedSeller}
        open={isSellerProfileOpen}
        onOpenChange={setIsSellerProfileOpen}
      />
    </div>
  );
}
