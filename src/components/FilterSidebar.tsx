import { motion } from 'motion/react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { useState } from 'react';
import { PRICE_RANGE, ANIMATION_DURATION, FILTER_CONFIG } from '../constants';

interface FilterSidebarProps {
  selectedGame: string;
  onGameChange: (game: string) => void;
  selectedSet: string;
  onSetChange: (set: string) => void;
  selectedRarity: string;
  onRarityChange: (rarity: string) => void;
  selectedCondition: string;
  onConditionChange: (condition: string) => void;
  selectedFinish: string;
  onFinishChange: (finish: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  filterOptions: {
    games: string[];
    sets: string[];
    rarities: string[];
    conditions: string[];
    finishes: string[];
  };
}

export function FilterSidebar({
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
  filterOptions,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'Categories',
    'Price Range',
    'Condition',
  ]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedGame !== 'all') count++;
    if (selectedSet !== 'all') count++;
    if (selectedRarity !== 'all') count++;
    if (selectedCondition !== 'all') count++;
    if (selectedFinish !== 'all') count++;
    if (priceRange[0] !== PRICE_RANGE.MIN || priceRange[1] !== PRICE_RANGE.MAX) count++;
    return count;
  };

  const clearAllFilters = () => {
    onGameChange('all');
    onSetChange('all');
    onRarityChange('all');
    onConditionChange('all');
    onFinishChange('all');
    onPriceRangeChange(PRICE_RANGE.DEFAULT);
  };

  const sections = [
    {
      title: 'Categories',
      items: filterOptions.games.map(game => ({
        label: game,
        value: game,
        selected: selectedGame === game,
        onChange: () => onGameChange(game),
      })),
    },
    {
      title: 'Set',
      items: filterOptions.sets.map(set => ({
        label: set,
        value: set,
        selected: selectedSet === set,
        onChange: () => onSetChange(set),
      })),
    },
    {
      title: 'Rarity',
      items: filterOptions.rarities.map(rarity => ({
        label: rarity,
        value: rarity,
        selected: selectedRarity === rarity,
        onChange: () => onRarityChange(rarity),
      })),
    },
    {
      title: 'Condition',
      items: filterOptions.conditions.map(condition => ({
        label: condition,
        value: condition,
        selected: selectedCondition === condition,
        onChange: () => onConditionChange(condition),
      })),
    },
    {
      title: 'Finish',
      items: filterOptions.finishes.map(finish => ({
        label: finish,
        value: finish,
        selected: selectedFinish === finish,
        onChange: () => onFinishChange(finish),
      })),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: ANIMATION_DURATION.NORMAL }}
      className="w-full h-fit bg-card border border-border rounded-lg dark:neon-border sticky top-4"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg">Filters</h2>
          {getActiveFilterCount() > 0 && (
            <Badge variant="default" className="dark:bg-[#E85002]">
              {getActiveFilterCount()}
            </Badge>
          )}
        </div>

        {/* Clear All Button */}
        {getActiveFilterCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="w-full justify-start text-sm"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Filter Sections */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="p-4 space-y-1">
          {/* Price Range Section */}
          <Collapsible
            open={expandedSections.includes('Price Range')}
            onOpenChange={() => toggleSection('Price Range')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent dark:hover:bg-accent/50 rounded transition-colors">
              <div className="flex items-center gap-2">
                <span className="font-medium">Price Range</span>
                {(priceRange[0] !== PRICE_RANGE.MIN || priceRange[1] !== PRICE_RANGE.MAX) && (
                  <Badge variant="secondary" className="text-xs dark:bg-[#E85002]/20">
                    Active
                  </Badge>
                )}
              </div>
              {expandedSections.includes('Price Range') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="px-3 pb-3">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${priceRange[0]}
                  </span>
                  <span className="text-muted-foreground">
                    ${priceRange[1]}
                  </span>
                </div>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                  max={PRICE_RANGE.MAX}
                  min={PRICE_RANGE.MIN}
                  step={PRICE_RANGE.STEP}
                  className="dark:[&_[role=slider]]:bg-[#E85002] dark:[&_[role=slider]]:border-[#E85002]"
                />
              </motion.div>
            </CollapsibleContent>
          </Collapsible>

          {/* Other Filter Sections */}
          {sections.map((section) => {
            const isExpanded = expandedSections.includes(section.title);
            const selectedCount = section.items.filter(item => item.selected).length;

            return (
              <Collapsible
                key={section.title}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.title)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent dark:hover:bg-accent/50 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{section.title}</span>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-xs dark:bg-[#E85002]/20">
                        {selectedCount}
                      </Badge>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="px-3 pb-3">
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-3 overflow-y-auto"
                    style={{ maxHeight: `${FILTER_CONFIG.ITEMS_MAX_HEIGHT}px` }}
                  >
                    {section.items.map((item) => (
                      <motion.div
                        key={item.value}
                        whileHover={{ x: 2 }}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`${section.title}-${item.value}`}
                          checked={item.selected}
                          onCheckedChange={item.onChange}
                          className="dark:border-neon-purple/50 dark:data-[state=checked]:bg-neon-pink dark:data-[state=checked]:border-neon-pink"
                        />
                        <Label
                          htmlFor={`${section.title}-${item.value}`}
                          className="text-sm cursor-pointer flex-1 hover:text-primary dark:hover:text-neon-pink transition-colors"
                        >
                          {item.label}
                        </Label>
                      </motion.div>
                    ))}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
