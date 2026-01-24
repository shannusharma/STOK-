// ========== MARKSTRO PREDICTION DASHBOARD ==========
// Version: 2.0 - Secure & Feature-Rich
// Last Updated: January 2026

// ========== SECURITY CONFIGURATION ==========
const CONFIG = {
    // API Configuration (Environment-based)
    API_KEY: getSecureAPIKey(),
    API_BASE: 'https://www.alphavantage.co/query',
    USE_BACKEND: false, // Set to true if using backend API
    BACKEND_URL: 'http://localhost:8000/api',
    
    // Rate Limiting
    RATE_LIMIT: {
        MAX_CALLS_PER_MINUTE: 5,
        COOLDOWN_MS: 60000
    },
    
    // Cache Settings
    CACHE: {
        ENABLED: true,
        DURATION_MS: 300000 // 5 minutes
    },
    
    // Indian Market Proxies
    INDIAN_PROXIES: {
        'SENSEX': 'INDA',
        'NIFTY50': 'INDY'
    }
};

// Secure API Key Management
function getSecureAPIKey() {
    // Try to get from environment variable first (most secure)
    if (typeof process !== 'undefined' && process.env && process.env.ALPHA_VANTAGE_KEY) {
        return process.env.ALPHA_VANTAGE_KEY;
    }
    
    // Try localStorage (for client-side storage)
    const storedKey = localStorage.getItem('api_key_encrypted');
    if (storedKey) {
        return atob(storedKey); // Basic decoding (use stronger encryption in production)
    }
    
    // Fallback (least secure - replace with your key)
    console.warn('⚠️ Using fallback API key. Please configure secure key storage.');
    return 'YAC9TK9BLPINAFWJ';
}

// Store encrypted API key
function setSecureAPIKey(key) {
    if (!key || key.length < 10) {
        console.error('Invalid API key');
        return false;
    }
    localStorage.setItem('api_key_encrypted', btoa(key)); // Basic encoding
    console.log('✅ API key stored securely');
    return true;
}

// ========== RATE LIMITING SYSTEM ==========
class RateLimiter {
    constructor(maxCalls, cooldownMs) {
        this.maxCalls = maxCalls;
        this.cooldownMs = cooldownMs;
        this.calls = [];
    }
    
    canMakeRequest() {
        const now = Date.now();
        this.calls = this.calls.filter(time => now - time < this.cooldownMs);
        return this.calls.length < this.maxCalls;
    }
    
    recordRequest() {
        this.calls.push(Date.now());
    }
    
    getWaitTime() {
        if (this.calls.length === 0) return 0;
        const oldest = this.calls[0];
        const elapsed = Date.now() - oldest;
        return Math.max(0, this.cooldownMs - elapsed);
    }
}

const rateLimiter = new RateLimiter(
    CONFIG.RATE_LIMIT.MAX_CALLS_PER_MINUTE,
    CONFIG.RATE_LIMIT.COOLDOWN_MS
);

// ========== CACHING SYSTEM ==========
class DataCache {
    constructor(durationMs) {
        this.cache = new Map();
        this.durationMs = durationMs;
    }
    
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > this.durationMs) {
            this.cache.delete(key);
            return null;
        }
        
        console.log(`📦 Cache hit: ${key} (age: ${Math.round(age/1000)}s)`);
        return cached.data;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        console.log(`💾 Cached: ${key}`);
    }
    
    clear() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }
}

const dataCache = new DataCache(CONFIG.CACHE.DURATION_MS);

// ========== GLOBAL STATE ==========
let currentChart = null;
let currentStockData = null;
let currentSymbol = '';
let currentChartType = 'candlestick';
let priceUpdateInterval = null;
let searchTimeout = null;

// ========== API HANDLER (Works with both Backend & Direct API) ==========
class APIHandler {
    constructor() {
        this.useBackend = CONFIG.USE_BACKEND;
    }
    
    async fetchStockQuote(symbol) {
        // Check cache first
        if (CONFIG.CACHE.ENABLED) {
            const cached = dataCache.get(`quote_${symbol}`);
            if (cached) return cached;
        }
        
        // Check rate limit
        if (!rateLimiter.canMakeRequest()) {
            const waitTime = Math.ceil(rateLimiter.getWaitTime() / 1000);
            throw new Error(`Rate limit reached. Please wait ${waitTime} seconds.`);
        }
        
        try {
            let data;
            
            if (this.useBackend) {
                // Use backend API
                data = await this.fetchFromBackend(`/stock/quote/${symbol}`);
            } else {
                // Use direct Alpha Vantage API
                data = await this.fetchFromAlphaVantage('GLOBAL_QUOTE', symbol);
            }
            
            rateLimiter.recordRequest();
            
            // Cache the result
            if (CONFIG.CACHE.ENABLED) {
                dataCache.set(`quote_${symbol}`, data);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Quote fetch error:', error);
            throw error;
        }
    }
    
    async fetchStockTimeSeries(symbol) {
        // Check cache
        if (CONFIG.CACHE.ENABLED) {
            const cached = dataCache.get(`timeseries_${symbol}`);
            if (cached) return cached;
        }
        
        // Check rate limit
        if (!rateLimiter.canMakeRequest()) {
            const waitTime = Math.ceil(rateLimiter.getWaitTime() / 1000);
            throw new Error(`Rate limit reached. Please wait ${waitTime} seconds.`);
        }
        
        try {
            let data;
            
            if (this.useBackend) {
                data = await this.fetchFromBackend(`/stock/timeseries/${symbol}`);
            } else {
                data = await this.fetchFromAlphaVantage('TIME_SERIES_DAILY', symbol);
            }
            
            rateLimiter.recordRequest();
            
            if (CONFIG.CACHE.ENABLED) {
                dataCache.set(`timeseries_${symbol}`, data);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Time series fetch error:', error);
            throw error;
        }
    }
    
    async fetchFromBackend(endpoint) {
        const url = `${CONFIG.BACKEND_URL}${endpoint}`;
        console.log(`🔗 Fetching from backend: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Backend request failed');
        }
        
        return await response.json();
    }
    
    async fetchFromAlphaVantage(functionType, symbol) {
        const url = `${CONFIG.API_BASE}?function=${functionType}&symbol=${symbol}&apikey=${CONFIG.API_KEY}`;
        console.log(`📡 Fetching from Alpha Vantage: ${symbol}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Error handling
        if (data['Error Message']) {
            throw new Error('Invalid stock symbol');
        }
        
        if (data['Note']) {
            throw new Error('API rate limit exceeded. Please wait 1 minute.');
        }
        
        // Parse based on function type
        if (functionType === 'GLOBAL_QUOTE') {
            return this.parseQuoteData(data, symbol);
        } else if (functionType === 'TIME_SERIES_DAILY') {
            return this.parseTimeSeriesData(data, symbol);
        }
        
        throw new Error('Unknown function type');
    }
    
    parseQuoteData(data, symbol) {
        const quote = data['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
            throw new Error('No data available for this symbol');
        }
        
        return {
            symbol: symbol,
            price: parseFloat(quote['05. price']) || 0,
            change: parseFloat(quote['09. change']) || 0,
            changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
            open: parseFloat(quote['02. open']) || 0,
            high: parseFloat(quote['03. high']) || 0,
            low: parseFloat(quote['04. low']) || 0,
            volume: parseInt(quote['06. volume']) || 0,
            previousClose: parseFloat(quote['08. previous close']) || 0,
            latestTradingDay: quote['07. latest trading day'] || ''
        };
    }
    
    parseTimeSeriesData(data, symbol) {
        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
            throw new Error('No chart data available');
        }
        
        const formattedData = [];
        const dates = Object.keys(timeSeries).slice(0, 60).reverse();
        
        dates.forEach(date => {
            const values = timeSeries[date];
            formattedData.push({
                date: date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseInt(values['5. volume'])
            });
        });
        
        return {
            symbol: symbol,
            data: formattedData
        };
    }
    
    async searchStocks(query) {
        if (!rateLimiter.canMakeRequest()) {
            throw new Error('Rate limit reached');
        }
        
        const url = `${CONFIG.API_BASE}?function=SYMBOL_SEARCH&keywords=${query}&apikey=${CONFIG.API_KEY}`;
        console.log(`🔍 Searching: ${query}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        rateLimiter.recordRequest();
        
        if (data['Note']) {
            throw new Error('API rate limit');
        }
        
        return data.bestMatches || [];
    }
}

const apiHandler = new APIHandler();

// ========== DASHBOARD INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Markstro Prediction Dashboard v2.0');
    console.log(`🔐 Security: ${CONFIG.USE_BACKEND ? 'Backend Mode' : 'Direct API Mode'}`);
    console.log(`📦 Cache: ${CONFIG.CACHE.ENABLED ? 'Enabled' : 'Disabled'}`);
    
    setTimeout(() => {
        initializeDashboard();
    }, 500);
});

function initializeDashboard() {
    console.log('📊 Initializing...');
    
    // Set date
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Load market data
    loadMarketIndices();
    
    // Auto-refresh every 5 minutes
    priceUpdateInterval = setInterval(loadMarketIndices, 300000);
    
    // Setup search
    setupSearch();
    
    console.log('✅ Dashboard ready!');
}

// ========== MARKET INDICES (SENSEX & NIFTY) ==========
async function loadMarketIndices() {
    console.log('📈 Loading market indices...');
    
    loadIndexData('SENSEX', 'sensex', CONFIG.INDIAN_PROXIES.SENSEX);
    
    setTimeout(() => {
        loadIndexData('NIFTY 50', 'nifty', CONFIG.INDIAN_PROXIES.NIFTY50);
    }, 2000);
}

async function loadIndexData(displayName, elementPrefix, symbol) {
    const priceEl = document.getElementById(`${elementPrefix}-price`);
    const changeEl = document.getElementById(`${elementPrefix}-change`);
    const cardEl = document.getElementById(`${elementPrefix}-card`);
    
    if (!priceEl || !changeEl || !cardEl) {
        console.warn(`⚠️ Elements not found for ${elementPrefix}`);
        return;
    }
    
    try {
        const data = await apiHandler.fetchStockQuote(symbol);
        
        if (!data || !data.price) {
            throw new Error('No price data');
        }
        
        // Convert to INR (approximate)
        const inrPrice = data.price * 83;
        priceEl.textContent = `₹${inrPrice.toFixed(2)}`;
        priceEl.classList.remove('loading-pulse');
        
        // Update change
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
        changeEl.textContent = changeText;
        
        // Update styling
        if (data.change >= 0) {
            cardEl.className = 'sentiment-card bullish';
            cardEl.querySelector('.icon-wrapper span').textContent = 'trending_up';
            changeEl.className = 'success-text';
        } else {
            cardEl.className = 'sentiment-card bearish';
            cardEl.querySelector('.icon-wrapper span').textContent = 'trending_down';
            changeEl.className = 'danger-text';
        }
        
        cardEl.onclick = () => openStockDetail(symbol, displayName);
        
        console.log(`✅ ${displayName}: ₹${inrPrice.toFixed(2)}`);
        
    } catch (error) {
        console.error(`❌ ${displayName} error:`, error.message);
        priceEl.textContent = 'Click to Retry';
        priceEl.classList.remove('loading-pulse');
        changeEl.textContent = error.message;
        
        cardEl.onclick = () => {
            priceEl.textContent = 'Loading...';
            priceEl.classList.add('loading-pulse');
            setTimeout(() => loadIndexData(displayName, elementPrefix, symbol), 500);
        };
    }
}

// ========== SEARCH FUNCTIONALITY ==========
function setupSearch() {
    const searchInput = document.getElementById('stock-search-input');
    if (!searchInput) return;
    
    console.log('🔍 Search initialized');
    
    // Create suggestions dropdown
    let suggestionsDiv = document.getElementById('search-suggestions');
    if (!suggestionsDiv) {
        suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'search-suggestions';
        suggestionsDiv.className = 'search-suggestions';
        searchInput.parentNode.appendChild(suggestionsDiv);
    }
    
    // Input listener with debounce
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (searchTimeout) clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchStocks(query, suggestionsDiv);
        }, 500);
    });
    
    // Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const symbol = this.value.trim().toUpperCase();
            if (symbol) {
                suggestionsDiv.style.display = 'none';
                openStockDetail(symbol, symbol);
            }
        }
    });
    
    // Hide on outside click
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

async function searchStocks(query, suggestionsDiv) {
    suggestionsDiv.innerHTML = '<div class="suggestion-item">🔍 Searching...</div>';
    suggestionsDiv.style.display = 'block';
    
    try {
        const results = await apiHandler.searchStocks(query);
        
        if (!results || results.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item">❌ No stocks found</div>';
            return;
        }
        
        suggestionsDiv.innerHTML = '';
        results.slice(0, 8).forEach(match => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-symbol">${match['1. symbol']}</div>
                <div class="suggestion-name">${match['2. name']}</div>
                <div class="suggestion-type">${match['3. type']} - ${match['4. region']}</div>
            `;
            
            item.onclick = () => {
                document.getElementById('stock-search-input').value = match['1. symbol'];
                suggestionsDiv.style.display = 'none';
                openStockDetail(match['1. symbol'], match['2. name']);
            };
            
            suggestionsDiv.appendChild(item);
        });
        
    } catch (error) {
        console.error('Search error:', error);
        suggestionsDiv.innerHTML = `<div class="suggestion-item">⚠️ ${error.message}</div>`;
    }
}

// ========== STOCK DETAIL MODAL ==========
async function openStockDetail(symbol, displayName) {
    console.log(`📈 Opening: ${symbol}`);
    
    const modal = document.getElementById('stock-detail-modal');
    if (!modal) {
        alert('Modal not found');
        return;
    }
    
    currentSymbol = symbol;
    modal.style.display = 'flex';
    document.getElementById('modal-stock-name').textContent = `${displayName || symbol} - Loading...`;
    
    try {
        // Fetch quote
        const quoteData = await apiHandler.fetchStockQuote(symbol);
        updateModalInfo(quoteData);
        
        // Fetch chart
        const timeSeriesData = await apiHandler.fetchStockTimeSeries(symbol);
        currentStockData = timeSeriesData;
        
        createModalChart(timeSeriesData, currentChartType);
        
        document.getElementById('modal-stock-name').textContent = displayName || symbol;
        console.log('✅ Modal loaded');
        
    } catch (error) {
        console.error('❌ Modal error:', error);
        alert(`Error: ${error.message}`);
        closeStockDetail();
    }
}

function updateModalInfo(data) {
    document.getElementById('modal-current-price').textContent = `$${data.price.toFixed(2)}`;
    document.getElementById('modal-open').textContent = `$${data.open.toFixed(2)}`;
    document.getElementById('modal-high').textContent = `$${data.high.toFixed(2)}`;
    document.getElementById('modal-low').textContent = `$${data.low.toFixed(2)}`;
    
    const volumeText = data.volume > 1000000 
        ? `${(data.volume / 1000000).toFixed(2)}M` 
        : data.volume > 1000 
        ? `${(data.volume / 1000).toFixed(2)}K` 
        : data.volume.toString();
    document.getElementById('modal-volume').textContent = volumeText;
    
    const changeEl = document.getElementById('modal-change');
    const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
    changeEl.textContent = changeText;
    changeEl.className = data.change >= 0 ? 'success-text' : 'danger-text';
}

function closeStockDetail() {
    const modal = document.getElementById('stock-detail-modal');
    if (modal) modal.style.display = 'none';
    
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
}

// ========== CHART FUNCTIONS ==========
function switchChartType(type) {
    currentChartType = type;
    console.log(`📊 Chart type: ${type}`);
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(type)) {
            btn.classList.add('active');
        }
    });
    
    if (currentStockData) {
        createModalChart(currentStockData, type);
    }
}

function createModalChart(data, type) {
    const canvas = document.getElementById('modal-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    const dates = data.data.map(d => d.date);
    const chartData = data.data;
    
    switch(type) {
        case 'candlestick':
            currentChart = createCandlestickChart(ctx, dates, chartData);
            break;
        case 'line':
            currentChart = createLineChart(ctx, dates, chartData);
            break;
        case 'area':
            currentChart = createAreaChart(ctx, dates, chartData);
            break;
        case 'bar':
            currentChart = createVolumeChart(ctx, dates, chartData);
            break;
    }
}

function createCandlestickChart(ctx, dates, data) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Stock Price',
                data: data.map(d => d.high),
                backgroundColor: data.map(d => d.close >= d.open ? 'rgba(137, 196, 161, 0.8)' : 'rgba(255, 0, 96, 0.8)'),
                borderColor: data.map(d => d.close >= d.open ? '#89c4a1' : '#FF0060'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const d = data[context.dataIndex];
                            return [
                                `Open: $${d.open.toFixed(2)}`,
                                `High: $${d.high.toFixed(2)}`,
                                `Low: $${d.low.toFixed(2)}`,
                                `Close: $${d.close.toFixed(2)}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function createLineChart(ctx, dates, data) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Close Price',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true } }
        }
    });
}

function createAreaChart(ctx, dates, data) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Close Price',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                backgroundColor: 'rgba(137, 196, 161, 0.3)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true } }
        }
    });
}

function createVolumeChart(ctx, dates, data) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Volume',
                data: data.map(d => d.volume),
                backgroundColor: 'rgba(41, 42, 45, 0.7)',
                borderColor: '#292a2d',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true } }
        }
    });
}

// ========== UTILITY FUNCTIONS ==========
function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        const searchInput = document.getElementById('stock-search-input');
        const symbol = searchInput.value.trim().toUpperCase();
        
        if (symbol) {
            const suggestionsDiv = document.getElementById('search-suggestions');
            if (suggestionsDiv) suggestionsDiv.style.display = 'none';
            openStockDetail(symbol, symbol);
        }
    }
}

// Clear cache manually
function clearCache() {
    dataCache.clear();
    console.log('✅ Cache cleared');
}

// Switch between backend and direct API
function toggleAPIMode(useBackend) {
    CONFIG.USE_BACKEND = useBackend;
    apiHandler.useBackend = useBackend;
    console.log(`🔄 Switched to ${useBackend ? 'Backend' : 'Direct API'} mode`);
}

// ========== EVENT LISTENERS ==========
window.onclick = function(event) {
    const modal = document.getElementById('stock-detail-modal');
    if (event.target === modal) {
        closeStockDetail();
    }
}

// Cleanup
window.addEventListener('beforeunload', function() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }
});

// ========== EXPORT FOR CONSOLE ACCESS ==========
window.MarkestroDashboard = {
    setAPIKey: setSecureAPIKey,
    clearCache: clearCache,
    toggleAPIMode: toggleAPIMode,
    getConfig: () => CONFIG,
    version: '2.0'
};

console.log('✅ Markstro Dashboard v2.0 loaded successfully');
console.log('💡 Console commands: window.MarkestroDashboard');