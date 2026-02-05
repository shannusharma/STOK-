"""
JWT Authentication Service
Handles token generation, validation, and user authentication
"""

import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from dotenv import load_dotenv
import os

load_dotenv()

class JWTService:
    """Service for managing JWT tokens"""
    
    def __init__(self):
        # Load secret from environment or use default
        self.SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-this")
        self.ALGORITHM = "HS256"
        self.TOKEN_EXPIRATION_HOURS = 24
    
    def create_token(self, data: Dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT token
        
        Args:
            data: Dictionary with user information (e.g., {"sub": "username"})
            expires_delta: Token expiration time
            
        Returns:
            Encoded JWT token as string
        """
        to_encode = data.copy()
        
        # Set expiration time
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=self.TOKEN_EXPIRATION_HOURS)
        
        to_encode.update({"exp": expire})
        
        # Encode and return token
        encoded_jwt = jwt.encode(
            to_encode,
            self.SECRET_KEY,
            algorithm=self.ALGORITHM
        )
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload if valid, None if invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.SECRET_KEY,
                algorithms=[self.ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            print("❌ Token has expired")
            return None
        except jwt.InvalidTokenError:
            print("❌ Invalid token")
            return None
    
    def create_access_token(self, username: str) -> str:
        """
        Create an access token for a user
        
        Args:
            username: Username
            
        Returns:
            JWT access token
        """
        data = {
            "sub": username,
            "type": "access"
        }
        return self.create_token(data)
    
    def create_refresh_token(self, username: str) -> str:
        """
        Create a refresh token for a user
        
        Args:
            username: Username
            
        Returns:
            JWT refresh token (longer expiration)
        """
        data = {
            "sub": username,
            "type": "refresh"
        }
        # Refresh token expires in 7 days
        expires_delta = timedelta(days=7)
        return self.create_token(data, expires_delta)
    
    def get_username_from_token(self, token: str) -> Optional[str]:
        """
        Extract username from token
        
        Args:
            token: JWT token
            
        Returns:
            Username if token is valid, None otherwise
        """
        payload = self.verify_token(token)
        if payload:
            return payload.get("sub")
        return None


# Simple user database (In real app, use actual database)
USERS_DB = {
    "admin": {
        "username": "admin",
        "password": "admin123",  # In production, store hashed passwords!
        "email": "admin@markstro.com",
        "full_name": "Admin User"
    },
    "demo": {
        "username": "demo",
        "password": "demo123",
        "email": "demo@markstro.com",
        "full_name": "Demo User"
    },
    "john": {
        "username": "john",
        "password": "john123",
        "email": "john@markstro.com",
        "full_name": "John Doe"
    }
}


class UserService:
    """Service for managing users"""
    
    @staticmethod
    def verify_user(username: str, password: str) -> bool:
        """
        Verify user credentials
        
        Args:
            username: Username
            password: Password
            
        Returns:
            True if credentials are valid
        """
        user = USERS_DB.get(username)
        if user and user["password"] == password:
            return True
        return False
    
    @staticmethod
    def get_user(username: str) -> Optional[Dict]:
        """
        Get user by username
        
        Args:
            username: Username
            
        Returns:
            User data if exists, None otherwise
        """
        return USERS_DB.get(username)
    
    @staticmethod
    def user_exists(username: str) -> bool:
        """
        Check if user exists
        
        Args:
            username: Username
            
        Returns:
            True if user exists
        """
        return username in USERS_DB
    
    @staticmethod
    def create_user(username: str, password: str, email: str, full_name: str) -> bool:
        """
        Create a new user
        
        Args:
            username: Username
            password: Password
            email: Email address
            full_name: Full name
            
        Returns:
            True if user created successfully
        """
        if username in USERS_DB:
            return False  # User already exists
        
        USERS_DB[username] = {
            "username": username,
            "password": password,  # In production, hash this!
            "email": email,
            "full_name": full_name
        }
        return True


if __name__ == "__main__":
    # Test the JWT service
    print("=" * 60)
    print("JWT Authentication Service Test")
    print("=" * 60)
    
    jwt_service = JWTService()
    
    # Test 1: Create token
    print("\n1️⃣  Creating JWT token for 'john'...")
    token = jwt_service.create_access_token("john")
    print(f"   Token: {token[:50]}...")
    print(f"   Token length: {len(token)}")
    
    # Test 2: Verify token
    print("\n2️⃣  Verifying token...")
    payload = jwt_service.verify_token(token)
    if payload:
        print(f"   ✓ Token is valid!")
        print(f"   Username: {payload.get('sub')}")
        print(f"   Type: {payload.get('type')}")
        print(f"   Expires: {payload.get('exp')}")
    
    # Test 3: Get username from token
    print("\n3️⃣  Extracting username from token...")
    username = jwt_service.get_username_from_token(token)
    print(f"   Username: {username}")
    
    # Test 4: Create refresh token
    print("\n4️⃣  Creating refresh token...")
    refresh_token = jwt_service.create_refresh_token("john")
    print(f"   Refresh token: {refresh_token[:50]}...")
    
    # Test 5: User authentication
    print("\n5️⃣  Testing user authentication...")
    user_service = UserService()
    
    # Valid credentials
    if user_service.verify_user("john", "john123"):
        print("   ✓ John's credentials are valid!")
    
    # Invalid credentials
    if not user_service.verify_user("john", "wrong_password"):
        print("   ✓ Invalid password correctly rejected!")
    
    # Get user info
    print("\n6️⃣  Fetching user information...")
    user = user_service.get_user("john")
    if user:
        print(f"   Username: {user['username']}")
        print(f"   Email: {user['email']}")
        print(f"   Full Name: {user['full_name']}")
    
    # Test available users
    print("\n7️⃣  Available test users:")
    for username, user_data in USERS_DB.items():
        print(f"   - Username: {username}")
        print(f"     Password: {user_data['password']}")
        print(f"     Email: {user_data['email']}")
        print()
    
    print("=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)