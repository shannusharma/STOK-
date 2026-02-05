"""
Vercel serverless entry point.
Exposes the real Markstro FastAPI app from server.py.
"""
import sys
import os

# Backend root must be on path so "server" and "auth_service" can be imported
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from server import app

# Vercel @vercel/python looks for "app" (ASGI app) – no Mangum needed
