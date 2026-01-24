// script.js - Frontend JavaScript for Stock Predictor Dashboard

// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Global variables
let currentCharts = {};
let stockChartInstance = null;
let currentChartType = 'candlestick';
let currentStockData = null;

// ========== PAGE CONTENT TEMPLATES ==========
const pages = {
    dashboard: `
        <div class="top-section">
            <div class="search_div">
                <span class="material-icons-sharp">search</span>
                <input type="search" id="stock-search-input" placeholder="Search stocks (e.g., AAPL, GOOGL, MSFT)">
            </div>
            <div class="date">
                <input type="date" id="date-input">
            </div>
        </div>

        <h1>Dashboard</h1>

        <div id="stock-search-results" style="display:none; background: var(--color-white); padding: 1rem; border-radius: var(--border-radius-2); margin-bottom: 1rem;"></div>

        <div id="stock-details" style="display:none;">
            <div class="market-sentiment">
                <div class="sentiment-card bullish">
                    <div class="icon-wrapper">
                        <span class="material-icons-sharp">trending_up</span>
                    </div>
                    <div class="content">
                        <h3 id="stock-symbol-display">Stock</h3>
                        <h2 id="stock-current-price">$0.00</h2>
                        <small class="success-text" id="stock-change">+0.00%</small>
                    </div>
                </div>
                <div class="sentiment-card bearish">
                    <div class="icon-wrapper">
                        <span class="material-icons-sharp">assessment</span>
                    </div>
                    <div class="content">
                        <h3>Trading Volume</h3>
                        <h2 id="stock-volume">0</h2>
                        <small class="text-muted" id="stock-trading-day">Today</small>
                    </div>
                </div>
            </div>

            <div class="charts-section">
                <div class="chart-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3>Stock Performance - <span id="chart-stock-symbol"></span></h3>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="chart-type-btn active" data-type="candlestick" style="padding: 0.5rem 1rem; background: var(--color-primary); color: white; border-radius: 5px; cursor: pointer; border: none;">Candlestick</button>
                            <button class="chart-type-btn" data-type="line" style="padding: 0.5rem 1rem; background: var(--color-light); color: var(--color-dark); border-radius: 5px; cursor: pointer; border: none;">Line</button>
                            <button class="chart-type-btn" data-type="area" style="padding: 0.5rem 1rem; background: var(--color-light); color: var(--color-dark); border-radius: 5px; cursor: pointer; border: none;">Area</button>
                            <button class="chart-type-btn" data-type="bar" style="padding: 0.5rem 1rem; background: var(--color-light); color: var(--color-dark); border-radius: 5px; cursor: pointer; border: none;">Volume</button>
                        </div>
                    </div>
                    <div id="chart-loading" style="text-align: center; padding: 2rem; display: none;">
                        <p>Loading chart data...</p>
                    </div>
                    <canvas id="stockPerformanceChart"></canvas>
                </div>
            </div>
        </div>

        <div id="initial-prompt" style="text-align: center; padding: 3rem;">
            <span class="material-icons-sharp" style="font-size: 4rem; opacity: 0.3;">search</span>
            <h2 style="margin-top: 1rem; opacity: 0.6;">Search for a stock to get started</h2>
            <p class="text-muted">Try: AAPL, GOOGL, MSFT, TSLA, AMZN</p>
        </div>
    `,

    stocks: `
        <h1>Stocks</h1>
        <p class="text-muted">View and manage your stock portfolio</p>

        <div class="stocks-grid">
            <div class="stock-card">
                <div class="stock-header">
                    <h3>AAPL</h3>
                    <span class="success-text">+2.5%</span>
                </div>
                <h2>$185.50</h2>
                <p class="text-muted">Apple Inc.</p>
                <div class="stock-chart-mini">
                    <span class="material-icons-sharp">show_chart</span>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-header">
                    <h3>GOOGL</h3>
                    <span class="success-text">+1.8%</span>
                </div>
                <h2>$148.20</h2>
                <p class="text-muted">Alphabet Inc.</p>
                <div class="stock-chart-mini">
                    <span class="material-icons-sharp">show_chart</span>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-header">
                    <h3>MSFT</h3>
                    <span class="danger-text">-0.5%</span>
                </div>
                <h2>$380.15</h2>
                <p class="text-muted">Microsoft Corp.</p>
                <div class="stock-chart-mini">
                    <span class="material-icons-sharp">show_chart</span>
                </div>
            </div>
        </div>
    `,

    predictions: `
        <h1>Predictions</h1>
        <p class="text-muted">AI-powered stock market predictions</p>

        <div class="predictions-grid">
            <div class="prediction-card bullish-prediction">
                <div class="prediction-header">
                    <h3>AAPL</h3>
                    <span class="badge success">Bullish</span>
                </div>
                <div class="prediction-details">
                    <p><strong>Current:</strong> $185.50</p>
                    <p><strong>Predicted:</strong> $195.20</p>
                    <p><strong>Confidence:</strong> 87%</p>
                    <p class="success-text">+5.2% expected growth</p>
                </div>
            </div>
        </div>
    `,

    history: `
        <h1>History</h1>
        <p class="text-muted">Your trading history and past transactions</p>

        <div class="history-table">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Stock</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="6" style="text-align: center; padding: 2rem;">No trading history</td></tr>
                </tbody>
            </table>
        </div>
    `,

    favorites: `
        <h1>Favorites</h1>
        <p class="text-muted">Your favorite stocks and watchlist</p>

        <div class="favorites-grid">
            <div class="favorite-card">
                <span class="material-icons-sharp favorite-icon">star</span>
                <h3>AAPL</h3>
                <span class="success-text">+2.5%</span>
            </div>
        </div>
    `,

    news: `
        <h1>News</h1>
        <p class="text-muted">Latest market news and updates</p>

        <div class="news-list">
            <div class="news-card">
                <div class="news-header">
                    <h3>Tech Stocks Rally on Strong Earnings</h3>
                    <small>2 hours ago</small>
                </div>
                <p>Major technology companies reported better-than-expected earnings...</p>
                <a href="#" class="read-more">Read more →</a>
            </div>
        </div>
    `,

    messages: `
        <h1>Messages</h1>
        <p class="text-muted">Your notifications and alerts</p>

        <div class="messages-list">
            <div class="message-card unread">
                <span class="material-icons-sharp">notifications_active</span>
                <div class="message-content">
                    <h3>Welcome to Stock Predictor</h3>
                    <p>Start searching for stocks to track</p>
                    <small>Just now</small>
                </div>
            </div>
        </div>
    `,

    settings: `
        <div class="settings-header">
            <h1>Settings</h1>
            <p class="text-muted">Customize your dashboard</p>
        </div>

        <div class="settings-section">
            <h2>Appearance</h2>
            <div class="theme-cards">
                <div class="theme-card" data-theme="light">
                    <div class="theme-preview light-preview">
                        <div class="preview-sidebar"></div>
                        <div class="preview-content">
                            <div class="preview-header"></div>
                            <div class="preview-card"></div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <div class="theme-icon">
                            <span class="material-icons-sharp">light_mode</span>
                        </div>
                        <div class="theme-details">
                            <h3>Light Mode</h3>
                            <p>Bright interface</p>
                        </div>
                        <div class="theme-check" id="light-check">
                            <span class="material-icons-sharp">check_circle</span>
                        </div>
                    </div>
                </div>
                <div class="theme-card" data-theme="dark">
                    <div class="theme-preview dark-preview">
                        <div class="preview-sidebar"></div>
                        <div class="preview-content">
                            <div class="preview-header"></div>
                            <div class="preview-card"></div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <div class="theme-icon">
                            <span class="material-icons-sharp">dark_mode</span>
                        </div>
                        <div class="theme-details">
                            <h3>Dark Mode</h3>
                            <p>Easy on eyes</p>
                        </div>
                        <div class="theme-check" id="dark-check">
                            <span class="material-icons-sharp">check_circle</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    help: `
        <h1>Help Center</h1>
        <p class="text-muted">Get help and support</p>

        <div class="help-grid">
            <div class="help-card">
                <span class="material-icons-sharp">school</span>
                <h3>Getting Started</h3>
                <p>Learn the basics</p>
            </div>
        </div>
    `
};

// ========== API FUNCTIONS ==========
async function fetchStockQuote(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/quote/${symbol}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch stock data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching stock quote:', error);
        throw error;
    }
}

async function fetchStockTimeSeries(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/timeseries/${symbol}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch time series data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching time series:', error);
        throw error;
    }
}

// ========== STOCK SEARCH AND DISPLAY ==========
async function searchStock(symbol) {
    try {
        // Show loading
        document.getElementById('initial-prompt').style.display = 'none';
        document.getElementById('chart-loading').style.display = 'block';

        // Fetch quote data
        const quoteData = await fetchStockQuote(symbol);
        
        // Update stock display
        updateStockDisplay(quoteData);
        
        // Fetch and display chart
        const timeSeriesData = await fetchStockTimeSeries(symbol);
        currentStockData = timeSeriesData;
        
        // Show stock details
        document.getElementById('stock-details').style.display = 'block';
        document.getElementById('chart-loading').style.display = 'none';
        
        // Create chart
        createStockChart(timeSeriesData, currentChartType);
        
    } catch (error) {
        alert('Error: ' + error.message);
        document.getElementById('chart-loading').style.display = 'none';
        document.getElementById('initial-prompt').style.display = 'block';
    }
}

function updateStockDisplay(data) {
    // Update symbol and price
    document.getElementById('stock-symbol-display').textContent = data.symbol;
    document.getElementById('stock-current-price').textContent = `$${data.price.toFixed(2)}`;
    document.getElementById('chart-stock-symbol').textContent = data.symbol;
    
    // Update change
    const changePercent = parseFloat(data.changePercent);
    const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
    document.getElementById('stock-change').textContent = changeText;
    document.getElementById('stock-change').className = data.change >= 0 ? 'success-text' : 'danger-text';
    
    // Update volume
    const volume = data.volume;
    const volumeText = volume > 1000000 
        ? `${(volume / 1000000).toFixed(2)}M` 
        : volume > 1000 
        ? `${(volume / 1000).toFixed(2)}K` 
        : volume.toString();
    document.getElementById('stock-volume').textContent = volumeText;
    document.getElementById('stock-trading-day').textContent = data.latestTradingDay;
    
    // Update sentiment card color
    const sentimentCard = document.querySelector('.sentiment-card.bullish');
    if (data.change < 0) {
        sentimentCard.classList.remove('bullish');
        sentimentCard.classList.add('bearish');
        sentimentCard.querySelector('.icon-wrapper span').textContent = 'trending_down';
    } else {
        sentimentCard.classList.remove('bearish');
        sentimentCard.classList.add('bullish');
        sentimentCard.querySelector('.icon-wrapper span').textContent = 'trending_up';
    }
}

function createStockChart(data, type) {
    const canvas = document.getElementById('stockPerformanceChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (stockChartInstance) {
        stockChartInstance.destroy();
    }
    
    const dates = data.data.map(d => d.date);
    const chartData = data.data;
    
    if (type === 'candlestick') {
        createCandlestickChart(ctx, dates, chartData);
    } else if (type === 'line') {
        createLineChart(ctx, dates, chartData);
    } else if (type === 'area') {
        createAreaChart(ctx, dates, chartData);
    } else if (type === 'bar') {
        createVolumeChart(ctx, dates, chartData);
    }
}

function createCandlestickChart(ctx, dates, data) {
    stockChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Price',
                data: data.map(d => d.high),
                backgroundColor: data.map(d => d.close >= d.open ? 'rgba(137, 196, 161, 0.8)' : 'rgba(255, 0, 96, 0.8)'),
                borderColor: data.map(d => d.close >= d.open ? '#89c4a1' : '#FF0060'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
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
    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Close Price',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2
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
    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Close Price',
                data: data.map(d => d.close),
                borderColor: '#89c4a1',
                backgroundColor: 'rgba(137, 196, 161, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 2
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
    stockChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Volume',
                data: data.map(d => d.volume),
                backgroundColor: 'rgba(41, 42, 45, 0.6)',
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

// ========== PAGE NAVIGATION ==========
function loadPage(pageName) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = pages[pageName];

    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if(link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });

    localStorage.setItem('currentPage', pageName);

    if(pageName === 'dashboard') {
        initDashboard();
    } else if(pageName === 'settings') {
        initSettings();
    }

    mainContent.scrollTop = 0;
}

function initDashboard() {
    // Set date
    const dateInput = document.getElementById('date-input');
    if(dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Setup search
    const searchInput = document.getElementById('stock-search-input');
    if(searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') {
                const symbol = this.value.trim().toUpperCase();
                if(symbol) {
                    searchStock(symbol);
                }
            }
        });
    }

    // Setup chart type buttons
    setTimeout(() => {
        const chartBtns = document.querySelectorAll('.chart-type-btn');
        chartBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                chartBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const type = this.dataset.type;
                currentChartType = type;
                
                if(currentStockData) {
                    createStockChart(currentStockData, type);
                }
            });
        });
    }, 100);
}

function initSettings() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    
    document.querySelectorAll('.theme-check').forEach(check => {
        check.style.display = 'none';
    });
    
    const activeCheck = document.getElementById(savedTheme + '-check');
    if(activeCheck) activeCheck.style.display = 'block';

    document.querySelectorAll('.theme-card').forEach(card => {
        if(card.dataset.theme === savedTheme) {
            card.classList.add('selected');
        }
        
        card.addEventListener('click', function() {
            const theme = this.dataset.theme;
            document.body.classList.remove('dark-mode', 'light-mode');
            
            if(theme === 'dark') {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else if(theme === 'light') {
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                localStorage.setItem('theme', 'default');
            }
            
            document.querySelectorAll('.theme-check').forEach(c => c.style.display = 'none');
            document.getElementById(theme + '-check').style.display = 'block';
            
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

function logout() {
    if(confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        location.reload();
    }
}

// ========== INITIALIZE APP ==========
window.addEventListener('DOMContentLoaded', function() {
    // Load theme
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if(savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    // Setup navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            loadPage(this.dataset.page);
        });
    });

    // Load last page
    const lastPage = localStorage.getItem('currentPage') || 'dashboard';
    loadPage(lastPage);
});