# Cloudinary Setup & Testing Guide

**Last Updated**: November 2, 2025

---

## Step 1: Get Your Cloudinary Credentials

1. **Sign up or Log in** to Cloudinary:
   - Go to: https://cloudinary.com/
   - Create a free account (or log in if you already have one)

2. **Get Your Credentials** from the Dashboard:
   - After logging in, you'll see your **Dashboard**
   - Look for the "Product Environment Credentials" section
   - You'll need these three values:
     - **Cloud Name**
     - **API Key**
     - **API Secret**

---

## Step 2: Update Your `.env` File

**Important**: Edit the `backend/.env` file (NOT `.env.example`)

1. **Open** [backend/.env](backend/.env)

2. **Find** these lines (around line 38-40):
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name_here
   CLOUDINARY_API_KEY=your_api_key_here
   CLOUDINARY_API_SECRET=your_api_secret_here
   ```

3. **Replace** with your actual credentials:
   ```env
   CLOUDINARY_CLOUD_NAME=dxyz123abc
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
   ```

4. **Save** the file

5. **Server will automatically restart** (nodemon detects the change)

---

## Step 3: Verify Configuration

After saving the `.env` file with real credentials, check the server logs:

```bash
# The server should show:
✅ Database connected successfully
🚀 Server running on port 3000
```

No Cloudinary-specific errors should appear.

---

## Step 4: Test Image Upload

### A. Get a Seller Authentication Token

First, you need to register/login as a seller:

```bash
# Register as a seller
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "password": "SecurePassword123!",
    "name": "Test Seller",
    "role": "SELLER"
  }'
```

**Save the token** from the response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ...
}
```

---

### B. Upload a Single Image

```bash
# Replace <TOKEN> with your actual token
# Replace <PRODUCT_ID> with an existing product ID

curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/images \
  -H "Authorization: Bearer <TOKEN>" \
  -F "image=@/path/to/your/image.jpg" \
  -F "alt=Product front view"
```

**Example Product IDs** from test data:
- Charizard V: `cb6ee0fc-81a2-4ea6-8a44-98adeab117ec`
- Charizard: `9d924a18-b059-49f1-b36c-e77214ec2232`
- Black Lotus: `5f42a925-2445-42bd-abd3-22389cb1131a`

**Example with a real file**:
```bash
# Windows PowerShell
curl -X POST http://localhost:3000/api/products/cb6ee0fc-81a2-4ea6-8a44-98adeab117ec/images `
  -H "Authorization: Bearer eyJhbGc..." `
  -F "image=@C:\Users\YourName\Pictures\charizard.jpg"

# macOS/Linux
curl -X POST http://localhost:3000/api/products/cb6ee0fc-81a2-4ea6-8a44-98adeab117ec/images \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "image=@/Users/yourname/Pictures/charizard.jpg"
```

---

### C. Expected Success Response

```json
{
  "image": {
    "id": "uuid",
    "productId": "cb6ee0fc-81a2-4ea6-8a44-98adeab117ec",
    "url": "https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/tcg-marketplace/abc123.jpg",
    "publicId": "tcg-marketplace/abc123",
    "alt": "Product front view",
    "displayOrder": 0,
    "isPrimary": true,
    "createdAt": "2025-11-02T21:00:00.000Z"
  },
  "message": "Image uploaded successfully"
}
```

---

### D. Upload Multiple Images

```bash
curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/images/bulk \
  -H "Authorization: Bearer <TOKEN>" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg"
```

**Max**: 10 images per request

---

### E. Verify Image is Accessible

1. **Copy the `url`** from the response
2. **Open it in a browser** - You should see your uploaded image
3. **Check the product** via API:
   ```bash
   curl http://localhost:3000/api/products/<PRODUCT_ID>
   ```
   The `images` array should include your uploaded image(s)

---

## Step 5: Test Image Management

### Set Primary Image

```bash
curl -X PUT http://localhost:3000/api/products/<PRODUCT_ID>/images/<IMAGE_ID>/primary \
  -H "Authorization: Bearer <TOKEN>"
```

### Reorder Images

```bash
curl -X PUT http://localhost:3000/api/products/<PRODUCT_ID>/images/reorder \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "imageIds": ["image-id-1", "image-id-2", "image-id-3"]
  }'
```

### Delete Image

```bash
curl -X DELETE http://localhost:3000/api/products/<PRODUCT_ID>/images/<IMAGE_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

**Note**: The image will be deleted from both the database AND Cloudinary.

---

## Common Issues & Solutions

### Issue 1: "Invalid signature"

**Cause**: Wrong API Secret

**Solution**: Double-check your `CLOUDINARY_API_SECRET` in the `.env` file

---

### Issue 2: "Unauthorized"

**Cause**: Missing or invalid authentication token

**Solution**:
1. Make sure you registered as a `SELLER` (not `USER`)
2. Include the `Authorization: Bearer <token>` header
3. Token expires after 7 days - get a new one if needed

---

### Issue 3: "Product not found"

**Cause**: Invalid product ID

**Solution**: Use one of the test product IDs or create a new product first

---

### Issue 4: "File too large"

**Cause**: Image exceeds 10MB limit

**Solution**:
1. Compress the image
2. Or increase the limit in `backend/src/middleware/upload.ts`

---

### Issue 5: "Invalid file type"

**Cause**: File is not an image or unsupported format

**Solution**: Only these formats are supported:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

---

## Image Processing Features

### Automatic Optimizations

When you upload an image, the backend automatically:

1. **Resizes** to max 2000x2000px (maintains aspect ratio)
2. **Converts** to JPEG with progressive loading
3. **Compresses** to 85% quality
4. **Generates** a 300x300px thumbnail
5. **Uploads** to Cloudinary with folder organization

### Cloudinary Transformations

You can modify images on-the-fly using Cloudinary URL transformations:

**Original**:
```
https://res.cloudinary.com/your_cloud/image/upload/v123/tcg-marketplace/abc.jpg
```

**Resize to 500px width**:
```
https://res.cloudinary.com/your_cloud/image/upload/w_500/v123/tcg-marketplace/abc.jpg
```

**Square thumbnail (200x200)**:
```
https://res.cloudinary.com/your_cloud/image/upload/c_fill,h_200,w_200/v123/tcg-marketplace/abc.jpg
```

**Learn more**: https://cloudinary.com/documentation/image_transformations

---

## Cloudinary Dashboard

After uploading images, view them in your Cloudinary dashboard:

1. Go to: https://cloudinary.com/console/media_library
2. Click on the **tcg-marketplace** folder
3. You'll see all uploaded product images
4. Click any image to:
   - View details
   - Get transformation URLs
   - Delete manually

---

## Testing Checklist

- [ ] Updated `.env` with real Cloudinary credentials
- [ ] Server restarted successfully (no Cloudinary errors)
- [ ] Registered as a SELLER role
- [ ] Got authentication token
- [ ] Uploaded single image successfully
- [ ] Image URL is accessible in browser
- [ ] Uploaded multiple images in bulk
- [ ] Set primary image
- [ ] Reordered images
- [ ] Deleted an image
- [ ] Verified image deleted from Cloudinary
- [ ] Checked product endpoint shows images array

---

## Production Recommendations

### 1. Security

- **Never commit** real credentials to Git
- Use **environment variables** for all deployments
- Rotate your **API Secret** periodically
- Enable **Cloudinary's security features**:
  - Signed URLs for private content
  - Access control lists (ACLs)

### 2. Performance

- Enable **CDN** (Cloudinary includes this by default)
- Use **lazy loading** for images on frontend
- Implement **responsive images** with srcset
- Consider **WebP format** for modern browsers

### 3. Storage

- **Free tier limits**: 25 GB storage, 25 GB bandwidth/month
- Monitor usage in Cloudinary dashboard
- Set up **alerts** for approaching limits
- Consider **upgrading** if needed for production

### 4. Monitoring

- Track upload success/failure rates
- Monitor average upload times
- Log Cloudinary API errors
- Set up alerting for quota limits

---

## Quick Reference

### Environment Variables

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=tcg-marketplace
```

### API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Upload single | POST | `/api/products/:id/images` |
| Upload multiple | POST | `/api/products/:id/images/bulk` |
| Get images | GET | `/api/products/:id/images` |
| Set primary | PUT | `/api/products/:id/images/:imageId/primary` |
| Reorder | PUT | `/api/products/:id/images/reorder` |
| Delete | DELETE | `/api/products/:id/images/:imageId` |

### File Limits

- **Max file size**: 10 MB per image
- **Max bulk upload**: 10 images per request
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Auto-resize**: Max 2000x2000px

---

## Next Steps

Once Cloudinary is working:

1. ✅ **Test all image endpoints** (upload, delete, reorder, etc.)
2. ✅ **Integrate with frontend** - Build image upload UI
3. ✅ **Add image gallery** - Display product images in carousel
4. ✅ **Implement drag-and-drop** - Better UX for image reordering
5. ✅ **Move to Phase 2** - Start building marketplace features

---

## Support

### Cloudinary Resources

- **Documentation**: https://cloudinary.com/documentation
- **Support**: https://support.cloudinary.com
- **Community**: https://community.cloudinary.com

### Project Resources

- **API Documentation**: `PHASE_1_API_DOCUMENTATION.md`
- **Test Results**: `TEST_RESULTS.md`
- **Development Plan**: `DEVELOPMENT_ANALYSIS.md`

---

**Setup Guide Version**: 1.0
**Last Updated**: November 2, 2025
**Status**: Ready for Testing
