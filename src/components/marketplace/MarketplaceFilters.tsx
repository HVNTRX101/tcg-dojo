import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { CardCondition, GameType } from '../../types';
import { SEARCH_CONFIG } from '../../constants';

interface MarketplaceFiltersProps {
  onFilterChange: (search: string, gameType?: GameType, condition?: CardCondition) => void;
  initialSearch?: string;
  initialGameType?: GameType | 'all';
  listingsDataKey?: number;
}

const GAME_TYPES: Array<{ label: string; value: GameType | 'all' }> = [
  { label: 'All Games', value: 'all' },
  { label: 'Pokemon', value: 'Pokemon' },
  { label: 'MTG', value: 'MTG' },
  { label: 'Yu-Gi-Oh', value: 'Yu-Gi-Oh' },
  { label: 'Lorcana', value: 'Lorcana' },
  { label: 'Other', value: 'Other' },
];

const CONDITIONS: Array<{ label: string; value: CardCondition | 'all' }> = [
  { label: 'All Conditions', value: 'all' },
  { label: 'Near Mint (NM)', value: 'NM' },
  { label: 'Lightly Played (LP)', value: 'LP' },
  { label: 'Moderately Played (MP)', value: 'MP' },
  { label: 'Heavily Played (HP)', value: 'HP' },
  { label: 'Damaged (D)', value: 'D' },
];

export function MarketplaceFilters({
  onFilterChange,
  initialSearch = '',
  initialGameType = 'all',
  listingsDataKey = 0,
}: MarketplaceFiltersProps) {
  const [search, setSearch] = useState(initialSearch);
  const [gameType, setGameType] = useState<GameType | 'all'>(initialGameType);
  const [condition, setCondition] = useState<CardCondition | 'all'>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange(
        search,
        gameType === 'all' ? undefined : gameType,
        condition === 'all' ? undefined : condition
      );
    }, SEARCH_CONFIG.DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, gameType, condition, onFilterChange, listingsDataKey]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search cards..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={gameType} onValueChange={(v: string) => setGameType(v as GameType | 'all')}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Game" />
        </SelectTrigger>
        <SelectContent>
          {GAME_TYPES.map(g => (
            <SelectItem key={g.value} value={g.value}>
              {g.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition}
        onValueChange={(v: string) => setCondition(v as CardCondition | 'all')}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          {CONDITIONS.map(c => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
