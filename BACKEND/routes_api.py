import os, traceback
from flask import Flask, request, jsonify
from flask_cors import CORS  # New: For CORS
from sqlalchemy import create_engine, text, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
import bcrypt
import pandas as pd
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://shannusharma@localhost:5432/stock_app_db")
print("DEBUG: DATABASE_URL =", DATABASE_URL)

try:
    engine = create_engine(DATABASE_URL, echo=True, future=True)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("DEBUG: DB connect OK")
except Exception:
    print("DEBUG: DB connect FAILED")
    traceback.print_exc()
    raise SystemExit(1)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # New: Allow frontend origin

Base = declarative_base()  # Moved up: Define Base before using it in classes

Session = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = 'users'
    user_id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    number = Column(String)  # New: Optional field
    country = Column(String)  # New: Optional field
    district = Column(String)  # New: Optional field

class SearchHistory(Base):
    __tablename__ = 'search_history'
    query_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    stock_ticker = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

@app.route("/health", methods=['GET'])
def health():
    return jsonify({"status": "ok"})

# New: Signup endpoint
@app.route("/signup", methods=['POST'])
def signup():
    data = request.get_json()
    session = Session()
    try:
        hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        new_user = User(
            username=data['name'],
            email=data['email'],
            password_hash=hashed.decode('utf-8'),
            number=data.get('number'),  # New: Save optional fields
            country=data.get('country'),
            district=data.get('district')
        )
        session.add(new_user)
        session.commit()
        return jsonify({"message": "Signup successful"})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        session.close()

# New: Login endpoint
@app.route("/login", methods=['POST'])
def login():
    data = request.get_json()
    session = Session()
    try:
        user = session.query(User).filter_by(email=data['email']).first()
        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
            return jsonify({"message": "Login successful"})
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        session.close()

# New: Prediction endpoint (dummy logic, replace with real prediction)
@app.route("/predict", methods=['POST'])
def predict():
    data = request.get_json()
    stock_ticker = data.get('stock_ticker')
    if stock_ticker.upper() == "AAPL":
        prediction = "Bullish"
    elif stock_ticker.upper() == "TSLA":
        prediction = "Bearish"
    else:
        prediction = "Neutral"
    return jsonify({"prediction": prediction})

# New: Search endpoint (save to search_history)
@app.route("/search", methods=['POST'])
def search():
    data = request.get_json()
    stock_ticker = data.get('stock_ticker')
    session = Session()
    try:
        new_search = SearchHistory(stock_ticker=stock_ticker, user_id=1)  # Example user_id
        session.add(new_search)
        session.commit()
        return jsonify({"message": "Search saved", "stock_ticker": stock_ticker})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# New: Dummy /portfolio endpoint (replace with DB query later, e.g., session.query for user_id)
@app.route("/portfolio", methods=['GET'])
def portfolio():
    # Dummy data; in real, filter by user_id
    items = [
        {"stock": "AAPL", "shares": 10, "value": 1500},
        {"stock": "TSLA", "shares": 5, "value": 3000}
    ]
    return jsonify({"items": items})

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)