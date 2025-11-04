import { Response } from 'express';
import {
  getRelatedProducts,
  getProductsFromSameSeller,
  getProductsFromSameSet,
  getFrequentlyBoughtTogether,
  getPersonalizedRecommendations,
} from '../services/recommendationService';
import { AuthRequest } from '../middleware/auth';
import { Request } from 'express';

/**
 * Get related products
 * GET /api/products/:productId/related
 */
export const getRelated = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const { limit = '10' } = req.query;

  const products = await getRelatedProducts(productId, parseInt(limit as string));

  res.json({
    productId,
    products,
    count: products.length,
  });
};

/**
 * Get products from the same seller
 * GET /api/products/:productId/same-seller
 */
export const getSameSeller = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const { limit = '10' } = req.query;

  const products = await getProductsFromSameSeller(productId, parseInt(limit as string));

  res.json({
    productId,
    products,
    count: products.length,
  });
};

/**
 * Get products from the same set
 * GET /api/products/:productId/same-set
 */
export const getSameSet = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const { limit = '10' } = req.query;

  const products = await getProductsFromSameSet(productId, parseInt(limit as string));

  res.json({
    productId,
    products,
    count: products.length,
  });
};

/**
 * Get frequently bought together products
 * GET /api/products/:productId/bought-together
 */
export const getBoughtTogether = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const { limit = '10' } = req.query;

  const products = await getFrequentlyBoughtTogether(
    productId,
    parseInt(limit as string)
  );

  res.json({
    productId,
    products,
    count: products.length,
  });
};

/**
 * Get personalized recommendations for authenticated user
 * GET /api/recommendations/personalized
 */
export const getPersonalized = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId;
  const { limit = '20' } = req.query;

  const products = await getPersonalizedRecommendations(userId, parseInt(limit as string));

  res.json({
    products,
    count: products.length,
  });
};
