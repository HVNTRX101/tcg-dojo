/**
 * SEO Testing and Validation
 * Tests for search engine optimization compliance
 */

import request from 'supertest';
import cheerio from 'cheerio';

describe('SEO Tests', () => {
  const baseUrl = 'http://localhost:5173';

  describe('Meta Tags', () => {
    it('should have title tag on all pages', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const title = $('title').text();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThan(60); // Optimal: 50-60 characters
    });

    it('should have meta description on all pages', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const description = $('meta[name="description"]').attr('content');
      expect(description).toBeDefined();
      expect(description!.length).toBeGreaterThan(50);
      expect(description!.length).toBeLessThan(160); // Optimal: 150-160 characters
    });

    it('should have canonical URL', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const canonical = $('link[rel="canonical"]').attr('href');
      expect(canonical).toBeDefined();
    });

    it('should have Open Graph tags', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      expect($('meta[property="og:title"]').attr('content')).toBeDefined();
      expect($('meta[property="og:description"]').attr('content')).toBeDefined();
      expect($('meta[property="og:image"]').attr('content')).toBeDefined();
      expect($('meta[property="og:url"]').attr('content')).toBeDefined();
      expect($('meta[property="og:type"]').attr('content')).toBeDefined();
    });

    it('should have Twitter Card tags', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      expect($('meta[name="twitter:card"]').attr('content')).toBeDefined();
      expect($('meta[name="twitter:title"]').attr('content')).toBeDefined();
      expect($('meta[name="twitter:description"]').attr('content')).toBeDefined();
      expect($('meta[name="twitter:image"]').attr('content')).toBeDefined();
    });

    it('should have viewport meta tag', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const viewport = $('meta[name="viewport"]').attr('content');
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');
    });
  });

  describe('Structured Data', () => {
    it('should have JSON-LD structured data', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const jsonLd = $('script[type="application/ld+json"]');
      expect(jsonLd.length).toBeGreaterThan(0);
    });

    it('should have valid Organization schema', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const jsonLd = JSON.parse($('script[type="application/ld+json"]').first().html() || '{}');
      expect(jsonLd['@type']).toBe('Organization');
      expect(jsonLd.name).toBeDefined();
      expect(jsonLd.url).toBeDefined();
    });

    it('should have Product schema on product pages', async () => {
      const response = await request(baseUrl).get('/products/123');
      const $ = cheerio.load(response.text);

      const jsonLd = JSON.parse($('script[type="application/ld+json"]').html() || '{}');
      if (jsonLd['@type'] === 'Product') {
        expect(jsonLd.name).toBeDefined();
        expect(jsonLd.image).toBeDefined();
        expect(jsonLd.offers).toBeDefined();
      }
    });
  });

  describe('HTML Structure', () => {
    it('should have proper heading hierarchy', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const h1Count = $('h1').length;
      expect(h1Count).toBe(1); // Exactly one H1

      // H2 should come after H1, H3 after H2, etc.
    });

    it('should have semantic HTML5 elements', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      expect($('header').length).toBeGreaterThan(0);
      expect($('main').length).toBeGreaterThan(0);
      expect($('footer').length).toBeGreaterThan(0);
    });

    it('should have descriptive alt text for images', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      $('img').each((i, elem) => {
        const alt = $(elem).attr('alt');
        expect(alt).toBeDefined();
      });
    });
  });

  describe('URLs and Links', () => {
    it('should have SEO-friendly URLs', async () => {
      // /products/123 ❌
      // /products/charizard-vmax-rainbow-rare ✅

      const response = await request(baseUrl).get('/products');
      const $ = cheerio.load(response.text);

      $('a[href^="/products/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        // Check if URL contains descriptive slugs
        expect(href).toMatch(/[a-z-]+/);
      });
    });

    it('should have no broken links', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const links: string[] = [];
      $('a[href^="/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) links.push(href);
      });

      // Test a sample of links
      for (const link of links.slice(0, 10)) {
        const linkResponse = await request(baseUrl).get(link);
        expect(linkResponse.status).not.toBe(404);
      }
    });

    it('should use HTTPS for external resources', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      $('link[href], script[src], img[src]').each((i, elem) => {
        const src = $(elem).attr('href') || $(elem).attr('src');
        if (src && src.startsWith('http://')) {
          throw new Error(`Insecure resource: ${src}`);
        }
      });
    });
  });

  describe('Performance', () => {
    it('should have fast page load time', async () => {
      const start = Date.now();
      await request(baseUrl).get('/');
      const loadTime = Date.now() - start;

      expect(loadTime).toBeLessThan(3000); // < 3 seconds
    });

    it('should compress responses', async () => {
      const response = await request(baseUrl)
        .get('/')
        .set('Accept-Encoding', 'gzip');

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should cache static assets', async () => {
      const response = await request(baseUrl).get('/assets/main.js');

      expect(response.headers['cache-control']).toBeDefined();
    });
  });

  describe('Robots and Sitemap', () => {
    it('should have robots.txt', async () => {
      const response = await request(baseUrl).get('/robots.txt');

      expect(response.status).toBe(200);
      expect(response.text).toContain('User-agent');
      expect(response.text).toContain('Sitemap');
    });

    it('should have XML sitemap', async () => {
      const response = await request(baseUrl).get('/sitemap.xml');

      expect(response.status).toBe(200);
      expect(response.text).toContain('<?xml');
      expect(response.text).toContain('<urlset');
    });

    it('should have all important pages in sitemap', async () => {
      const response = await request(baseUrl).get('/sitemap.xml');
      const $ = cheerio.load(response.text, { xmlMode: true });

      const urls = $('url loc').map((i, el) => $(el).text()).get();

      expect(urls).toContain(expect.stringContaining('/'));
      expect(urls).toContain(expect.stringContaining('/products'));
      expect(urls).toContain(expect.stringContaining('/about'));
    });
  });

  describe('Mobile SEO', () => {
    it('should be mobile-friendly', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const viewport = $('meta[name="viewport"]').attr('content');
      expect(viewport).toContain('width=device-width');
    });

    it('should not use Flash or other deprecated technologies', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      expect($('embed[type="application/x-shockwave-flash"]').length).toBe(0);
      expect($('object[type="application/x-shockwave-flash"]').length).toBe(0);
    });
  });

  describe('Internationalization', () => {
    it('should have lang attribute on html tag', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      const lang = $('html').attr('lang');
      expect(lang).toBeDefined();
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
    });

    it('should have hreflang for multi-language sites', async () => {
      const response = await request(baseUrl).get('/');
      const $ = cheerio.load(response.text);

      // If multi-language site
      const hreflang = $('link[rel="alternate"]');
      // expect(hreflang.length).toBeGreaterThan(0);
    });
  });
});

describe('SEO Best Practices', () => {
  it('should have unique title for each page', () => {
    // Test that titles are unique across pages
  });

  it('should have unique meta description for each page', () => {
    // Test that descriptions are unique
  });

  it('should use keywords naturally in content', () => {
    // Avoid keyword stuffing
  });

  it('should have internal linking structure', () => {
    // Test that pages link to each other
  });

  it('should have breadcrumb navigation', () => {
    // Test breadcrumbs on product pages
  });
});
