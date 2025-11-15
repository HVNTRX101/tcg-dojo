import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, thresholds, stages } from './k6.config.js';

// Custom metrics
const productListSuccessRate = new Rate('product_list_success');
const productDetailSuccessRate = new Rate('product_detail_success');
const searchSuccessRate = new Rate('search_success');

export const options = {
  stages: stages.load,
  thresholds: {
    ...thresholds,
    product_list_success: ['rate>0.99'],
    product_detail_success: ['rate>0.99'],
    search_success: ['rate>0.95'],
  },
};

export default function () {
  const baseUrl = BASE_URL + '/api';

  group('Product API', function () {
    // Test 1: List products
    group('List Products', function () {
      const listRes = http.get(`${baseUrl}/products?page=1&limit=20`);

      const success = check(listRes, {
        'list status is 200': (r) => r.status === 200,
        'list has products array': (r) => r.json() && Array.isArray(r.json().products),
        'list response time < 500ms': (r) => r.timings.duration < 500,
      });

      productListSuccessRate.add(success ? 1 : 0);
    });

    sleep(1);

    // Test 2: Get product detail
    group('Product Detail', function () {
      // Use a random product ID (you should adjust based on your data)
      const productId = Math.floor(Math.random() * 100) + 1;
      const detailRes = http.get(`${baseUrl}/products/${productId}`);

      const success = check(detailRes, {
        'detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'detail response time < 300ms': (r) => r.timings.duration < 300,
      });

      productDetailSuccessRate.add(success ? 1 : 0);
    });

    sleep(1);

    // Test 3: Search products
    group('Search Products', function () {
      const searchTerms = ['pokemon', 'magic', 'yugioh', 'dragon', 'charizard'];
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

      const searchRes = http.get(`${baseUrl}/search?q=${randomTerm}&limit=10`);

      const success = check(searchRes, {
        'search status is 200': (r) => r.status === 200,
        'search has results': (r) => r.json() && r.json().results,
        'search response time < 1s': (r) => r.timings.duration < 1000,
      });

      searchSuccessRate.add(success ? 1 : 0);
    });

    sleep(1);

    // Test 4: Filter products
    group('Filter Products', function () {
      const filterRes = http.get(
        `${baseUrl}/products?page=1&limit=20&minPrice=1&maxPrice=100&condition=MINT`
      );

      check(filterRes, {
        'filter status is 200': (r) => r.status === 200,
        'filter response time < 800ms': (r) => r.timings.duration < 800,
      });
    });
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'loadtests/results/product-api-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  let summary = `\n=== Load Test Summary: Product API ===\n`;
  summary += `Duration: ${data.state.testRunDurationMs}ms\n`;
  summary += `Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `Request Rate: ${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0} req/s\n`;
  summary += `Failed Requests: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `Avg Response Time: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms\n`;
  summary += `P95 Response Time: ${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `P99 Response Time: ${data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0}ms\n`;
  summary += `Product List Success: ${((data.metrics.product_list_success?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `Product Detail Success: ${((data.metrics.product_detail_success?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `Search Success: ${((data.metrics.search_success?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  return summary;
}
