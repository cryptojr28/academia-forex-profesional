from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Forex Trading Education Platform")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Academia Forex Profesional API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Forex Trading Education API is running"}

@app.get("/api/market/news")
async def get_market_news():
    """Get simulated market news"""
    news = [
        {
            "title": "EUR/USD Breaks Key Resistance",
            "content": "EUR/USD has broken above crucial resistance level",
            "impact": "high",
            "pairs_affected": ["EURUSD"],
            "timestamp": "2025-01-07T12:00:00Z"
        },
        {
            "title": "Gold Consolidates Near 2000",
            "content": "Gold continues consolidating around 2000 level",
            "impact": "medium", 
            "pairs_affected": ["XAUUSD"],
            "timestamp": "2025-01-07T10:00:00Z"
        }
    ]
    return news

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
