"""Vercel serverless entry point.

Vercel's Python runtime looks for an ASGI/WSGI object named `app` in the file it
invokes. It does NOT run uvicorn — it wraps this `app` itself. So all we do here
is put the project root on the import path and re-export the FastAPI app.

The `vercel.json` rewrite sends every incoming path to this function, so FastAPI
(not Vercel's static handler) does all the routing, including serving the web UI.
"""
import os
import sys

# api/index.py lives in <root>/api/, so the project root is one level up. Adding it
# to sys.path lets `import app...` resolve when Vercel runs this file.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app  # noqa: E402  (import must follow the sys.path tweak)

# `app` is what Vercel serves. Re-export it explicitly for clarity.
__all__ = ["app"]
