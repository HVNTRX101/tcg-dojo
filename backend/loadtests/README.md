# Load Testing with k6

This directory contains load tests for the TCG Dojo API using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6

# Docker
docker pull grafana/k6
```

## Test Files

- `k6.config.js` - Shared configuration and test scenarios
- `auth-flow.test.js` - Authentication endpoints (login, signup, logout)
- `product-api.test.js` - Product listing, search, and filtering
- `run-tests.sh` - Script to run all tests

## Running Tests

### Quick Start

```bash
# Run all tests with default settings
npm run loadtest

# Or manually
./loadtests/run-tests.sh
```

### Individual Tests

```bash
# Auth flow test
k6 run loadtests/auth-flow.test.js

# Product API test
k6 run loadtests/product-api.test.js

# With custom configuration
k6 run --vus 50 --duration 2m loadtests/product-api.test.js

# With environment variables
BASE_URL=https://api.tcgdojo.com k6 run loadtests/auth-flow.test.js
```

## Test Scenarios

### Smoke Test
Quick test with 1 virtual user to verify basic functionality:
```bash
k6 run --stage '30s:1' loadtests/product-api.test.js
```

### Load Test
Normal traffic simulation (20 concurrent users):
```bash
k6 run --stage '1m:20' --stage '3m:20' --stage '1m:0' loadtests/product-api.test.js
```

### Stress Test
High traffic simulation (100+ concurrent users):
```bash
k6 run --stage '2m:50' --stage '5m:50' --stage '2m:100' --stage '5m:100' --stage '2m:0' loadtests/product-api.test.js
```

### Spike Test
Sudden traffic spike simulation:
```bash
k6 run --stage '10s:100' --stage '1m:100' --stage '10s:0' loadtests/product-api.test.js
```

## Configuration

Edit `k6.config.js` to adjust:

- `BASE_URL` - API base URL (default: http://localhost:3000)
- `VUS` - Number of virtual users
- `DURATION` - Test duration
- `thresholds` - Performance criteria (test fails if not met)

### Environment Variables

- `BASE_URL` - Override base URL
- `VUS` - Override virtual users
- `DURATION` - Override duration

Example:
```bash
BASE_URL=https://staging.tcgdojo.com VUS=30 DURATION=5m k6 run loadtests/product-api.test.js
```

## Performance Thresholds

Default thresholds (tests fail if not met):

- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms
- **Error Rate**: < 1%
- **Min Request Rate**: > 10 req/s

## Results

Test results are saved to `loadtests/results/`:

- `*-summary.json` - Detailed JSON results
- Console output shows real-time metrics

## Metrics

Key metrics tracked:

- `http_req_duration` - Request response time
- `http_req_failed` - Failed request rate
- `http_reqs` - Total requests and request rate
- `iterations` - Number of complete test iterations
- Custom metrics per test (e.g., `login_success_rate`)

## Best Practices

1. **Start small**: Begin with smoke tests before running stress tests
2. **Monitor server**: Watch server resources (CPU, memory, DB connections) during tests
3. **Realistic data**: Use realistic test data and user behavior
4. **Gradual ramp-up**: Use stages to gradually increase load
5. **Run regularly**: Integrate into CI/CD to catch regressions

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Load Test
  run: |
    npm run loadtest
    # Or with specific thresholds for CI
    k6 run --summary-export=results.json loadtests/product-api.test.js
```

## Troubleshooting

### Connection Refused
- Ensure API server is running
- Check BASE_URL configuration

### High Error Rates
- Check server logs for errors
- Verify database connections
- Monitor server resources

### Slow Response Times
- Check database query performance (`/api/database/slow-queries`)
- Review server logs
- Consider scaling infrastructure

## Next Steps

- Add more test scenarios (cart, checkout, orders)
- Set up Grafana dashboards for k6 metrics
- Configure cloud load testing with k6 Cloud
- Add database performance metrics correlation
