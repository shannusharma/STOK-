# ========== BACKEND SERVER - SECURE API KEY STORAGE ==========
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from typing import Optional
from datetime import datetime, timedelta

app = FastAPI(title="Markstro Stock API")

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== SECURE API KEY ==========
# Get from environment variable (MOST SECURE)
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "YAC9TK9BLPINAFWJ")
API_BASE = "https://www.alphavantage.co/query"

# Simple in-memory cache
cache = {}
CACHE_DURATION = timedelta(minutes=5)

def get_cached(key):
    if key in cache:
        data, timestamp = cache[key]
        if datetime.now() - timestamp < CACHE_DURATION:
            print(f"📦 Cache hit: {key}")
            return data
        else:
            del cache[key]
    return None

def set_cache(key, data):
    cache[key] = (data, datetime.now())
    print(f"💾 Cached: {key}")

# ========== ROUTES ==========

@app.get("/")
def root():
    return {
        "message": "Markstro Stock API",
        "version": "1.0",
        "endpoints": [
            "/api/stock/quote/{symbol}",
            "/api/stock/timeseries/{symbol}",
            "/api/stock/search/{query}"
        ]
    }

@app.get("/api/stock/quote/{symbol}")
async def get_stock_quote(symbol: str):
    """Get current stock quote"""
    
    # Check cache
    cached = get_cached(f"quote_{symbol}")
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{API_BASE}?function=GLOBAL_QUOTE&symbol={symbol}&apikey={ALPHA_VANTAGE_KEY}"
            print(f"📡 Fetching quote: {symbol}")
            
            response = await client.get(url, timeout=10.0)
            data = response.json()
            
            # Error handling
            if "Error Message" in data:
                raise HTTPException(status_code=404, detail="Invalid stock symbol")
            
            if "Note" in data:
                raise HTTPException(status_code=429, detail="API rate limit exceeded")
            
            quote = data.get("Global Quote", {})
            if not quote:
                raise HTTPException(status_code=404, detail="No data available")
            
            # Format response
            result = {
                "symbol": symbol,
                "price": float(quote.get("05. price", 0)),
                "change": float(quote.get("09. change", 0)),
                "changePercent": float(quote.get("10. change percent", "0").replace("%", "")),
                "open": float(quote.get("02. open", 0)),
                "high": float(quote.get("03. high", 0)),
                "low": float(quote.get("04. low", 0)),
                "volume": int(quote.get("06. volume", 0)),
                "latestTradingDay": quote.get("07. latest trading day", "")
            }
            
            # Cache it
            set_cache(f"quote_{symbol}", result)
            
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/timeseries/{symbol}")
async def get_stock_timeseries(symbol: str):
    """Get historical stock data"""
    
    # Check cache
    cached = get_cached(f"timeseries_{symbol}")
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{API_BASE}?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={ALPHA_VANTAGE_KEY}"
            print(f"📊 Fetching timeseries: {symbol}")
            
            response = await client.get(url, timeout=10.0)
            data = response.json()
            
            if "Error Message" in data:
                raise HTTPException(status_code=404, detail="Invalid symbol")
            
            if "Note" in data:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            time_series = data.get("Time Series (Daily)", {})
            if not time_series:
                raise HTTPException(status_code=404, detail="No chart data")
            
            # Format data
            formatted_data = []
            for date in sorted(time_series.keys(), reverse=True)[:60]:
                values = time_series[date]
                formatted_data.append({
                    "date": date,
                    "open": float(values["1. open"]),
                    "high": float(values["2. high"]),
                    "low": float(values["3. low"]),
                    "close": float(values["4. close"]),
                    "volume": int(values["5. volume"])
                })
            
            result = {
                "symbol": symbol,
                "data": list(reversed(formatted_data))
            }
            
            set_cache(f"timeseries_{symbol}", result)
            
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/search/{query}")
async def search_stocks(query: str):
    """Search for stocks"""
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{API_BASE}?function=SYMBOL_SEARCH&keywords={query}&apikey={ALPHA_VANTAGE_KEY}"
            print(f"🔍 Searching: {query}")
            
            response = await client.get(url, timeout=10.0)
            data = response.json()
            
            if "Note" in data:
                raise HTTPException(status_code=429, detail="Rate limit")
            
            matches = data.get("bestMatches", [])
            
            # Format results
            results = []
            for match in matches[:10]:
                results.append({
                    "symbol": match.get("1. symbol", ""),
                    "name": match.get("2. name", ""),
                    "type": match.get("3. type", ""),
                    "region": match.get("4. region", "")
                })
            
            return results
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Run with: uvicorn server:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)