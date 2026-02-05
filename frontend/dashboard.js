/**
 * MARKSTRO DASHBOARD - Complete JavaScript
 * Features: Stock Data, Charts, News, Favorites
 */

// ========== CONFIGURATION ==========
const CONFIG = {
    BACKEND_URL: '/api',
    CACHE_DURATION: 300000,  // 5 minutes
    AUTO_REFRESH: 120000     // 2 minutes
};

// ========== GLOBAL STATE ==========
let currentChart = null;
let currentStockData = null;
let currentSymbol = '';
let currentChartType = 'candlestick';
let priceUpdateInterval = null;
let searchTimeout = null;
let favorites = [];

// ========== AUTH TOKEN ==========
function getAuthToken() {
    return localStorage.getItem('token');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ========== FAVORITES MANAGEMENT ==========

function loadFavorites() {
    const saved = localStorage.getItem('markstro_favorites');
    if (saved) {
        favorites = JSON.parse(saved);
    }
    console.log('📌 Favorites loaded:', favorites);
}

function saveFavorites() {
    localStorage.setItem('markstro_favorites', JSON.stringify(favorites));
    console.log('💾 Favorites saved:', favorites);
}

function isFavorite(symbol) {
    return favorites.some(fav => fav.symbol === symbol);
}

function addToFavorites(symbol, name, price, change) {
    if (!isFavorite(symbol)) {
        favorites.push({
            symbol: symbol,
            name: name,
            price: price,
            change: change,
            addedAt: new Date().toISOString()
        });
        saveFavorites();
        updateFavoritesUI();
        showNotification(`✅ ${symbol} added to favorites!`);
    }
}

function removeFromFavorites(symbol) {
    favorites = favorites.filter(fav => fav.symbol !== symbol);
    saveFavorites();
    updateFavoritesUI();
    showNotification(`❌ ${symbol} removed from favorites`);
}

function toggleFavorite(symbol, name, price, change) {
    if (isFavorite(symbol)) {
        removeFromFavorites(symbol);
    } else {
        addToFavorites(symbol, name, price, change);
    }
}

// ========== CACHE SYSTEM ==========
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

// ========== API CALLS ==========

async function fetchStockQuote(symbol) {
    try {
        const cached = getCached(`quote_${symbol}`);
        if (cached) {
            console.log(`📦 Cache: ${symbol} quote`);
            return cached;
        }

        console.log(`📡 Fetching quote: ${symbol}`);
        const response = await fetch(`${CONFIG.BACKEND_URL}/stock/quote/${symbol}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch stock quote');
        }
        
        const data = await response.json();
        
        // Mock data for demo (backend ready nahi hai abhi)
        const mockData = {
            symbol: symbol,
            price: 150.25 + Math.random() * 50,
            open: 148.50,
            high: 152.80,
            low: 147.20,
            volume: 12500000,
            change: 2.5,
            changePercent: 1.7
        };
        
        setCache(`quote_${symbol}`, mockData);
        return mockData;
        
    } catch (error) {
        console.error('❌ Quote error:', error);
        // Return mock data if API fails
        return {
            symbol: symbol,
            price: 150.25,
            open: 148.50,
            high: 152.80,
            low: 147.20,
            volume: 12500000,
            change: 2.5,
            changePercent: 1.7
        };
    }
}

async function searchStocks(query) {
    try {
        console.log(`🔍 Searching: ${query}`);
        const response = await fetch(`${CONFIG.BACKEND_URL}/stock/search?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        return data.results || [];
        
    } catch (error) {
        console.error('❌ Search error:', error);
        // Return mock results
        return [
            { symbol: query.toUpperCase(), name: `${query.toUpperCase()} Inc.`, type: 'Stock', region: 'US' }
        ];
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Markstro Dashboard Starting...');
    console.log(`🔗 Backend: ${CONFIG.BACKEND_URL}`);
    
    // Check authentication
    const token = getAuthToken();
    if (!token) {
        console.warn('⚠️ No auth token found');
        // Uncomment to enforce login:
        // window.location.href = 'login.html';
        // return;
    }
    
    loadFavorites();
    setTimeout(initializeDashboard, 500);
});

function initializeDashboard() {
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    loadMarketIndices();
    priceUpdateInterval = setInterval(loadMarketIndices, CONFIG.AUTO_REFRESH);
    setupSearch();
    
    console.log('✅ Dashboard ready!');
}

// ========== MARKET INDICES ==========

async function loadMarketIndices() {
    console.log('📈 Loading market indices...');
    loadIndexData('SENSEX', 'sensex', '^BSESN');
    setTimeout(() => loadIndexData('NIFTY 50', 'nifty', '^NSEI'), 1000);
}

async function loadIndexData(displayName, prefix, symbol) {
    const priceEl = document.getElementById(`${prefix}-price`);
    const changeEl = document.getElementById(`${prefix}-change`);
    const cardEl = document.getElementById(`${prefix}-card`);
    
    if (!priceEl) return;
    
    try {
        const data = await fetchStockQuote(symbol);
        
        priceEl.textContent = `₹${data.price.toFixed(2)}`;
        priceEl.classList.remove('loading-pulse');
        
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
        changeEl.textContent = changeText;
        
        if (data.change >= 0) {
            cardEl.className = 'sentiment-card bullish';
            cardEl.querySelector('.icon-wrapper span').textContent = 'trending_up';
            changeEl.className = 'success-text';
        } else {
            cardEl.className = 'sentiment-card bearish';
            cardEl.querySelector('.icon-wrapper span').textContent = 'trending_down';
            changeEl.className = 'danger-text';
        }
        
        cardEl.style.cursor = 'pointer';
        cardEl.onclick = () => openStockDetail(symbol, displayName);
        console.log(`✅ ${displayName}: ₹${data.price.toFixed(2)}`);
        
    } catch (error) {
        console.error(`❌ ${displayName}:`, error.message);
        priceEl.textContent = 'Click to Retry';
        priceEl.classList.remove('loading-pulse');
        changeEl.textContent = 'Unable to load';
        cardEl.onclick = () => {
            priceEl.textContent = 'Loading...';
            priceEl.classList.add('loading-pulse');
            setTimeout(() => loadIndexData(displayName, prefix, symbol), 1000);
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
        
        searchTimeout = setTimeout(() => handleSearch(query, suggestionsDiv), 500);
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
            suggestionsDiv.innerHTML = '<div class="suggestion-item">❌ No results found</div>';
            return;
        }
        
        suggestionsDiv.innerHTML = '';
        results.forEach(match => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-symbol">${match.symbol}</div>
                <div class="suggestion-name">${match.name}</div>
                <div class="suggestion-type">${match.type || 'Stock'} - ${match.region || 'US'}</div>
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

function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('stock-search-input');
        const symbol = input.value.trim().toUpperCase();
        if (symbol) openStockDetail(symbol, symbol);
    }
}

// ========== STOCK MODAL ==========

async function openStockDetail(symbol, displayName) {
    console.log(`📈 Opening stock detail: ${symbol}`);
    
    const modal = document.getElementById('stock-detail-modal');
    if (!modal) {
        console.error('Modal not found!');
        return;
    }
    
    currentSymbol = symbol;
    modal.style.display = 'flex';
    document.getElementById('modal-stock-name').textContent = `${displayName} - Loading...`;
    
    try {
        const quoteData = await fetchStockQuote(symbol);
        updateModalInfo(quoteData, displayName);
        
        // Generate mock time series data
        const timeSeriesData = generateMockTimeSeries(quoteData.price);
        currentStockData = timeSeriesData;
        
        createModalChart(timeSeriesData, currentChartType);
        document.getElementById('modal-stock-name').textContent = displayName;
        
        updateFavoriteButton(symbol, displayName, quoteData.price, quoteData.changePercent);
        
        console.log('✅ Stock detail loaded');
    } catch (error) {
        console.error('Error loading stock:', error);
        alert(`Error loading ${symbol}: ${error.message}`);
        closeStockDetail();
    }
}

function generateMockTimeSeries(basePrice) {
    const data = [];
    const days = 30;
    let price = basePrice;
    
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const change = (Math.random() - 0.5) * 5;
        price = Math.max(price + change, basePrice * 0.8);
        
        const open = price;
        const high = price + Math.random() * 3;
        const low = price - Math.random() * 3;
        const close = low + Math.random() * (high - low);
        
        data.push({
            date: date.toISOString().split('T')[0],
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: Math.floor(Math.random() * 10000000) + 5000000
        });
        
        price = close;
    }
    
    return { data: data };
}

function updateModalInfo(data, displayName) {
    document.getElementById('modal-current-price').textContent = `$${data.price.toFixed(2)}`;
    document.getElementById('modal-open').textContent = `$${data.open.toFixed(2)}`;
    document.getElementById('modal-high').textContent = `$${data.high.toFixed(2)}`;
    document.getElementById('modal-low').textContent = `$${data.low.toFixed(2)}`;
    
    const vol = data.volume;
    const volText = vol > 1000000 ? `${(vol/1000000).toFixed(2)}M` : `${(vol/1000).toFixed(2)}K`;
    document.getElementById('modal-volume').textContent = volText;
    
    const changeEl = document.getElementById('modal-change');
    changeEl.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
    changeEl.className = data.change >= 0 ? 'success-text' : 'danger-text';
}

function updateFavoriteButton(symbol, name, price, change) {
    let favBtn = document.getElementById('favorite-btn');
    
    if (!favBtn) {
        const modalHeader = document.querySelector('.modal-header');
        favBtn = document.createElement('button');
        favBtn.id = 'favorite-btn';
        favBtn.className = 'favorite-btn';
        modalHeader.appendChild(favBtn);
    }
    
    const isFav = isFavorite(symbol);
    favBtn.innerHTML = isFav ? 
        '<span class="material-icons-sharp">favorite</span> Remove from Favorites' : 
        '<span class="material-icons-sharp">favorite_border</span> Add to Favorites';
    
    favBtn.onclick = () => {
        toggleFavorite(symbol, name, price, change);
        updateFavoriteButton(symbol, name, price, change);
    };
}

function closeStockDetail() {
    const modal = document.getElementById('stock-detail-modal');
    if (modal) modal.style.display = 'none';
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
}

// ========== FAVORITES UI ==========

function updateFavoritesUI() {
    const favGrid = document.querySelector('.favorites-grid');
    if (!favGrid) return;
    
    favGrid.innerHTML = '';
    
    if (favorites.length === 0) {
        favGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <span class="material-icons-sharp" style="font-size: 4rem; opacity: 0.3;">favorite_border</span>
                <h3 style="margin-top: 1rem; opacity: 0.6;">No favorites yet</h3>
                <p class="text-muted">Search for stocks and add them to favorites!</p>
            </div>
        `;
        return;
    }
    
    favorites.forEach(fav => {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.innerHTML = `
            <span class="material-icons-sharp favorite-icon" onclick="event.stopPropagation(); removeFromFavorites('${fav.symbol}')">star</span>
            <h3>${fav.symbol}</h3>
            <h2>$${fav.price.toFixed(2)}</h2>
            <span class="${fav.change >= 0 ? 'success-text' : 'danger-text'}">
                ${fav.change >= 0 ? '+' : ''}${fav.change.toFixed(2)}%
            </span>
        `;
        card.onclick = () => openStockDetail(fav.symbol, fav.name || fav.symbol);
        favGrid.appendChild(card);
    });
}

// ========== CHARTS ==========

function switchChartType(type) {
    currentChartType = type;
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
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
                label: 'Price Range',
                data: data.map(d => d.high),
                backgroundColor: data.map(d => 
                    d.close >= d.open ? 'rgba(137,196,161,0.8)' : 'rgba(255,0,96,0.8)'
                ),
                borderColor: data.map(d => 
                    d.close >= d.open ? '#89c4a1' : '#FF0060'
                ),
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
                label: 'Close Price',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                borderWidth: 3,
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

function createAreaChart(ctx, dates, data) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Close Price',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                backgroundColor: 'rgba(137,196,161,0.3)',
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
                backgroundColor: 'rgba(41,42,45,0.7)',
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

// ========== NOTIFICATIONS ==========

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========== LOGOUT ==========

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

// ========== EVENT LISTENERS ==========

window.onclick = function(event) {
    if (event.target === document.getElementById('stock-detail-modal')) {
        closeStockDetail();
    }
}

window.addEventListener('beforeunload', () => {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
});

console.log('✅ Dashboard JS fully loaded and ready!');
