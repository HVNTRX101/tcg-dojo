import { logger } from '../config/logger';

/**
 * Multi-Source Pricing Service
 * Fetches pricing data from multiple TCG APIs in parallel
 */

// Types for pricing data
export interface TCGPlayerPrice {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
}

export interface CardmarketPrice {
  averageSellPrice: number | null;
  lowPrice: number | null;
  trendPrice: number | null;
  germanProLow: number | null;
  suggestedPrice: number | null;
}

export interface PricingData {
  name: string;
  price: number | null; // Primary price (TCGPlayer market or fallback)
  tcgplayer: TCGPlayerPrice | null;
  cardmarket: CardmarketPrice | null;
  image: string | null;
  set: string | null;
  game: string;
  id: string;
}

export interface PokemonTCGCard {
  id: string;
  name: string;
  set: {
    name: string;
  };
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    prices?: {
      holofoil?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
        directLow?: number;
      };
      reverseHolofoil?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
        directLow?: number;
      };
      normal?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
        directLow?: number;
      };
      '1stEditionHolofoil'?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
        directLow?: number;
      };
    };
  };
}

export interface TCGdexCard {
  id: string;
  name: {
    en: string;
  };
  set: {
    name: string;
  };
  image: string;
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      germanProLow?: number;
      suggestedPrice?: number;
    };
  };
}

/**
 * Fetch pricing data from Pokémon TCG API (TCGPlayer prices)
 */
export const fetchPokemonTCGPrices = async (
  query: string = '',
  limit: number = 20
): Promise<PokemonTCGCard[]> => {
  try {
    const apiKey = process.env.POKEMON_TCG_API_KEY;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // API key is optional but recommended for higher rate limits
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    // Build query - if no query provided, fetch high-value cards
    const searchQuery = query || 'rarity:rare subtypes:ex';
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&orderBy=-tcgplayer.prices.holofoil.market&pageSize=${limit}`;

    logger.info('Fetching from Pokémon TCG API', { url });

    const response = await fetch(url, { headers });

    if (!response.ok) {
      logger.warn('Pokémon TCG API request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    logger.error('Error fetching from Pokémon TCG API', { error });
    return [];
  }
};

/**
 * Fetch pricing data from TCGdex API (Cardmarket prices)
 */
export const fetchTCGdexPrices = async (
  query: string = '',
  limit: number = 20
): Promise<TCGdexCard[]> => {
  try {
    // TCGdex doesn't have direct search, so we'll fetch from a recent set
    // For now, we'll fetch cards from base sets that typically have pricing data
    const url = `https://api.tcgdex.net/v2/en/cards?limit=${limit}`;

    logger.info('Fetching from TCGdex API', { url });

    const response = await fetch(url);

    if (!response.ok) {
      logger.warn('TCGdex API request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const cards = await response.json();

    // Fetch full card details to get cardmarket prices
    const detailedCards: TCGdexCard[] = [];

    for (const card of cards.slice(0, limit)) {
      try {
        const detailUrl = `https://api.tcgdex.net/v2/en/cards/${card.id}`;
        const detailResponse = await fetch(detailUrl);

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          detailedCards.push(detailData);
        }
      } catch (err) {
        logger.debug('Error fetching card detail from TCGdex', { cardId: card.id, error: err });
      }
    }

    return detailedCards;
  } catch (error) {
    logger.error('Error fetching from TCGdex API', { error });
    return [];
  }
};

/**
 * Extract TCGPlayer pricing from Pokémon TCG API card
 */
const extractTCGPlayerPrice = (card: PokemonTCGCard): TCGPlayerPrice | null => {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  // Try different price types in order of preference
  const priceData = prices.holofoil || prices['1stEditionHolofoil'] || prices.reverseHolofoil || prices.normal;

  if (!priceData) return null;

  return {
    low: priceData.low || null,
    mid: priceData.mid || null,
    high: priceData.high || null,
    market: priceData.market || null,
    directLow: priceData.directLow || null,
  };
};

/**
 * Extract Cardmarket pricing from TCGdex card
 */
const extractCardmarketPrice = (card: TCGdexCard): CardmarketPrice | null => {
  const prices = card.cardmarket?.prices;
  if (!prices) return null;

  return {
    averageSellPrice: prices.averageSellPrice || null,
    lowPrice: prices.lowPrice || null,
    trendPrice: prices.trendPrice || null,
    germanProLow: prices.germanProLow || null,
    suggestedPrice: prices.suggestedPrice || null,
  };
};

/**
 * Merge pricing data from multiple sources by card name/ID
 */
export const mergePricingData = (
  pokemonCards: PokemonTCGCard[],
  tcgdexCards: TCGdexCard[]
): PricingData[] => {
  const mergedData: Map<string, PricingData> = new Map();

  // Process Pokémon TCG cards (TCGPlayer prices)
  for (const card of pokemonCards) {
    const tcgplayerPrice = extractTCGPlayerPrice(card);
    const primaryPrice = tcgplayerPrice?.market || tcgplayerPrice?.mid || tcgplayerPrice?.low || null;

    mergedData.set(card.name.toLowerCase(), {
      name: card.name,
      price: primaryPrice,
      tcgplayer: tcgplayerPrice,
      cardmarket: null,
      image: card.images?.small || null,
      set: card.set?.name || null,
      game: 'Pokémon',
      id: card.id,
    });
  }

  // Process TCGdex cards (Cardmarket prices)
  for (const card of tcgdexCards) {
    const cardName = card.name?.en || '';
    const normalizedName = cardName.toLowerCase();
    const cardmarketPrice = extractCardmarketPrice(card);

    // If card already exists from Pokémon TCG API, merge Cardmarket prices
    if (mergedData.has(normalizedName)) {
      const existing = mergedData.get(normalizedName)!;
      existing.cardmarket = cardmarketPrice;

      // If no TCGPlayer price, use Cardmarket as fallback
      if (!existing.price && cardmarketPrice) {
        existing.price = cardmarketPrice.trendPrice || cardmarketPrice.averageSellPrice || cardmarketPrice.lowPrice || null;
      }
    } else {
      // Add new card with only Cardmarket data
      const primaryPrice = cardmarketPrice?.trendPrice || cardmarketPrice?.averageSellPrice || cardmarketPrice?.lowPrice || null;

      mergedData.set(normalizedName, {
        name: cardName,
        price: primaryPrice,
        tcgplayer: null,
        cardmarket: cardmarketPrice,
        image: card.image || null,
        set: card.set?.name || null,
        game: 'Pokémon',
        id: card.id,
      });
    }
  }

  return Array.from(mergedData.values());
};

/**
 * Fetch pricing data from multiple sources in parallel
 * Handles partial failures gracefully
 */
export const fetchMultiSourcePricing = async (
  query: string = '',
  limit: number = 20
): Promise<{
  data: PricingData[];
  sources: {
    pokemonTCG: boolean;
    tcgdex: boolean;
  };
  count: number;
}> => {
  try {
    logger.info('Fetching multi-source pricing data', { query, limit });

    // Fetch from both sources in parallel
    const [pokemonCards, tcgdexCards] = await Promise.all([
      fetchPokemonTCGPrices(query, limit),
      fetchTCGdexPrices(query, limit),
    ]);

    // Track which sources succeeded
    const sources = {
      pokemonTCG: pokemonCards.length > 0,
      tcgdex: tcgdexCards.length > 0,
    };

    // Merge pricing data
    const mergedData = mergePricingData(pokemonCards, tcgdexCards);

    // Filter out cards without any pricing data and sort by price (highest first)
    const filteredData = mergedData
      .filter((card) => card.price !== null)
      .sort((a, b) => (b.price || 0) - (a.price || 0));

    logger.info('Multi-source pricing fetch complete', {
      pokemonCardsCount: pokemonCards.length,
      tcgdexCardsCount: tcgdexCards.length,
      mergedCount: filteredData.length,
      sources,
    });

    return {
      data: filteredData,
      sources,
      count: filteredData.length,
    };
  } catch (error) {
    logger.error('Error in fetchMultiSourcePricing', { error });
    throw error;
  }
};

/**
 * Get trending/high-value cards from multiple games
 * This is a placeholder for multi-game support
 */
export const fetchTrendingCards = async (
  games: string[] = ['pokemon'],
  limit: number = 20
): Promise<PricingData[]> => {
  // For now, only Pokémon is supported
  // Future: Add Magic: The Gathering, Yu-Gi-Oh!, etc.

  const allCards: PricingData[] = [];

  for (const game of games) {
    if (game.toLowerCase() === 'pokemon') {
      const result = await fetchMultiSourcePricing('', limit);
      allCards.push(...result.data);
    }
    // Future game support can be added here
  }

  return allCards.slice(0, limit);
};

export default {
  fetchPokemonTCGPrices,
  fetchTCGdexPrices,
  mergePricingData,
  fetchMultiSourcePricing,
  fetchTrendingCards,
};
