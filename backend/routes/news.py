from fastapi import APIRouter, HTTPException, Query
from services.newsapi import NewsAPIService

router = APIRouter(prefix='/api/news', tags=['News'])
news_service = NewsAPIService()

@router.get('/market')
async def get_market_news(
    category: str = Query('business'),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    try:
        data = news_service.get_market_news(category, page, page_size)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/search')
async def search_news(
    q: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    try:
        data = news_service.search_news(q, page, page_size)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))