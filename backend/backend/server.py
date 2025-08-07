from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Forex Trading Education Platform")

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
    news = [
        {
            "title": "EUR/USD Rompe Resistencia Clave",
            "content": "El EUR/USD ha roto la resistencia en 1.0850",
            "impact": "high",
            "pairs_affected": ["EURUSD"],
            "timestamp": "2025-01-07T12:00:00Z"
        }
    ]
    return news

@app.get("/api/courses")
async def get_courses():
    return [{"title": "Curso Básico EURUSD", "level": "beginner"}]
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Forex Trading Education API is running"}
