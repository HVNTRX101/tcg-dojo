import { prisma } from '../config/database';
import logger from '../config/logger';
import fs from 'fs/promises';
import path from 'path';

/**
 * SEO Service
 *
 * Generates:
 * - Sitemaps (products, sellers, games)
 * - Meta tags
 * - Structured data (JSON-LD)
 */

export class SEOService {
  private readonly siteUrl = process.env.FRONTEND_URL || 'https://yourdomain.com';

  /**
   * Generate complete sitemap
   */
  async generateSitemap(): Promise<string> {
    try {
      const urls: string[] = [];

      // Add static pages
      urls.push(this.createUrl('/', 'daily', '1.0'));
      urls.push(this.createUrl('/products', 'daily', '0.9'));
      urls.push(this.createUrl('/games', 'weekly', '0.8'));
      urls.push(this.createUrl('/sellers', 'weekly', '0.7'));
      urls.push(this.createUrl('/about', 'monthly', '0.5'));
      urls.push(this.createUrl('/help', 'monthly', '0.5'));

      // Add product pages
      const products = await prisma.product.findMany({
        where: { quantity: { gt: 0 } },
        select: { id: true, updatedAt: true },
        take: 50000, // Sitemap limit
      });

      products.forEach(product => {
        urls.push(
          this.createUrl(
            `/products/${product.id}`,
            'weekly',
            '0.8',
            product.updatedAt
          )
        );
      });

      // Add game pages
      const games = await prisma.game.findMany({
        select: { id: true, updatedAt: true },
      });

      games.forEach(game => {
        urls.push(
          this.createUrl(
            `/games/${game.id}`,
            'weekly',
            '0.7',
            game.updatedAt
          )
        );
      });

      // Add seller pages
      const sellers = await prisma.seller.findMany({
        select: { id: true, updatedAt: true },
        take: 10000,
      });

      sellers.forEach(seller => {
        urls.push(
          this.createUrl(
            `/sellers/${seller.id}`,
            'weekly',
            '0.6',
            seller.updatedAt
          )
        );
      });

      // Generate XML
      const xml = this.buildSitemapXML(urls);

      logger.info('Sitemap generated', {
        totalUrls: urls.length,
        products: products.length,
        games: games.length,
        sellers: sellers.length,
      });

      return xml;
    } catch (error: any) {
      logger.error('Error generating sitemap:', error);
      throw error;
    }
  }

  /**
   * Create sitemap URL entry
   */
  private createUrl(
    path: string,
    changefreq: string,
    priority: string,
    lastmod?: Date
  ): string {
    const lastmodStr = lastmod
      ? `<lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>`
      : '';

    return `
  <url>
    <loc>${this.siteUrl}${path}</loc>
    ${lastmodStr}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  /**
   * Build complete sitemap XML
   */
  private buildSitemapXML(urls: string[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }

  /**
   * Generate meta tags for a product
   */
  generateProductMetaTags(product: any): Record<string, string> {
    const title = `${product.name} | TCG Marketplace`;
    const description = product.description?.substring(0, 160) || `Buy ${product.name} on TCG Marketplace`;
    const image = product.images?.[0]?.url || '';

    return {
      title,
      description,
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': `${this.siteUrl}/products/${product.id}`,
      'og:type': 'product',
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
    };
  }

  /**
   * Generate JSON-LD structured data for a product
   */
  generateProductStructuredData(product: any): object {
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images?.map((img: any) => img.url) || [],
      brand: {
        '@type': 'Brand',
        name: product.game?.name || 'TCG Marketplace',
      },
      offers: {
        '@type': 'Offer',
        url: `${this.siteUrl}/products/${product.id}`,
        priceCurrency: 'USD',
        price: product.price,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        itemCondition: `https://schema.org/${product.condition || 'New'}Condition`,
        availability: product.quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: product.seller?.name || 'TCG Marketplace',
        },
      },
      aggregateRating: product.rating ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
      } : undefined,
    };
  }

  /**
   * Generate meta tags for seller profile
   */
  generateSellerMetaTags(seller: any): Record<string, string> {
    const title = `${seller.name} | TCG Marketplace Seller`;
    const description = `Shop from ${seller.name} on TCG Marketplace. ${seller.rating ? `Rating: ${seller.rating}/5` : ''}`;

    return {
      title,
      description,
      'og:title': title,
      'og:description': description,
      'og:url': `${this.siteUrl}/sellers/${seller.id}`,
      'og:type': 'profile',
      'twitter:card': 'summary',
      'twitter:title': title,
      'twitter:description': description,
    };
  }

  /**
   * Save sitemap to file
   */
  async saveSitemap(): Promise<void> {
    try {
      const sitemap = await this.generateSitemap();
      const publicDir = path.join(__dirname, '../../public');
      const sitemapPath = path.join(publicDir, 'sitemap.xml');

      await fs.mkdir(publicDir, { recursive: true });
      await fs.writeFile(sitemapPath, sitemap, 'utf-8');

      logger.info('Sitemap saved to file', { path: sitemapPath });
    } catch (error: any) {
      logger.error('Error saving sitemap:', error);
      throw error;
    }
  }
}

export default new SEOService();
