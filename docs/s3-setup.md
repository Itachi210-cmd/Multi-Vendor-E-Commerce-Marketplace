# S3 Storage Configuration Guide: Local MinIO & Production AWS S3

This project uses standard AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for presigned direct browser file uploads.
It is engineered to work seamlessly with **Local MinIO (Docker)** during development and **Real AWS S3** in production with **zero code modifications**—only `.env` changes.

---

## Architecture: Direct-to-Storage Presigned Uploads

1. The frontend asks the backend: `POST /api/uploads/presign` with `{ fileName, contentType, folder }`.
2. The backend generates a cryptographically signed S3 `PutObjectCommand` URL that expires in 60 seconds and returns `{ uploadUrl, fileUrl, key }`.
3. The frontend `PUT`s the raw file bytes directly to `uploadUrl` (MinIO or S3). The backend never handles or buffers heavy file bytes.
4. The frontend saves the permanent `fileUrl` when creating or updating the product or vendor profile.

---

## 1. Local Development with MinIO (Docker)

MinIO is an S3-compatible, high-performance object store running as a service in `docker-compose.yml`.

### Starting MinIO
MinIO is launched automatically with Docker Compose:
```bash
docker compose up -d
```

Services exposed:
- **S3 API Endpoint:** `http://localhost:9000`
- **MinIO Web Console:** `http://localhost:9001`
- **Default Username:** `minioadmin`
- **Default Password:** `minioadmin`

### Automated Initialization (`minio-init` container)
The `minio-init` container in `docker-compose.yml` automatically:
1. Creates the bucket `marketplace-images`.
2. Sets anonymous read/download access on `marketplace-images` so images can be displayed publicly in browsers.
3. Sets CORS permissions allowing uploads from `http://localhost:5173`.

### Verifying MinIO
1. Open the MinIO Web Console at [http://localhost:9001](http://localhost:9001) in your browser.
2. Sign in with username `minioadmin` and password `minioadmin`.
3. View the `marketplace-images` bucket. When a vendor uploads a product image, you can inspect the file under `products/{vendorId}/...`.

### Backend `.env` for MinIO
```env
AWS_REGION=us-east-1
AWS_BUCKET=marketplace-images
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://localhost:9000
```

---

## 2. Production Setup with Real AWS S3

To deploy to real AWS S3:

### Step 1: Create an S3 Bucket
1. Open the [AWS S3 Console](https://s3.console.aws.amazon.com/s3/).
2. Click **Create bucket**.
3. Choose a bucket name (e.g., `my-marketplace-production-assets`) and select your AWS Region (e.g., `ap-south-1` or `us-east-1`).
4. **Block Public Access settings:** Uncheck "Block all public access" (acknowledge the warning) so uploaded product images can be served publicly.

### Step 2: Configure Bucket Policy (Public Read for Images)
Under the bucket's **Permissions** tab > **Bucket policy**, paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::my-marketplace-production-assets/products/*",
        "arn:aws:s3:::my-marketplace-production-assets/vendors/*"
      ]
    }
  ]
}
```
*(Replace `my-marketplace-production-assets` with your actual bucket name)*

### Step 3: Configure CORS (Cross-Origin Resource Sharing)
Under **Permissions** tab > **Cross-origin resource sharing (CORS)**, paste:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://your-frontend-domain.com",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 4: Create IAM User & Minimal Policy
Create an IAM user for the API server with programmatic access and attach the following minimal policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-marketplace-production-assets/*"
    }
  ]
}
```
Generate an **Access Key ID** and **Secret Access Key** for this IAM user.

---

## 3. Switching From MinIO to AWS S3

Switching requires **ZERO code modifications**. Update your backend `.env` variables:

```env
# 1. Provide your real AWS credentials
AWS_REGION=ap-south-1
AWS_BUCKET=my-marketplace-production-assets
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# 2. Leave S3_ENDPOINT, S3_FORCE_PATH_STYLE, and S3_PUBLIC_URL EMPTY or unset
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_URL=
```

When `S3_ENDPOINT` is empty, the application automatically uses standard AWS S3 endpoints:
`https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`.
