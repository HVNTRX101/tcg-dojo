import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Label } from "./ui/label";
import { useState } from "react";

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedGame: string;
  onGameChange: (value: string) => void;
  selectedSet: string;
  onSetChange: (value: string) => void;
  selectedRarity: string;
  onRarityChange: (value: string) => void;
  selectedCondition: string;
  onConditionChange: (value: string) => void;
  selectedFinish: string;
  onFinishChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  filterOptions: {
    games: string[];
    sets: string[];
    rarities: string[];
    conditions: string[];
    finishes: string[];
  };
}

export function SearchAndFilter({
  searchTerm,
  onSearchChange,
  selectedGame,
  onGameChange,
  selectedSet,
  onSetChange,
  selectedRarity,
  onRarityChange,
  selectedCondition,
  onConditionChange,
  selectedFinish,
  onFinishChange,
  priceRange,
  onPriceRangeChange,
  sortBy,
  onSortChange,
  filterOptions
}: SearchAndFilterProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const hasActiveFilters = selectedGame !== "all" || selectedSet !== "all" || 
                          selectedRarity !== "all" || selectedCondition !== "all" || 
                          selectedFinish !== "all" || priceRange[0] !== 0 || priceRange[1] !== 20000;

  const clearAllFilters = () => {
    onGameChange("all");
    onSetChange("all");
    onRarityChange("all");
    onConditionChange("all");
    onFinishChange("all");
    onPriceRangeChange([0, 20000]);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search and Sort Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search cards, sets, or sellers..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                    •
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Cards</SheetTitle>
                <SheetDescription>
                  Refine your search by selecting filters below
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Game Filter */}
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Select value={selectedGame} onValueChange={onGameChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Games" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      {filterOptions.games.map((game) => (
                        <SelectItem key={game} value={game}>
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Set Filter */}
                <div className="space-y-2">
                  <Label>Set</Label>
                  <Select value={selectedSet} onValueChange={onSetChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sets</SelectItem>
                      {filterOptions.sets.map((set) => (
                        <SelectItem key={set} value={set}>
                          {set}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rarity Filter */}
                <div className="space-y-2">
                  <Label>Rarity</Label>
                  <Select value={selectedRarity} onValueChange={onRarityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Rarities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rarities</SelectItem>
                      {filterOptions.rarities.map((rarity) => (
                        <SelectItem key={rarity} value={rarity}>
                          {rarity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition Filter */}
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={selectedCondition} onValueChange={onConditionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      {filterOptions.conditions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Finish Filter */}
                <div className="space-y-2">
                  <Label>Finish</Label>
                  <Select value={selectedFinish} onValueChange={onFinishChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Finishes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Finishes</SelectItem>
                      {filterOptions.finishes.map((finish) => (
                        <SelectItem key={finish} value={finish}>
                          {finish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label>
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </Label>
                  <Slider
                    min={0}
                    max={20000}
                    step={10}
                    value={priceRange}
                    onValueChange={onPriceRangeChange}
                    className="py-4"
                  />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="w-full gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="price">Price Low-High</SelectItem>
              <SelectItem value="price-desc">Price High-Low</SelectItem>
              <SelectItem value="set">Set</SelectItem>
              <SelectItem value="rarity">Rarity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedGame !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onGameChange("all")}
              className="gap-1 h-7 text-xs"
            >
              {selectedGame}
              <X className="w-3 h-3" />
            </Button>
          )}
          {selectedSet !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSetChange("all")}
              className="gap-1 h-7 text-xs"
            >
              {selectedSet}
              <X className="w-3 h-3" />
            </Button>
          )}
          {selectedRarity !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRarityChange("all")}
              className="gap-1 h-7 text-xs"
            >
              {selectedRarity}
              <X className="w-3 h-3" />
            </Button>
          )}
          {selectedCondition !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onConditionChange("all")}
              className="gap-1 h-7 text-xs"
            >
              {selectedCondition}
              <X className="w-3 h-3" />
            </Button>
          )}
          {selectedFinish !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onFinishChange("all")}
              className="gap-1 h-7 text-xs"
            >
              {selectedFinish}
              <X className="w-3 h-3" />
            </Button>
          )}
          {(priceRange[0] !== 0 || priceRange[1] !== 20000) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPriceRangeChange([0, 20000])}
              className="gap-1 h-7 text-xs"
            >
              ${priceRange[0]} - ${priceRange[1]}
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
