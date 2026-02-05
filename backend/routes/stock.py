from fastapi import APIRouter, HTTPException
from services.alphavantage import AlphaVantageService

router = APIRouter(prefix='/api/stock', tags=['Stock'])
service = AlphaVantageService()

@router.get('/quote/{symbol}')
async def get_stock_quote(symbol: str):
    try:
        return service.get_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/timeseries/{symbol}')
async def get_stock_timeseries(symbol: str):
    try:
        return service.get_time_series(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/search/{query}')
async def search_stocks(query: str):
    try:
        return service.search_symbols(query)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))