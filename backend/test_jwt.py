#!/usr/bin/env python
"""
Quick JWT Test Script
Tests authentication and protected endpoints
Run with: python test_jwt.py
"""

import requests
import json
from typing import Optional

# Server configuration
BASE_URL = "http://127.0.0.1:8000"

class APITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user_data = None
    
    def pretty_print(self, title: str, data: dict):
        """Pretty print JSON data"""
        print(f"\n{'='*60}")
        print(f"{title}")
        print(f"{'='*60}")
        print(json.dumps(data, indent=2))
    
    def test_health(self):
        """Test health endpoint (no auth required)"""
        print("\n1️⃣  Testing Health Endpoint (Public)...")
        response = requests.get(f"{self.base_url}/health")
        self.pretty_print("Health Check Response", response.json())
        return response.status_code == 200
    
    def test_login(self, username: str = "john", password: str = "john123"):
        """Login and get JWT token"""
        print(f"\n2️⃣  Login as '{username}'...")
        
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={
                "username": username,
                "password": password
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.user_data = data["user"]
            
            print(f"✓ Login successful!")
            print(f"  Username: {self.user_data['username']}")
            print(f"  Email: {self.user_data['email']}")
            print(f"  Token: {self.token[:50]}...")
            
            return True
        else:
            print(f"✗ Login failed: {response.status_code}")
            self.pretty_print("Error", response.json())
            return False
    
    def test_get_user_info(self):
        """Get current user info (protected)"""
        if not self.token:
            print("❌ No token! Login first.")
            return False
        
        print("\n3️⃣  Getting User Info (Protected)...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/auth/me",
            headers=headers
        )
        
        if response.status_code == 200:
            self.pretty_print("User Info", response.json())
            return True
        else:
            print(f"✗ Failed: {response.status_code}")
            self.pretty_print("Error", response.json())
            return False
    
    def test_verify_token(self):
        """Verify token is valid (protected)"""
        if not self.token:
            print("❌ No token! Login first.")
            return False
        
        print("\n4️⃣  Verifying Token (Protected)...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/auth/verify",
            headers=headers
        )
        
        if response.status_code == 200:
            self.pretty_print("Token Verification", response.json())
            return True
        else:
            print(f"✗ Failed: {response.status_code}")
            return False
    
    def test_stock_quote(self, symbol: str = "AAPL"):
        """Get stock quote (protected)"""
        if not self.token:
            print("❌ No token! Login first.")
            return False
        
        print(f"\n5️⃣  Getting Stock Quote for {symbol} (Protected)...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/stock/quote/{symbol}",
            headers=headers
        )
        
        if response.status_code == 200:
            self.pretty_print(f"Stock Quote - {symbol}", response.json())
            return True
        else:
            print(f"✗ Failed: {response.status_code}")
            return False
    
    def test_invalid_token(self):
        """Test with invalid token"""
        print("\n6️⃣  Testing Invalid Token (Protected)...")
        
        headers = {"Authorization": "Bearer invalid_token_xyz"}
        response = requests.get(
            f"{self.base_url}/api/auth/verify",
            headers=headers
        )
        
        if response.status_code == 401:
            print("✓ Correctly rejected invalid token")
            self.pretty_print("Error Response", response.json())
            return True
        else:
            print(f"✗ Unexpected response: {response.status_code}")
            return False
    
    def test_register(self, username: str = "testuser", 
                      password: str = "test123",
                      email: str = "test@example.com",
                      full_name: str = "Test User"):
        """Register a new user"""
        print(f"\n7️⃣  Registering New User '{username}'...")
        
        response = requests.post(
            f"{self.base_url}/api/auth/register",
            json={
                "username": username,
                "password": password,
                "email": email,
                "full_name": full_name
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Registration successful!")
            print(f"  Username: {data['user']['username']}")
            print(f"  Email: {data['user']['email']}")
            return True
        else:
            print(f"✗ Registration failed: {response.status_code}")
            self.pretty_print("Error", response.json())
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("🧪 MARKSTRO API - JWT AUTHENTICATION TESTS")
        print("="*60)
        
        results = {}
        
        # Test 1: Health check
        results["Health Check"] = self.test_health()
        
        # Test 2: Login
        results["Login"] = self.test_login()
        
        # Test 3: Get user info
        results["Get User Info"] = self.test_get_user_info()
        
        # Test 4: Verify token
        results["Verify Token"] = self.test_verify_token()
        
        # Test 5: Stock quote
        results["Stock Quote"] = self.test_stock_quote()
        
        # Test 6: Invalid token
        results["Invalid Token"] = self.test_invalid_token()
        
        # Test 7: Register (commented to avoid duplicates)
        # results["Register"] = self.test_register("newuser" + str(int(time.time())))
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        for test_name, passed in results.items():
            status = "✓ PASSED" if passed else "✗ FAILED"
            print(f"{test_name:.<40} {status}")
        
        passed_count = sum(1 for v in results.values() if v)
        total_count = len(results)
        
        print("\n" + "="*60)
        print(f"Result: {passed_count}/{total_count} tests passed")
        print("="*60 + "\n")
        
        return all(results.values())


if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    
    if success:
        print("✅ All tests passed! Your API is working correctly.\n")
        print("📝 Next Steps:")
        print("   1. Read JWT_AUTH_GUIDE.md for detailed documentation")
        print("   2. Try the cURL examples in the guide")
        print("   3. Integrate authentication into your frontend")
        print("   4. Connect real stock data API")
        print("   5. Implement news API integration\n")
    else:
        print("⚠️  Some tests failed. Check the output above.\n")
        print("💡 Common issues:")
        print("   - Server not running: python server.py")
        print("   - Wrong port: Make sure server is on 8000")
        print("   - Invalid credentials: Use admin/admin123\n")