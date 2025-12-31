#!/bin/bash

# Railway Environment Variable Setup Script
# This script sets up the necessary environment variables for the biyewebappbackend project on Railway.

# Ensure Railway CLI is installed
if ! command -v npx &> /dev/null
then
    echo "npx could not be found. Please install Node.js and npm."
    exit
fi

echo "Setting up environment variables on Railway..."

# Database and Core
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set PORT=5000
npx @railway/cli variables set DATABASE_URL="your_postgresql_url_here"
npx @railway/cli variables set REDIS_URL="your_redis_url_here"
npx @railway/cli variables set JWT_SECRET="your_jwt_secret_here"

# Frontend and Communication
npx @railway/cli variables set FRONTEND_URL="https://biyeco.in"
npx @railway/cli variables set ADMIN_FRONTEND_URL="https://admin.biyeco.in"
npx @railway/cli variables set FROM_EMAIL="system@biyeco.in"

# Cloudflare R2 / AWS S3 Replacement
npx @railway/cli variables set R2_ACCOUNT_ID="your_r2_account_id"
npx @railway/cli variables set R2_ACCESS_KEY_ID="your_r2_access_key_id"
npx @railway/cli variables set R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
npx @railway/cli variables set R2_BUCKET_NAME="biye-media"
npx @railway/cli variables set R2_PUBLIC_URL="your_r2_public_url"
npx @railway/cli variables set UPLOAD_URL_EXPIRY_SECONDS="300"

# Authentication and Payments
npx @railway/cli variables set GOOGLE_CLIENT_ID="your_google_client_id"
npx @railway/cli variables set STRIPE_SECRET_KEY="your_stripe_secret_key"
npx @railway/cli variables set STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"
npx @railway/cli variables set STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"
npx @railway/cli variables set SSLCOMMERZ_STORE_ID="your_sslcommerz_store_id"
npx @railway/cli variables set SSLCOMMERZ_STORE_PASSWORD="your_sslcommerz_store_password"
npx @railway/cli variables set SSLCOMMERZ_SANDBOX="true"

# App Logic and Monitoring
npx @railway/cli variables set MODERATION_SECRET="your_moderation_secret"
npx @railway/cli variables set LOG_LEVEL="info"
npx @railway/cli variables set SUBSCRIPTION_ADMIN_EMAIL="support@biyeco.in"
npx @railway/cli variables set OBHIJAAT_INVITATION_REQUIRED="true"
npx @railway/cli variables set SUBSCRIPTION_SYNC_ENABLED="true"
npx @railway/cli variables set ALLOW_DUMMY_LOGIN="false"

echo "Environment variables setup complete!"
echo "After setting variables, the deployment will automatically restart."
echo "Check deployment status with: npx @railway/cli status"
