"""
News API Service
Latest market news fetch karne ke liye
"""

import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

class NewsAPIService:
    def __init__(self):
        # API key environment se load karo
        self.api_key = os.getenv('NEWS_API_KEY')
        self.base_url = 'https://newsapi.org/v2'
    
    def get_market_news(self, category='business', page=1, page_size=10):
        """
        Market news fetch karo
        
        Args:
            category (str): News category ('business', 'technology', etc.)
            page (int): Page number
            page_size (int): Results per page
        
        Returns:
            dict: News articles
        """
        try:
            # Last 7 days ka news fetch karo
            from_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            
            params = {
                'apiKey': self.api_key,
                'category': category,
                'language': 'en',
                'sortBy': 'publishedAt',
                'from': from_date,
                'page': page,
                'pageSize': page_size
            }
            
            response = requests.get(
                f'{self.base_url}/top-headlines',
                params=params,
                timeout=10
            )
            
            data = response.json()
            
            # Error handling
            if data.get('status') == 'error':
                raise Exception(data.get('message', 'News API error'))
            
            articles = data.get('articles', [])
            
            # Format articles
            formatted_articles = []
            for article in articles:
                # Skip articles without essential info
                if not article.get('title') or article.get('title') == '[Removed]':
                    continue
                
                formatted_articles.append({
                    'title': article.get('title', ''),
                    'description': article.get('description', ''),
                    'url': article.get('url', ''),
                    'urlToImage': article.get('urlToImage', ''),
                    'publishedAt': article.get('publishedAt', ''),
                    'source': article.get('source', {}).get('name', 'Unknown'),
                    'author': article.get('author', 'Unknown')
                })
            
            return {
                'totalResults': data.get('totalResults', 0),
                'articles': formatted_articles
            }
            
        except requests.exceptions.RequestException as e:
            raise Exception(f'Network error: {str(e)}')
        except Exception as e:
            raise Exception(str(e))
    
    def search_news(self, query: str, page=1, page_size=10):
        """
        Specific topic par news search karo
        
        Args:
            query (str): Search query (e.g., 'stock market', 'AAPL')
            page (int): Page number
            page_size (int): Results per page
        
        Returns:
            dict: Search results
        """
        try:
            # Last 30 days ka news
            from_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            params = {
                'apiKey': self.api_key,
                'q': query,
                'language': 'en',
                'sortBy': 'publishedAt',
                'from': from_date,
                'page': page,
                'pageSize': page_size
            }
            
            response = requests.get(
                f'{self.base_url}/everything',
                params=params,
                timeout=10
            )
            
            data = response.json()
            
            if data.get('status') == 'error':
                raise Exception(data.get('message', 'Search failed'))
            
            articles = data.get('articles', [])
            
            # Format results
            formatted_articles = []
            for article in articles:
                if not article.get('title') or article.get('title') == '[Removed]':
                    continue
                
                formatted_articles.append({
                    'title': article.get('title', ''),
                    'description': article.get('description', ''),
                    'url': article.get('url', ''),
                    'urlToImage': article.get('urlToImage', ''),
                    'publishedAt': article.get('publishedAt', ''),
                    'source': article.get('source', {}).get('name', 'Unknown'),
                    'author': article.get('author', 'Unknown')
                })
            
            return {
                'totalResults': data.get('totalResults', 0),
                'articles': formatted_articles,
                'query': query
            }
            
        except requests.exceptions.RequestException as e:
            raise Exception(f'Network error: {str(e)}')
        except Exception as e:
            raise Exception(str(e))