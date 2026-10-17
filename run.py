import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Hirely AI Backend Server...")
    print("📖 Swagger UI Docs: http://localhost:8000/docs")
    print("⚡ Health Check:    http://localhost:8000/health")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
