// Simple static dashboard - just displays placeholder numbers
document.addEventListener('DOMContentLoaded', function() {
    // Set placeholder numbers for Accounts Analytics
    document.querySelector('[data-metric="total_accounts"]').textContent = '1,247';
    document.getElementById('accountsLastMonth').textContent = '1,180';
    document.getElementById('accountsLastYear').textContent = '980';
    document.getElementById('accountsPace').textContent = '2.1/day';
    document.getElementById('accountsMomentum').textContent = '+8.3%';
    
    // Set placeholder numbers for Projected Volume
    document.querySelector('[data-metric="monthly_revenue"]').textContent = '$125,000';
    document.getElementById('revenueLastMonth').textContent = '$118,000';
    document.getElementById('revenueLastYear').textContent = '$95,000';
    document.getElementById('revenuePace').textContent = '$4,200/day';
    document.getElementById('revenueMomentum').textContent = '+12.1%';
    
    // Set connection status
    document.getElementById('connectionStatus').className = 'status-dot connected';
    document.getElementById('statusText').textContent = 'Connected';
    
    // Set last update time
    document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    
    // Set progress ring values
    updateProgressRing('accounts', 1247, 50);
    updateProgressRing('revenue', 125000, 1000000);
    
    // Set change indicators
    updateChangeIndicator('accountsChange', 5.7, 'percentage');
    updateChangeIndicator('revenueChange', 5.9, 'currency');
    
    // Set trend indicators
    updateTrendIndicator('accountsMonthTrend', 5.7);
    updateTrendIndicator('accountsYearTrend', 27.2);
    updateTrendIndicator('revenueMonthTrend', 5.9);
    updateTrendIndicator('revenueYearTrend', 31.6);
});

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

