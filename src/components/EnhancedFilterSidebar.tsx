import { useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface FilterSection {
  title: string;
  items: string[];
  searchable?: boolean;
}

interface EnhancedFilterSidebarProps {
  onClose?: () => void;
}

const filterSections: FilterSection[] = [
  {
    title: 'Direct by TCGPlayer',
    items: ['Direct by TCGPlayer'],
  },
  {
    title: 'Shop',
    items: ['Direct', 'Sellers'],
  },
  {
    title: 'Availability',
    items: ['In Stock Only', 'Pre-Orders Only'],
  },
  {
    title: 'Pricing',
    items: ['Under $1', '$1 - $5', '$5 - $10', '$10 - $25', '$25 - $50', '$50 - $100', 'Over $100'],
  },
  {
    title: 'Condition',
    items: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'],
  },
  {
    title: 'Language',
    items: ['English', 'Japanese', 'German', 'French', 'Italian', 'Spanish', 'Chinese', 'Korean'],
  },
  {
    title: 'Product Line',
    items: [
      'Pokémon',
      'Magic: The Gathering',
      'Yu-Gi-Oh!',
      'Disney Lorcana',
      'One Piece',
      'Digimon',
    ],
    searchable: true,
  },
  {
    title: 'Set',
    items: [
      'MEW1: Mega Evolution',
      'MEW2: Mega Evolution',
      'MEW3: Mega Evolution',
      'Prize Pack Series Cards',
      'Surging Sparks',
      'Stellar Crown',
      'Shrouded Fable',
    ],
    searchable: true,
  },
  {
    title: 'Rarity',
    items: ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Promo'],
  },
  {
    title: 'Finish',
    items: ['Non-Foil', 'Foil', 'Etched Foil', 'Reverse Holo'],
  },
];

export default function EnhancedFilterSidebar({ onClose }: EnhancedFilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'Direct by TCGPlayer',
    'Shop',
    'Product Line',
    'Set',
  ]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]
    );
  };

  const toggleFilter = (section: string, item: string) => {
    setSelectedFilters(prev => {
      const current = prev[section] || [];
      const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
      return { ...prev, [section]: updated };
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
  };

  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce((acc, items) => acc + items.length, 0);
  };

  const getFilteredItems = (section: FilterSection) => {
    const searchTerm = searchTerms[section.title] || '';
    if (!searchTerm) return section.items;
    return section.items.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg">Filters</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Applied Filters */}
        {getActiveFilterCount() > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Applied Filters ({getActiveFilterCount()})</span>
              <Button
                variant="link"
                size="sm"
                onClick={clearAllFilters}
                className="h-auto p-0 text-blue-600"
              >
                Reset All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectedFilters).map(([section, items]) =>
                items.map(item => (
                  <div
                    key={`${section}-${item}`}
                    className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                  >
                    <span>{item}</span>
                    <button onClick={() => toggleFilter(section, item)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {filterSections.map(section => {
            const isExpanded = expandedSections.includes(section.title);
            const filteredItems = getFilteredItems(section);
            const selectedCount = selectedFilters[section.title]?.length || 0;

            return (
              <Collapsible
                key={section.title}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.title)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span>{section.title}</span>
                    {selectedCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2">
                    {/* Search box for searchable sections */}
                    {section.searchable && (
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={`Search ${section.title.toLowerCase()}...`}
                          value={searchTerms[section.title] || ''}
                          onChange={e =>
                            setSearchTerms(prev => ({
                              ...prev,
                              [section.title]: e.target.value,
                            }))
                          }
                          className="pl-10 h-9"
                        />
                      </div>
                    )}

                    {/* Filter items */}
                    {filteredItems.map(item => {
                      const isChecked = selectedFilters[section.title]?.includes(item) || false;
                      return (
                        <div key={item} className="flex items-center gap-2">
                          <Checkbox
                            id={`${section.title}-${item}`}
                            checked={isChecked}
                            onCheckedChange={() => toggleFilter(section.title, item)}
                          />
                          <Label
                            htmlFor={`${section.title}-${item}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {item}
                          </Label>
                        </div>
                      );
                    })}

                    {filteredItems.length === 0 && searchTerms[section.title] && (
                      <p className="text-sm text-gray-500 py-2">No results found</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
