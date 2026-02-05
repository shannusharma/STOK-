import requests
import os
from dotenv import load_dotenv

load_dotenv()

class AlphaVantageService:
    def __init__(self):
        self.api_key = os.getenv('ALPHA_VANTAGE_KEY')
        self.base_url = 'https://www.alphavantage.co/query'
    
    def get_quote(self, symbol: str):
        try:
            params = {
                'function': 'GLOBAL_QUOTE',
                'symbol': symbol,
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            data = response.json()
            
            if 'Error Message' in data:
                raise Exception('Invalid stock symbol')
            
            if 'Note' in data:
                raise Exception('API rate limit exceeded')
            
            quote = data.get('Global Quote', {})
            
            if not quote:
                raise Exception('No data available')
            
            return {
                'symbol': symbol,
                'price': float(quote.get('05. price', 0)),
                'change': float(quote.get('09. change', 0)),
                'changePercent': float(quote.get('10. change percent', '0').replace('%', '')),
                'open': float(quote.get('02. open', 0)),
                'high': float(quote.get('03. high', 0)),
                'low': float(quote.get('04. low', 0)),
                'volume': int(quote.get('06. volume', 0)),
                'previousClose': float(quote.get('08. previous close', 0)),
                'latestTradingDay': quote.get('07. latest trading day', '')
            }
            
        except requests.exceptions.RequestException as e:
            raise Exception(f'Network error: {str(e)}')
        except Exception as e:
            raise Exception(str(e))
    
    def get_time_series(self, symbol: str):
        try:
            params = {
                'function': 'TIME_SERIES_DAILY',
                'symbol': symbol,
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            data = response.json()
            
            if 'Error Message' in data:
                raise Exception('Invalid stock symbol')
            
            if 'Note' in data:
                raise Exception('API rate limit exceeded')
            
            time_series = data.get('Time Series (Daily)', {})
            
            if not time_series:
                raise Exception('No chart data available')
            
            formatted_data = []
            for date in sorted(time_series.keys(), reverse=True)[:60]:
                values = time_series[date]
                formatted_data.append({
                    'date': date,
                    'open': float(values['1. open']),
                    'high': float(values['2. high']),
                    'low': float(values['3. low']),
                    'close': float(values['4. close']),
                    'volume': int(values['5. volume'])
                })
            
            formatted_data.reverse()
            
            return {
                'symbol': symbol,
                'data': formatted_data
            }
            
        except requests.exceptions.RequestException as e:
            raise Exception(f'Network error: {str(e)}')
        except Exception as e:
            raise Exception(str(e))
    
    def search_symbols(self, keywords: str):
        try:
            params = {
                'function': 'SYMBOL_SEARCH',
                'keywords': keywords,
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            data = response.json()
            
            if 'Note' in data:
                raise Exception('API rate limit exceeded')
            
            matches = data.get('bestMatches', [])
            
            results = []
            for match in matches[:10]:
                results.append({
                    'symbol': match.get('1. symbol', ''),
                    'name': match.get('2. name', ''),
                    'type': match.get('3. type', ''),
                    'region': match.get('4. region', ''),
                    'currency': match.get('8. currency', '')
                })
            
            return results
            
        except requests.exceptions.RequestException as e:
            raise Exception(f'Network error: {str(e)}')
        except Exception as e:
            raise Exception(str(e))