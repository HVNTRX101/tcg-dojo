# TCG Dojo API - Postman Collection

This directory contains Postman collections and environments for testing the TCG Dojo API.

## Files

- `TCG-Dojo-API.postman_collection.json` - Complete API collection
- `TCG-Dojo-Local.postman_environment.json` - Local development environment
- `TCG-Dojo-Staging.postman_environment.json` - Staging environment
- `TCG-Dojo-Production.postman_environment.json` - Production environment

## Import to Postman

### Method 1: Import Files

1. Open Postman
2. Click **Import** button
3. Drag and drop the collection and environment files
4. Or click **Upload Files** and select the files

### Method 2: Import from GitHub

1. Open Postman
2. Click **Import** > **Link**
3. Paste the raw GitHub URL
4. Click **Continue** > **Import**

## Setup

### 1. Select Environment

1. Click the environment dropdown (top right)
2. Select **TCG Dojo - Local** (or your desired environment)

### 2. Authentication

The API uses HttpOnly cookies for authentication. To authenticate:

1. Open the **Authentication** folder
2. Run **Sign Up** to create a new account
3. Or run **Login** with existing credentials
4. The authentication cookie is automatically set
5. Subsequent requests will use the cookie

**Note**: With HttpOnly cookies, tokens are stored in cookies (not in environment variables).

### 3. Run Requests

All requests in the collection are organized by feature:

- **Authentication** - Sign up, login, profile
- **Products** - List, search, get details
- **Feature Flags** - Check flags, manage flags (admin)
- **Push Notifications** - Subscribe, test, unsubscribe
- **GDPR** - Data export, account deletion
- **Database Monitoring** - Performance stats (admin)

## Environments

### Local Development

```json
{
  "baseUrl": "http://localhost:3000/api"
}
```

### Staging

```json
{
  "baseUrl": "https://staging-api.tcgdojo.com/api"
}
```

### Production

```json
{
  "baseUrl": "https://api.tcgdojo.com/api"
}
```

## Variables

The collection uses the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000/api` |
| `accessToken` | JWT access token (deprecated with cookies) | Auto-managed |
| `userId` | Current user ID | Auto-set on login |
| `productId` | Product ID for testing | Manual |

## Features

### Auto-Set Variables

Some requests automatically set environment variables:

- **Login** sets `userId` from response
- **Sign Up** sets `userId` from response

### Pre-request Scripts

Collection includes pre-request scripts for:

- Adding authentication headers (if needed)
- Validating required variables
- Setting dynamic values

### Tests

Collection includes test scripts for:

- Validating response status codes
- Checking response structure
- Extracting data to variables
- Logging important information

### Example Test Script

```javascript
// Check status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Validate response structure
pm.test("Response has user object", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
});

// Save to environment
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('userId', jsonData.user.id);
}
```

## Running Collections

### Via Postman App

1. Open collection
2. Click **Run** button
3. Select requests to run
4. Configure iterations, delays, etc.
5. Click **Run TCG Dojo API**

### Via Newman (CLI)

Install Newman:
```bash
npm install -g newman
```

Run collection:
```bash
# With environment
newman run TCG-Dojo-API.postman_collection.json \
  -e TCG-Dojo-Local.postman_environment.json

# With specific folder
newman run TCG-Dojo-API.postman_collection.json \
  --folder "Authentication"

# Generate HTML report
newman run TCG-Dojo-API.postman_collection.json \
  -e TCG-Dojo-Local.postman_environment.json \
  -r html --reporter-html-export report.html
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Postman Tests
  run: |
    npm install -g newman
    newman run postman/TCG-Dojo-API.postman_collection.json \
      -e postman/TCG-Dojo-Staging.postman_environment.json \
      --reporters cli,json \
      --reporter-json-export results.json
```

### Docker

```bash
docker run -v $(pwd):/etc/newman -t postman/newman:alpine \
  run TCG-Dojo-API.postman_collection.json \
  -e TCG-Dojo-Local.postman_environment.json
```

## API Versioning

The API supports versioning via URL or headers:

### URL-based (Recommended)

```
GET {{baseUrl}}/v2/products
```

### Header-based

```
GET {{baseUrl}}/products
API-Version: 2
```

All unversioned requests default to v1.

## Authentication

### HttpOnly Cookies (Current)

Authentication uses HttpOnly cookies set by the server. Cookies are automatically included in requests.

### Legacy Bearer Token (Deprecated)

If you need to use bearer tokens (for testing):

1. Get token from login response (if available)
2. Set `Authorization: Bearer {{accessToken}}` header

## Admin Endpoints

Some endpoints require admin privileges:

- Feature flags management
- Database monitoring
- Push notification broadcast

To test admin endpoints:
1. Create an admin user via database
2. Login with admin credentials
3. Run admin requests

## Troubleshooting

### CORS Errors

If you get CORS errors:
- Ensure Postman interceptor is enabled
- Or disable "Follow redirects" in settings

### Authentication Issues

If authentication fails:
- Clear cookies in Postman
- Re-run login request
- Check environment variable `userId` is set

### 404 Not Found

- Verify `baseUrl` is correct
- Ensure server is running
- Check request path matches API routes

### Rate Limiting

If you hit rate limits:
- Wait for the limit window to reset (15 minutes)
- Or use admin account (higher limits)

## Support

- API Documentation: `/api-docs` (Swagger)
- GitHub Issues: https://github.com/HVNTRX101/tcg-dojo/issues
- Email: support@tcgdojo.com

## Contributing

To add new endpoints to the collection:

1. Add request to appropriate folder
2. Include description and examples
3. Add test scripts if applicable
4. Update this README
5. Submit PR

## License

MIT
