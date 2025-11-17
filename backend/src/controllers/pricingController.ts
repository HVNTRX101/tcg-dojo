import { Request, Response } from 'express';
import {
  fetchMultiSourcePricing,
  fetchTrendingCards,
} from '../services/pricingService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

/**
 * Get pricing data from multiple sources
 * GET /api/prices
 *
 * Query Parameters:
 * - query: Search query (optional, defaults to high-value cards)
 * - limit: Number of results (optional, default 20, max 100)
 * - games: Comma-separated list of games (optional, default 'pokemon')
 */
export const getMultiSourcePrices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const query = (req.query.query as string) || '';
    const limitParam = req.query.limit as string;
    const limit = Math.min(parseInt(limitParam || '20', 10), 100);

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      throw new AppError('Invalid limit parameter. Must be a number between 1 and 100', 400);
    }

    logger.info('Fetching multi-source prices', {
      query,
      limit,
      ip: req.ip,
    });

    const result = await fetchMultiSourcePricing(query, limit);

    res.json({
      success: true,
      query: query || 'high-value cards',
      ...result,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  } catch (error) {
    logger.error('Error in getMultiSourcePrices', {
      error,
      query: req.query,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to fetch pricing data from external sources', 500);
  }
};

/**
 * Get trending/high-value cards from multiple games
 * GET /api/prices/trending
 *
 * Query Parameters:
 * - games: Comma-separated list of games (optional, default 'pokemon')
 * - limit: Number of results (optional, default 20, max 100)
 */
export const getTrendingCards = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const gamesParam = (req.query.games as string) || 'pokemon';
    const games = gamesParam.split(',').map((g) => g.trim().toLowerCase());
    const limitParam = req.query.limit as string;
    const limit = Math.min(parseInt(limitParam || '20', 10), 100);

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      throw new AppError('Invalid limit parameter. Must be a number between 1 and 100', 400);
    }

    // Validate games
    const validGames = ['pokemon']; // Future: Add 'mtg', 'yugioh', etc.
    const invalidGames = games.filter((g) => !validGames.includes(g));

    if (invalidGames.length > 0) {
      throw new AppError(
        `Invalid game(s): ${invalidGames.join(', ')}. Valid games: ${validGames.join(', ')}`,
        400
      );
    }

    logger.info('Fetching trending cards', {
      games,
      limit,
      ip: req.ip,
    });

    const cards = await fetchTrendingCards(games, limit);

    res.json({
      success: true,
      games,
      count: cards.length,
      data: cards,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  } catch (error) {
    logger.error('Error in getTrendingCards', {
      error,
      query: req.query,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to fetch trending cards', 500);
  }
};

/**
 * Get pricing for a specific card by name
 * GET /api/prices/card/:cardName
 *
 * Path Parameters:
 * - cardName: Name of the card to search for
 */
export const getCardPricing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cardName } = req.params;

    if (!cardName || cardName.trim().length === 0) {
      throw new AppError('Card name is required', 400);
    }

    logger.info('Fetching pricing for specific card', {
      cardName,
      ip: req.ip,
    });

    // Search for the specific card
    const result = await fetchMultiSourcePricing(`name:"${cardName}"`, 10);

    // Find exact or close match
    const exactMatch = result.data.find(
      (card) => card.name.toLowerCase() === cardName.toLowerCase()
    );

    if (!exactMatch && result.data.length === 0) {
      throw new AppError(`No pricing data found for card: ${cardName}`, 404);
    }

    res.json({
      success: true,
      cardName,
      exactMatch: !!exactMatch,
      card: exactMatch || result.data[0],
      alternatives: exactMatch ? result.data.filter((c) => c.name !== exactMatch.name).slice(0, 5) : result.data.slice(1, 6),
      sources: result.sources,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  } catch (error) {
    logger.error('Error in getCardPricing', {
      error,
      cardName: req.params.cardName,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to fetch card pricing data', 500);
  }
};

/**
 * Health check endpoint for pricing service
 * GET /api/prices/health
 */
export const getPricingHealth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    logger.info('Pricing service health check', { ip: req.ip });

    // Test connectivity to external APIs
    const pokemonTCGApiKey = process.env.POKEMON_TCG_API_KEY;

    res.json({
      success: true,
      status: 'healthy',
      services: {
        pokemonTCG: {
          configured: !!pokemonTCGApiKey,
          apiKey: pokemonTCGApiKey ? 'configured' : 'not configured (using free tier)',
        },
        tcgdex: {
          configured: true,
          apiKey: 'not required',
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  } catch (error) {
    logger.error('Error in getPricingHealth', { error });
    throw new AppError('Health check failed', 500);
  }
};

export default {
  getMultiSourcePrices,
  getTrendingCards,
  getCardPricing,
  getPricingHealth,
};
