# stock_fetch.py
# Yeh script sab stocks ka data fetch karta hai using yfinance library.
# TATAMOTORS ko TATAMOTORS.NS mein change kiya gaya hai kyunki Indian NSE stocks ke liye .NS suffix zaroori hai.
# End date ko current date se match kiya gaya hai (August 29, 2025).

import yfinance as yf
import os
import pandas as pd

# Yeh tickers ki list hai, TATAMOTORS ko fix kiya gaya hai
tickers = ["IBM", "AAPL", "MSFT", "TATAMOTORS.NS", "TCS.NS", "RELIANCE.NS", "HDFCBANK.NS"]

# Yeh function sab stocks ka data fetch karta hai
def fetch_all_stocks():
    for ticker in tickers:
        print(f"📡 Fetching data for {ticker}...")
        try:
            # Data fetch karo using yfinance, start date se current date tak
            stock_data = yf.download(ticker, start="2020-01-01", end="2025-08-29")
            if not stock_data.empty:
                # Folder banane ka logic, data/{ticker} folder mein save karo
                folder = f"data/{ticker}"
                os.makedirs(folder, exist_ok=True)
                # Data ko CSV file mein save karo
                stock_data.to_csv(f"{folder}/{ticker}_stock_data.csv")
                print(f"✅ Saved {ticker} data to: {folder}/{ticker}_stock_data.csv")
            else:
                print(f"❌ No data found for {ticker}, skipping...")
        except Exception as e:
            print(f"❌ Error fetching {ticker}: {e}")

# Agar script direct run kiya jaye, toh function call karo
if __name__ == "__main__":
    fetch_all_stocks()

