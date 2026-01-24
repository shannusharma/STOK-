# main.py - FastAPI Backend for Stock Predictor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests
from typing import Optional
from pydantic import BaseModel
import json

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Alpha Vantage API Configuration
ALPHA_VANTAGE_API_KEY = "YAC9TK9BLPINAFWJ"  # Replace with your API key
BASE_URL = "https://www.alphavantage.co/query"

class StockRequest(BaseModel):
    symbol: str

@app.get("/")
async def read_root():
    """Serve the main HTML page"""
    return FileResponse("index.html")

@app.get("/api/stock/quote/{symbol}")
async def get_stock_quote(symbol: str):
    """Get real-time stock quote"""
    try:
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol.upper(),
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        
        response = requests.get(BASE_URL, params=params)
        data = response.json()
        
        if "Error Message" in data:
            raise HTTPException(status_code=404, detail="Invalid stock symbol")
        
        if "Note" in data:
            raise HTTPException(status_code=429, detail="API rate limit exceeded")
        
        if "Global Quote" not in data or not data["Global Quote"]:
            raise HTTPException(status_code=404, detail="Stock data not found")
        
        quote = data["Global Quote"]
        
        # Format the response
        formatted_data = {
            "symbol": symbol.upper(),
            "price": float(quote.get("05. price", 0)),
            "change": float(quote.get("09. change", 0)),
            "changePercent": quote.get("10. change percent", "0%").replace("%", ""),
            "open": float(quote.get("02. open", 0)),
            "high": float(quote.get("03. high", 0)),
            "low": float(quote.get("04. low", 0)),
            "volume": int(quote.get("06. volume", 0)),
            "previousClose": float(quote.get("08. previous close", 0)),
            "latestTradingDay": quote.get("07. latest trading day", "")
        }
        
        return formatted_data
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/stock/timeseries/{symbol}")
async def get_stock_timeseries(symbol: str, interval: str = "daily"):
    """Get historical stock data for charts"""
    try:
        # Determine the function based on interval
        if interval == "intraday":
            function = "TIME_SERIES_INTRADAY"
            params = {
                "function": function,
                "symbol": symbol.upper(),
                "interval": "60min",
                "apikey": ALPHA_VANTAGE_API_KEY
            }
        else:
            function = "TIME_SERIES_DAILY"
            params = {
                "function": function,
                "symbol": symbol.upper(),
                "apikey": ALPHA_VANTAGE_API_KEY
            }
        
        response = requests.get(BASE_URL, params=params)
        data = response.json()
        
        if "Error Message" in data:
            raise HTTPException(status_code=404, detail="Invalid stock symbol")
        
        if "Note" in data:
            raise HTTPException(status_code=429, detail="API rate limit exceeded")
        
        # Extract time series data
        if interval == "intraday":
            time_series_key = "Time Series (60min)"
        else:
            time_series_key = "Time Series (Daily)"
        
        if time_series_key not in data:
            raise HTTPException(status_code=404, detail="Time series data not found")
        
        time_series = data[time_series_key]
        
        # Format data for Chart.js
        formatted_data = []
        for date, values in list(time_series.items())[:60]:  # Last 60 data points
            formatted_data.append({
                "date": date,
                "open": float(values["1. open"]),
                "high": float(values["2. high"]),
                "low": float(values["3. low"]),
                "close": float(values["4. close"]),
                "volume": int(values["5. volume"])
            })
        
        # Reverse to get chronological order
        formatted_data.reverse()
        
        return {
            "symbol": symbol.upper(),
            "data": formatted_data
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/stock/search/{query}")
async def search_stocks(query: str):
    """Search for stock symbols"""
    try:
        params = {
            "function": "SYMBOL_SEARCH",
            "keywords": query,
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        
        response = requests.get(BASE_URL, params=params)
        data = response.json()
        
        if "bestMatches" not in data:
            return {"results": []}
        
        results = []
        for match in data["bestMatches"][:10]:
            results.append({
                "symbol": match.get("1. symbol", ""),
                "name": match.get("2. name", ""),
                "type": match.get("3. type", ""),
                "region": match.get("4. region", ""),
                "currency": match.get("8. currency", "")
            })
        
        return {"results": results}
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/stock/overview/{symbol}")
async def get_company_overview(symbol: str):
    """Get company overview and fundamentals"""
    try:
        params = {
            "function": "OVERVIEW",
            "symbol": symbol.upper(),
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        
        response = requests.get(BASE_URL, params=params)
        data = response.json()
        
        if not data or "Symbol" not in data:
            raise HTTPException(status_code=404, detail="Company overview not found")
        
        formatted_data = {
            "symbol": data.get("Symbol", ""),
            "name": data.get("Name", ""),
            "description": data.get("Description", ""),
            "sector": data.get("Sector", ""),
            "industry": data.get("Industry", ""),
            "marketCap": data.get("MarketCapitalization", ""),
            "peRatio": data.get("PERatio", ""),
            "dividendYield": data.get("DividendYield", ""),
            "52WeekHigh": data.get("52WeekHigh", ""),
            "52WeekLow": data.get("52WeekLow", ""),
            "beta": data.get("Beta", "")
        }
        
        return formatted_data
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Stock Predictor API Server...")
    print("📊 Dashboard will be available at: http://localhost:8000")
    print("🔑 Don't forget to add your Alpha Vantage API key!")
    uvicorn.run(app, host="0.0.0.0", port=8000)