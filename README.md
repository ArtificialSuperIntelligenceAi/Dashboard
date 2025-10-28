# Zoho Dashboard Backend

Backend service for the Zoho Analytics Dashboard that connects to Zoho CRM and provides real-time data.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### 3. Authorize with Zoho
1. Visit: `https://localhost:3000/auth/url`
2. Click the authorization URL
3. Sign in to Zoho and authorize the application
4. You'll be redirected back to the dashboard

### 4. Sync Data
1. Visit: `https://localhost:3000/api/sync-accounts` (POST request)
2. This will fetch all accounts from Zoho CRM and populate the database

### 5. View Dashboard
Visit: `https://localhost:3000`

## API Endpoints

- `GET /auth/url` - Get Zoho authorization URL
- `GET /auth/callback` - OAuth callback endpoint
- `POST /api/sync-accounts` - Sync accounts data from Zoho
- `GET /api/dashboard-data` - Get dashboard metrics
- `POST /webhook/zoho` - Webhook endpoint for real-time updates

## Database

The application uses SQLite database (`dashboard.db`) with two tables:
- `accounts` - Stores account data from Zoho CRM
- `monthly_metrics` - Stores calculated monthly metrics

## Webhook Setup

To enable real-time updates, configure a webhook in Zoho CRM:
1. Go to Zoho CRM Settings > Developer Space > Webhooks
2. Create a new webhook with URL: `https://your-domain.com/webhook/zoho`
3. Select events: Account Create, Update, Delete

## Configuration

Update `config.js` with your Zoho API credentials if needed.
