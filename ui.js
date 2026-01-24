// ========== CONFIGURATION ==========
const ALPHA_VANTAGE_KEY = 'YAC9TK9BLPINAFWJ';
const API_BASE = 'https://www.alphavantage.co/query';

// Use popular US ETFs that track Indian market (since direct API access is limited)
const INDIAN_PROXIES = {
    'SENSEX': 'INDA',  // iShares MSCI India ETF (tracks Indian market)
    'NIFTY50': 'INDY'   // iShares India 50 ETF
};

let currentChart = null;
let currentStockData = null;
let currentSymbol = '';
let currentChartType = 'candlestick';
let priceUpdateInterval = null;
let searchTimeout = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');
    
    // Wait for page to fully load
    setTimeout(() => {
        initializeDashboard();
    }, 1000);
});

function initializeDashboard() {
    console.log('📊 Loading market data...');
    
    // Set date
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Load initial data
    loadMarketIndices();
    
    // Auto-refresh every 2 minutes (to avoid API limits)
    priceUpdateInterval = setInterval(loadMarketIndices, 120000);
    
    // Setup search
    setupSearch();
    
    console.log('✅ Dashboard ready!');
}

// ========== LOAD MARKET INDICES ==========
async function loadMarketIndices() {
    console.log('📈 Fetching SENSEX data...');
    loadIndexData('SENSEX', 'sensex', 'INDA');
    
    console.log('📊 Fetching NIFTY 50 data...');
    // Delay second call to avoid rate limit
    setTimeout(() => {
        loadIndexData('NIFTY 50', 'nifty', 'INDY');
    }, 2000);
}

async function loadIndexData(displayName, elementPrefix, symbol) {
    const priceEl = document.getElementById(`${elementPrefix}-price`);
    const changeEl = document.getElementById(`${elementPrefix}-change`);
    const cardEl = document.getElementById(`${elementPrefix}-card`);
    
    if (!priceEl || !changeEl || !cardEl) {
        console.error(`❌ Elements not found for ${elementPrefix}`);
        return;
    }
    
    try {
        console.log(`🔄 Fetching ${displayName} (${symbol})...`);
        const data = await fetchStockQuote(symbol);
        
        if (!data || !data.price) {
            throw new Error('No price data');
        }
        
        // Update price - Format as Indian Rupees (approximate conversion)
        const inrPrice = data.price * 83; // Approximate USD to INR
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
        
        // Update onclick
        cardEl.onclick = () => openStockDetail(symbol, displayName);
        
        console.log(`✅ ${displayName}: ₹${inrPrice.toFixed(2)} (${data.changePercent.toFixed(2)}%)`);
        
    } catch (error) {
        console.error(`❌ Error loading ${displayName}:`, error.message);
        priceEl.textContent = 'Click to Load';
        priceEl.classList.remove('loading-pulse');
        changeEl.textContent = 'Data unavailable';
        
        // Make card clickable to try loading data
        cardEl.onclick = () => {
            priceEl.textContent = 'Loading...';
            priceEl.classList.add('loading-pulse');
            setTimeout(() => loadIndexData(displayName, elementPrefix, symbol), 500);
        };
    }
}

// ========== ALPHA VANTAGE API FUNCTIONS ==========
async function fetchStockQuote(symbol) {
    try {
        const url = `${API_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
        console.log(`📡 Fetching quote for ${symbol}...`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Response:', data);
        
        if (data['Error Message']) {
            throw new Error('Invalid stock symbol');
        }
        
        if (data['Note']) {
            throw new Error('API rate limit - please wait 1 minute');
        }
        
        const quote = data['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
            throw new Error('No data available');
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
    } catch (error) {
        console.error('Quote fetch error:', error);
        throw error;
    }
}

async function fetchStockTimeSeries(symbol) {
    try {
        const url = `${API_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
        console.log(`📊 Fetching time series for ${symbol}...`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Error Message']) {
            throw new Error('Invalid symbol');
        }
        
        if (data['Note']) {
            throw new Error('API rate limit - please wait');
        }
        
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
        
        console.log(`✅ Loaded ${formattedData.length} days of data`);
        
        return {
            symbol: symbol,
            data: formattedData
        };
    } catch (error) {
        console.error('Time series error:', error);
        throw error;
    }
}

// ========== SEARCH FUNCTIONALITY ==========
function setupSearch() {
    const searchInput = document.getElementById('stock-search-input');
    if (!searchInput) {
        console.log('⚠️ Search input not found');
        return;
    }
    
    console.log('🔍 Search setup complete');
    
    // Create suggestions dropdown
    let suggestionsDiv = document.getElementById('search-suggestions');
    if (!suggestionsDiv) {
        suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'search-suggestions';
        suggestionsDiv.className = 'search-suggestions';
        searchInput.parentNode.appendChild(suggestionsDiv);
    }
    
    // Input listener
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
    
    // Hide on outside click
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

async function searchStocks(query, suggestionsDiv) {
    suggestionsDiv.innerHTML = '<div class="suggestion-item">Searching...</div>';
    suggestionsDiv.style.display = 'block';
    
    try {
        const url = `${API_BASE}?function=SYMBOL_SEARCH&keywords=${query}&apikey=${ALPHA_VANTAGE_KEY}`;
        console.log(`🔎 Searching for: ${query}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Note']) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item">⏱️ API limit reached. Wait 1 minute.</div>';
            return;
        }
        
        if (!data.bestMatches || data.bestMatches.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item">❌ No stocks found</div>';
            return;
        }
        
        // Show results
        suggestionsDiv.innerHTML = '';
        data.bestMatches.slice(0, 8).forEach(match => {
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
        
        console.log(`✅ Found ${data.bestMatches.length} results`);
        
    } catch (error) {
        console.error('Search error:', error);
        suggestionsDiv.innerHTML = '<div class="suggestion-item">❌ Search failed. Try again.</div>';
    }
}

function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        const searchInput = document.getElementById('stock-search-input');
        const symbol = searchInput.value.trim().toUpperCase();
        
        if (symbol) {
            const suggestionsDiv = document.getElementById('search-suggestions');
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
            openStockDetail(symbol, symbol);
        }
    }
}

// ========== STOCK DETAIL MODAL ==========
async function openStockDetail(symbol, displayName) {
    console.log(`📈 Opening details for ${symbol}`);
    
    const modal = document.getElementById('stock-detail-modal');
    if (!modal) {
        alert('Modal not found. Please check your HTML.');
        return;
    }
    
    currentSymbol = symbol;
    modal.style.display = 'flex';
    document.getElementById('modal-stock-name').textContent = `${displayName || symbol} - Loading...`;
    
    try {
        // Fetch quote
        const quoteData = await fetchStockQuote(symbol);
        updateModalInfo(quoteData);
        
        // Fetch chart data
        const timeSeriesData = await fetchStockTimeSeries(symbol);
        currentStockData = timeSeriesData;
        
        // Create chart
        createModalChart(timeSeriesData, currentChartType);
        
        document.getElementById('modal-stock-name').textContent = displayName || symbol;
        console.log('✅ Modal loaded successfully');
        
    } catch (error) {
        console.error('❌ Modal error:', error);
        alert(`Error: ${error.message}\n\nTip: Try another stock or wait 1 minute if rate limited.`);
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
    console.log(`📊 Switching to ${type} chart`);
    
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
    
    console.log('✅ Chart created');
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
                pointRadius: 0,
                pointHoverRadius: 6
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

// Close modal on outside click
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

console.log('✅ Stock dashboard script loaded');