// ========== FRONTEND ONLY - NO API KEYS ==========
// This file handles ONLY UI logic
// All API calls go through backend

// ========== CONFIGURATION ==========
const CONFIG = {
    BACKEND_URL: 'http://localhost:8000/api', // Your backend server
    CACHE_DURATION: 300000, // 5 minutes
    AUTO_REFRESH_INTERVAL: 300000 // 5 minutes
};

// ========== GLOBAL STATE ==========
let currentChart = null;
let currentStockData = null;
let currentSymbol = '';
let currentChartType = 'candlestick';
let priceUpdateInterval = null;
let searchTimeout = null;

// ========== SIMPLE CACHE ==========
const cache = new Map();

function getCached(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() - item.time > CONFIG.CACHE_DURATION) {
        cache.delete(key);
        return null;
    }
    return item.data;
}

function setCache(key, data) {
    cache.set(key, { data, time: Date.now() });
}

// ========== BACKEND API CALLS ==========
async function fetchStockQuote(symbol) {
    try {
        // Check cache first
        const cached = getCached(`quote_${symbol}`);
        if (cached) {
            console.log(`📦 Using cached quote for ${symbol}`);
            return cached;
        }

        console.log(`📡 Fetching quote for ${symbol}...`);
        const response = await fetch(`${CONFIG.BACKEND_URL}/stock/quote/${symbol}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch stock data');
        }
        
        const data = await response.json();
        setCache(`quote_${symbol}`, data);
        return data;
        
    } catch (error) {
        console.error('❌ Quote error:', error);
        throw error;
    }
}

async function fetchStockTimeSeries(symbol) {
    try {
        const cached = getCached(`timeseries_${symbol}`);
        if (cached) {
            console.log(`📦 Using cached timeseries for ${symbol}`);
            return cached;
        }

        console.log(`📊 Fetching timeseries for ${symbol}...`);
        const response = await fetch(`${CONFIG.BACKEND_URL}/stock/timeseries/${symbol}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch chart data');
        }
        
        const data = await response.json();
        setCache(`timeseries_${symbol}`, data);
        return data;
        
    } catch (error) {
        console.error('❌ Timeseries error:', error);
        throw error;
    }
}

async function searchStocks(query) {
    try {
        console.log(`🔍 Searching: ${query}`);
        const response = await fetch(`${CONFIG.BACKEND_URL}/stock/search/${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('❌ Search error:', error);
        throw error;
    }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Markstro Dashboard Initializing...');
    console.log(`🔗 Backend: ${CONFIG.BACKEND_URL}`);
    
    setTimeout(() => {
        initializeDashboard();
    }, 500);
});

function initializeDashboard() {
    // Set date
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Load market data
    loadMarketIndices();
    
    // Auto-refresh
    priceUpdateInterval = setInterval(loadMarketIndices, CONFIG.AUTO_REFRESH_INTERVAL);
    
    // Setup search
    setupSearch();
    
    console.log('✅ Dashboard ready!');
}

// ========== MARKET INDICES ==========
async function loadMarketIndices() {
    console.log('📈 Loading market indices...');
    
    loadIndexData('SENSEX', 'sensex', 'INDA');
    
    setTimeout(() => {
        loadIndexData('NIFTY 50', 'nifty', 'INDY');
    }, 2000);
}

async function loadIndexData(displayName, elementPrefix, symbol) {
    const priceEl = document.getElementById(`${elementPrefix}-price`);
    const changeEl = document.getElementById(`${elementPrefix}-change`);
    const cardEl = document.getElementById(`${elementPrefix}-card`);
    
    if (!priceEl || !changeEl || !cardEl) return;
    
    try {
        const data = await fetchStockQuote(symbol);
        
        // Convert to INR
        const inrPrice = data.price * 83;
        priceEl.textContent = `₹${inrPrice.toFixed(2)}`;
        priceEl.classList.remove('loading-pulse');
        
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

// ========== SEARCH ==========
function setupSearch() {
    const searchInput = document.getElementById('stock-search-input');
    if (!searchInput) return;
    
    let suggestionsDiv = document.getElementById('search-suggestions');
    if (!suggestionsDiv) {
        suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'search-suggestions';
        suggestionsDiv.className = 'search-suggestions';
        searchInput.parentNode.appendChild(suggestionsDiv);
    }
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (searchTimeout) clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            handleSearch(query, suggestionsDiv);
        }, 500);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const symbol = this.value.trim().toUpperCase();
            if (symbol) {
                suggestionsDiv.style.display = 'none';
                openStockDetail(symbol, symbol);
            }
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

async function handleSearch(query, suggestionsDiv) {
    suggestionsDiv.innerHTML = '<div class="suggestion-item">🔍 Searching...</div>';
    suggestionsDiv.style.display = 'block';
    
    try {
        const results = await searchStocks(query);
        
        if (!results || results.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item">❌ No results</div>';
            return;
        }
        
        suggestionsDiv.innerHTML = '';
        results.forEach(match => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-symbol">${match.symbol}</div>
                <div class="suggestion-name">${match.name}</div>
                <div class="suggestion-type">${match.type}</div>
            `;
            
            item.onclick = () => {
                document.getElementById('stock-search-input').value = match.symbol;
                suggestionsDiv.style.display = 'none';
                openStockDetail(match.symbol, match.name);
            };
            
            suggestionsDiv.appendChild(item);
        });
        
    } catch (error) {
        suggestionsDiv.innerHTML = `<div class="suggestion-item">❌ ${error.message}</div>`;
    }
}

// ========== STOCK MODAL ==========
async function openStockDetail(symbol, displayName) {
    console.log(`📈 Opening ${symbol}...`);
    
    const modal = document.getElementById('stock-detail-modal');
    if (!modal) return;
    
    currentSymbol = symbol;
    modal.style.display = 'flex';
    document.getElementById('modal-stock-name').textContent = `${displayName} - Loading...`;
    
    try {
        const quoteData = await fetchStockQuote(symbol);
        updateModalInfo(quoteData);
        
        const timeSeriesData = await fetchStockTimeSeries(symbol);
        currentStockData = timeSeriesData;
        
        createModalChart(timeSeriesData, currentChartType);
        
        document.getElementById('modal-stock-name').textContent = displayName;
        console.log('✅ Modal loaded');
        
    } catch (error) {
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
        : `${(data.volume / 1000).toFixed(2)}K`;
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

// ========== CHARTS ==========
function switchChartType(type) {
    currentChartType = type;
    
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
    if (currentChart) currentChart.destroy();
    
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
                label: 'Price',
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
                        label: (ctx) => {
                            const d = data[ctx.dataIndex];
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
                label: 'Close',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                borderWidth: 3,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function createAreaChart(ctx, dates, data) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Close',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                backgroundColor: 'rgba(137, 196, 161, 0.3)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
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
                backgroundColor: 'rgba(41, 42, 45, 0.7)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// ========== HELPERS ==========
function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('stock-search-input');
        const symbol = input.value.trim().toUpperCase();
        if (symbol) openStockDetail(symbol, symbol);
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('stock-detail-modal');
    if (event.target === modal) closeStockDetail();
}

window.addEventListener('beforeunload', () => {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
});

console.log('✅ Frontend loaded - Waiting for backend...');