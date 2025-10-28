// Zoho Dashboard - Real-time data integration
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Set up auto-refresh every 5 minutes
    setInterval(loadDashboardData, 5 * 60 * 1000);
});

async function initializeDashboard() {
    // Check if user is authenticated
    const authStatus = await checkAuthStatus();
    
    if (!authStatus.authenticated) {
        showAuthRequired();
        return;
    }
    
    // Show sync button if authenticated but no data
    document.getElementById('syncSection').style.display = 'block';
    
    // Load dashboard data
    await loadDashboardData();
    
    // Set up connection status
    updateConnectionStatus(true);
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/dashboard-data');
        return { authenticated: response.ok };
    } catch (error) {
        return { authenticated: false };
    }
}

function showAuthRequired() {
    document.getElementById('connectionStatus').className = 'status-dot';
    document.getElementById('statusText').textContent = 'AUTH REQUIRED';
    document.getElementById('lastUpdate').textContent = 'Click to authorize with Zoho';
    
    // Make the status clickable to trigger auth
    document.getElementById('statusText').style.cursor = 'pointer';
    document.getElementById('statusText').onclick = () => {
        window.location.href = '/auth/url';
    };
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard-data');
        
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        
        const data = await response.json();
        
        // Update Accounts Analytics
        updateAccountsData(data.accounts);
        
        // Update Projected Volume
        updateRevenueData(data.revenue);
        
        // Update connection status
        updateConnectionStatus(true);
        
        // Update last update time
        document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        updateConnectionStatus(false);
    }
}

function updateAccountsData(accounts) {
    // Update main metric
    document.querySelector('[data-metric="total_accounts"]').textContent = formatNumber(accounts.current);
    document.getElementById('accountsLastMonth').textContent = formatNumber(accounts.lastMonth);
    document.getElementById('accountsLastYear').textContent = formatNumber(accounts.lastYear);
    
    // Calculate pace (accounts per day)
    const daysInMonth = new Date().getDate();
    const pace = accounts.current / daysInMonth;
    document.getElementById('accountsPace').textContent = pace.toFixed(1) + '/day';
    
    // Update momentum
    document.getElementById('accountsMomentum').textContent = (accounts.change > 0 ? '+' : '') + accounts.change.toFixed(1) + '%';
    
    // Update progress ring (assuming goal of 50 accounts)
    updateProgressRing('accounts', accounts.current, 50);
    
    // Update change indicators
    updateChangeIndicator('accountsChange', accounts.change, 'percentage');
    
    // Update trend indicators
    updateTrendIndicator('accountsMonthTrend', accounts.change);
    updateTrendIndicator('accountsYearTrend', accounts.yearChange);
}

function updateRevenueData(revenue) {
    // Update main metric
    document.querySelector('[data-metric="monthly_revenue"]').textContent = formatCurrency(revenue.current);
    document.getElementById('revenueLastMonth').textContent = formatCurrency(revenue.lastMonth);
    document.getElementById('revenueLastYear').textContent = formatCurrency(revenue.lastYear);
    
    // Calculate pace (revenue per day)
    const daysInMonth = new Date().getDate();
    const pace = revenue.current / daysInMonth;
    document.getElementById('revenuePace').textContent = formatCurrency(pace) + '/day';
    
    // Update momentum
    document.getElementById('revenueMomentum').textContent = (revenue.change > 0 ? '+' : '') + revenue.change.toFixed(1) + '%';
    
    // Update progress ring (assuming goal of $1M)
    updateProgressRing('revenue', revenue.current, 1000000);
    
    // Update change indicators
    updateChangeIndicator('revenueChange', revenue.change, 'currency');
    
    // Update trend indicators
    updateTrendIndicator('revenueMonthTrend', revenue.change);
    updateTrendIndicator('revenueYearTrend', revenue.yearChange);
}

function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'CONNECTED';
    } else {
        statusDot.className = 'status-dot';
        statusText.textContent = 'DISCONNECTED';
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

async function syncData() {
    try {
        const response = await fetch('/api/sync-accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`Success! Synced ${result.count} accounts from Zoho CRM.`);
            // Hide sync button and reload data
            document.getElementById('syncSection').style.display = 'none';
            await loadDashboardData();
        } else {
            throw new Error('Sync failed');
        }
    } catch (error) {
        console.error('Error syncing data:', error);
        alert('Error syncing data. Please try again.');
    }
}

function updateProgressRing(type, current, goal) {
    const progressRing = document.getElementById(`${type}ProgressRing`);
    const progressCurrent = document.getElementById(`${type}ProgressCurrent`);
    const progressPercent = document.getElementById(`${type}ProgressPercent`);
    
    if (progressRing && progressCurrent && progressPercent) {
        const percentage = (current / goal) * 100;
        const circumference = 2 * Math.PI * 35;
        const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
        
        progressRing.style.strokeDashoffset = offset;
        
        if (type === 'revenue') {
            progressCurrent.textContent = formatRevenueForProgress(current);
        } else {
            progressCurrent.textContent = current;
        }
        
        progressPercent.textContent = `${percentage.toFixed(0)}%`;
    }
}

function updateChangeIndicator(metricName, change, type = 'percentage') {
    const changeElement = document.getElementById(`${metricName}Change`);
    if (!changeElement) return;
    
    const changeValueElement = changeElement.querySelector('.change-value');
    const changePercentElement = changeElement.querySelector('.change-percent');
    
    if (changeValueElement && changePercentElement) {
        if (type === 'currency') {
            changeValueElement.textContent = change > 0 ? `+$${change.toFixed(0)}` : `$${change.toFixed(0)}`;
        } else {
            changeValueElement.textContent = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
        }
        
        changePercentElement.textContent = `(${change > 0 ? '+' : ''}${change.toFixed(1)}%)`;
        
        if (change > 0) {
            changeElement.className = 'metric-change positive';
        } else if (change < 0) {
            changeElement.className = 'metric-change negative';
        } else {
            changeElement.className = 'metric-change';
        }
    }
}

function updateTrendIndicator(elementId, change) {
    const trendElement = document.getElementById(elementId);
    if (!trendElement) return;
    
    const iconElement = trendElement.querySelector('.trend-icon');
    const textElement = trendElement.querySelector('.trend-text');
    
    if (change > 0) {
        iconElement.textContent = '↗';
        textElement.textContent = `+${change.toFixed(1)}%`;
        trendElement.className = 'comparison-trend positive';
    } else if (change < 0) {
        iconElement.textContent = '↘';
        textElement.textContent = `${change.toFixed(1)}%`;
        trendElement.className = 'comparison-trend negative';
    } else {
        iconElement.textContent = '→';
        textElement.textContent = '0%';
        trendElement.className = 'comparison-trend';
    }
}

function formatRevenueForProgress(value) {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
    } else {
        return value.toString();
    }
}

