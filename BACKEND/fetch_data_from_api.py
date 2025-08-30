# fetch_data_from_api.py
# Yeh script stock_fetch.py se fetch_all_stocks function import karta hai aur call karta hai.
# ImportError fix kiya gaya hai by ensuring fetch_all_stocks function stock_fetch.py mein properly defined hai.
# Yeh basically duplicate fetching avoid karta hai, but since import tha, usko correct kiya.

from stock_fetch import fetch_all_stocks  # stock_fetch.py se function import karo

# Main function jo fetching start karta hai
def main():
    print("Starting data fetch from API...")
    fetch_all_stocks()  # Yeh stock_fetch.py ka function call karega
    print("Data fetching complete!")

# Agar script direct run kiya jaye, toh main call karo
if __name__ == "__main__":
    main()