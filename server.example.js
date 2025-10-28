const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Zoho API Configuration - REPLACE WITH YOUR CREDENTIALS
const ZOHO_CONFIG = {
    clientId: 'YOUR_CLIENT_ID_HERE',
    clientSecret: 'YOUR_CLIENT_SECRET_HERE',
    redirectUri: 'http://localhost:3000/auth/callback',
    baseUrl: 'https://crm.zoho.com/crm/v2',
    organizationId: 'YOUR_ORG_ID_HERE'
};

// Database setup
const db = new sqlite3.Database('./dashboard.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    const createAccountsTable = `
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zoho_id TEXT UNIQUE NOT NULL,
            account_name TEXT,
            deal_signed_date TEXT,
            monthly_card_volume REAL,
            lead_status TEXT,
            created_date TEXT,
            modified_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createMonthlyMetricsTable = `
        CREATE TABLE IF NOT EXISTS monthly_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            account_count INTEGER DEFAULT 0,
            total_volume REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(year, month)
        )
    `;

    db.run(createAccountsTable);
    db.run(createMonthlyMetricsTable);
    console.log('Database tables initialized');
}

// Store access token (in production, use proper token storage)
let accessToken = null;

// OAuth callback endpoint
app.get('/auth/callback', async (req, res) => {
    console.log('OAuth callback received:');
    console.log('Query params:', req.query);
    console.log('Full URL:', req.url);
    console.log('Headers:', req.headers);
    
    const { code, error } = req.query;
    
    if (error) {
        console.error('OAuth error:', error);
        return res.status(400).send(`OAuth error: ${error}`);
    }
    
    if (!code) {
        console.error('No authorization code found in query params');
        return res.status(400).send('Authorization code not provided. Check Zoho redirect URI settings.');
    }

    try {
        console.log('Exchanging code for access token...');
        // Exchange code for access token
        const tokenData = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: ZOHO_CONFIG.clientId,
            client_secret: ZOHO_CONFIG.clientSecret,
            redirect_uri: ZOHO_CONFIG.redirectUri,
            code: code
        });

        const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = tokenResponse.data.access_token;
        console.log('Access token obtained successfully');
        
        // Redirect to dashboard with success message
        res.redirect('/?auth=success');
    } catch (error) {
        console.error('Error obtaining access token:', error.response?.data || error.message);
        console.error('Full error:', error);
        res.status(500).send(`Error obtaining access token: ${error.response?.data?.error || error.message}`);
    }
});

// Test callback endpoint
app.get('/test-callback', (req, res) => {
    console.log('Test callback received:', req.query);
    res.json({ message: 'Callback working!', query: req.query });
});

// Get authorization URL
app.get('/auth/url', (req, res) => {
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
        `scope=ZohoCRM.modules.ALL&` +
        `client_id=${ZOHO_CONFIG.clientId}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `redirect_uri=${encodeURIComponent(ZOHO_CONFIG.redirectUri)}`;
    
    console.log('Generated auth URL:', authUrl);
    console.log('Client ID:', ZOHO_CONFIG.clientId);
    console.log('Redirect URI:', ZOHO_CONFIG.redirectUri);
    
    res.json({ 
        authUrl,
        testCallback: 'http://localhost:3000/test-callback',
        expectedCallback: ZOHO_CONFIG.redirectUri
    });
});

// Fetch accounts from Zoho CRM
async function fetchAccountsFromZoho() {
    if (!accessToken) {
        throw new Error('No access token available');
    }

    try {
        const response = await axios.get(`${ZOHO_CONFIG.baseUrl}/Accounts`, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            },
            params: {
                fields: 'id,Account_Name,Deal_Signed,Monthly_Card_Volume,Lead_Status,Created_Time,Modified_Time'
            }
        });

        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching accounts from Zoho:', error.response?.data || error.message);
        throw error;
    }
}

// Sync accounts data
app.post('/api/sync-accounts', async (req, res) => {
    try {
        if (!accessToken) {
            return res.status(401).json({ error: 'Not authenticated. Please authorize first.' });
        }

        const accounts = await fetchAccountsFromZoho();
        
        // Clear existing data
        db.run('DELETE FROM accounts');
        
        // Insert new data
        const stmt = db.prepare(`
            INSERT INTO accounts (zoho_id, account_name, deal_signed_date, monthly_card_volume, lead_status, created_date, modified_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const account of accounts) {
            stmt.run([
                account.id,
                account.Account_Name || '',
                account.Deal_Signed || '',
                parseFloat(account.Monthly_Card_Volume) || 0,
                account.Lead_Status || '',
                account.Created_Time || '',
                account.Modified_Time || ''
            ]);
        }

        stmt.finalize();
        
        // Update monthly metrics
        await updateMonthlyMetrics();
        
        res.json({ 
            success: true, 
            message: `Synced ${accounts.length} accounts`,
            count: accounts.length
        });
    } catch (error) {
        console.error('Error syncing accounts:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update monthly metrics
async function updateMonthlyMetrics() {
    return new Promise((resolve, reject) => {
        // Get current month data
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Get last month data
        const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
        const lastYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth() + 1;

        // Current month query
        const currentMonthQuery = `
            SELECT COUNT(*) as account_count, COALESCE(SUM(monthly_card_volume), 0) as total_volume
            FROM accounts 
            WHERE strftime('%Y', deal_signed_date) = ? AND strftime('%m', deal_signed_date) = ?
        `;

        // Last month query (excluding Closed Merchant)
        const lastMonthQuery = `
            SELECT COUNT(*) as account_count, COALESCE(SUM(monthly_card_volume), 0) as total_volume
            FROM accounts 
            WHERE strftime('%Y', deal_signed_date) = ? AND strftime('%m', deal_signed_date) = ?
            AND lead_status != 'Closed Merchant'
        `;

        db.get(currentMonthQuery, [currentYear.toString(), currentMonth.toString().padStart(2, '0')], (err, currentRow) => {
            if (err) return reject(err);
            
            db.get(lastMonthQuery, [lastYear.toString(), lastMonth.toString().padStart(2, '0')], (err, lastRow) => {
                if (err) return reject(err);
                
                // Insert/update current month
                db.run(`
                    INSERT OR REPLACE INTO monthly_metrics (year, month, account_count, total_volume, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [currentYear, currentMonth, currentRow.account_count, currentRow.total_volume]);
                
                // Insert/update last month
                db.run(`
                    INSERT OR REPLACE INTO monthly_metrics (year, month, account_count, total_volume, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [lastYear, lastMonth, lastRow.account_count, lastRow.total_volume]);
                
                resolve();
            });
        });
    });
}

// Get dashboard data
app.get('/api/dashboard-data', (req, res) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth() + 1;

    // Get current month data
    const currentMonthQuery = `
        SELECT COUNT(*) as account_count, COALESCE(SUM(monthly_card_volume), 0) as total_volume
        FROM accounts 
        WHERE strftime('%Y', deal_signed_date) = ? AND strftime('%m', deal_signed_date) = ?
    `;

    // Get last month data (excluding Closed Merchant)
    const lastMonthQuery = `
        SELECT COUNT(*) as account_count, COALESCE(SUM(monthly_card_volume), 0) as total_volume
        FROM accounts 
        WHERE strftime('%Y', deal_signed_date) = ? AND strftime('%m', deal_signed_date) = ?
        AND lead_status != 'Closed Merchant'
    `;

    // Get last year data
    const lastYearQuery = `
        SELECT COUNT(*) as account_count, COALESCE(SUM(monthly_card_volume), 0) as total_volume
        FROM accounts 
        WHERE strftime('%Y', deal_signed_date) = ?
    `;

    db.get(currentMonthQuery, [currentYear.toString(), currentMonth.toString().padStart(2, '0')], (err, currentData) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get(lastMonthQuery, [lastYear.toString(), lastMonth.toString().padStart(2, '0')], (err, lastMonthData) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.get(lastYearQuery, [(currentYear - 1).toString()], (err, lastYearData) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Calculate changes
                const accountChange = lastMonthData.account_count > 0 ? 
                    ((currentData.account_count - lastMonthData.account_count) / lastMonthData.account_count * 100) : 0;
                
                const revenueChange = lastMonthData.total_volume > 0 ? 
                    ((currentData.total_volume - lastMonthData.total_volume) / lastMonthData.total_volume * 100) : 0;

                const accountYearChange = lastYearData.account_count > 0 ? 
                    ((currentData.account_count - lastYearData.account_count) / lastYearData.account_count * 100) : 0;
                
                const revenueYearChange = lastYearData.total_volume > 0 ? 
                    ((currentData.total_volume - lastYearData.total_volume) / lastYearData.total_volume * 100) : 0;

                res.json({
                    accounts: {
                        current: currentData.account_count,
                        lastMonth: lastMonthData.account_count,
                        lastYear: lastYearData.account_count,
                        change: accountChange,
                        yearChange: accountYearChange
                    },
                    revenue: {
                        current: currentData.total_volume,
                        lastMonth: lastMonthData.total_volume,
                        lastYear: lastYearData.total_volume,
                        change: revenueChange,
                        yearChange: revenueYearChange
                    }
                });
            });
        });
    });
});

// Webhook endpoint for real-time updates
app.post('/webhook/zoho', (req, res) => {
    console.log('Webhook received:', req.body);
    
    // Process webhook data
    const { event, data } = req.body;
    
    if (event === 'accounts.create' || event === 'accounts.update') {
        // Handle account creation/update
        console.log('Account updated via webhook');
        // You can implement real-time sync here
    }
    
    res.status(200).send('OK');
});

// Serve the main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Authorization URL: http://localhost:${PORT}/auth/url`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
