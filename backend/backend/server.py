# from emergentintegrations.llm.chat import LlmChat, UserMessage
# from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pymongo
from pymongo import MongoClient
import os
import uuid
import asyncio
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

app = FastAPI(title="Forex Trading Education Platform")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.forex_education

# Collections
users_collection = db.users
courses_collection = db.courses
progress_collection = db.progress
quizzes_collection = db.quizzes
chat_sessions_collection = db.chat_sessions
subscriptions_collection = db.subscriptions
payment_transactions_collection = db.payment_transactions

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "premium_monthly": {
        "name": "Premium Monthly",
        "price": 9.99,
        "currency": "eur",
        "interval": "month",
        "features": [
            "Full access to all courses",
            "AI analysis unlimited",
            "Real-time news alerts",
            "30% discount on EA-AKA-AI SNIPER",
            "Priority support"
        ]
    }
}

# Pydantic models
class User(BaseModel):
    user_id: Optional[str] = None
    name: str
    email: str
    level: str = "beginner"
    created_at: Optional[datetime] = None

class CourseModule(BaseModel):
    module_id: str
    title: str
    description: str
    level: str
    pair: str
    content: str
    video_content: str
    completed: bool = False

class Quiz(BaseModel):
    quiz_id: str
    module_id: str
    questions: List[Dict]
    passing_score: int = 80

class UserProgress(BaseModel):
    user_id: str
    module_id: str
    completed: bool = False
    score: Optional[int] = None
    completed_at: Optional[datetime] = None

class ChatMessage(BaseModel):
    user_id: str
    message: str
    pair: Optional[str] = None

class AIAnalysisRequest(BaseModel):
    pair: str
    analysis_type: str
    user_level: str

class SubscriptionRequest(BaseModel):
    plan_id: str
    origin_url: str

class PaymentTransaction(BaseModel):
    transaction_id: str
    user_id: Optional[str] = None
    session_id: str
    amount: float
    currency: str
    status: str = "pending"
    payment_status: str = "unpaid"
    plan_id: Optional[str] = None
    metadata: Optional[Dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# AI Service Class
class ForexAIService:
    def __init__(self):
        self.openai_chat = None
        self.gemini_chat = None
    
    async def init_ai_sessions(self, user_id: str):
        session_id = f"forex_education_{user_id}_{uuid.uuid4().hex[:8]}"
        
        # OpenAI Chat for advanced analysis
        self.openai_chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"openai_{session_id}",
            system_message="You are a professional forex trading mentor specialized in XAUUSD, GBPJPY, and EURUSD. Provide detailed technical analysis, risk management advice, and educational content."
        ).with_model("openai", "gpt-4.1")
        
        # Gemini Chat for pattern recognition and educational content
        self.gemini_chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"gemini_{session_id}",
            system_message="You are a forex education specialist focused on pattern recognition, support/resistance levels, and beginner-friendly explanations for XAUUSD, GBPJPY, EURUSD trading."
        ).with_model("gemini", "gemini-2.5-pro-preview-05-06")
        
        return session_id
    
    async def generate_educational_content(self, pair: str, level: str, topic: str):
        """Generate educational content using both AIs"""
        try:
            # OpenAI for advanced technical analysis
            openai_prompt = f"Create detailed educational content for {level} traders about {topic} in {pair}. Include technical indicators, risk management, and practical examples."
            openai_message = UserMessage(text=openai_prompt)
            openai_response = await self.openai_chat.send_message(openai_message)
            
            # Gemini for pattern recognition and beginner explanations
            gemini_prompt = f"Explain {topic} for {pair} with focus on chart patterns, support/resistance identification, and step-by-step analysis for {level} level."
            gemini_message = UserMessage(text=gemini_prompt)
            gemini_response = await self.gemini_chat.send_message(gemini_message)
            
            return {
                "technical_analysis": openai_response,
                "pattern_analysis": gemini_response,
                "combined_insights": f"Technical Analysis:\n{openai_response}\n\nPattern Recognition:\n{gemini_response}"
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_quiz(self, pair: str, level: str, topic: str):
        """Generate quiz questions"""
        try:
            quiz_prompt = f"Create 5 multiple choice questions about {topic} for {pair} trading at {level} level. Return as JSON with questions, options (A,B,C,D), and correct answers."
            quiz_message = UserMessage(text=quiz_prompt)
            response = await self.openai_chat.send_message(quiz_message)
            return response
        except Exception as e:
            return {"error": str(e)}

# Initialize AI service
ai_service = ForexAIService()

# Initialize course data
async def initialize_courses():
    """Initialize course structure"""
    forex_pairs = ["XAUUSD", "GBPJPY", "EURUSD"]
    levels = ["beginner", "intermediate", "professional"]
    
    course_modules = []
    
    for pair in forex_pairs:
        for level in levels:
            topics = {
                "beginner": [
                    "Introduction to Forex Trading",
                    "Understanding Currency Pairs",
                    "Basic Chart Reading",
                    "Support and Resistance Basics",
                    "Risk Management Fundamentals"
                ],
                "intermediate": [
                    "Technical Indicators",
                    "Trend Lines and Channels",
                    "Fibonacci Retracements",
                    "Moving Averages Strategy",
                    "Economic News Impact"
                ],
                "professional": [
                    "Advanced Pattern Recognition",
                    "Supply and Demand Zones",
                    "Multi-timeframe Analysis",
                    "Risk-Reward Optimization",
                    "Professional Trading Psychology"
                ]
            }
            
            for i, topic in enumerate(topics[level]):
                module_id = f"{pair}_{level}_{i+1}"
                
                # Generate content for each module
                user_id = "system_init"
                await ai_service.init_ai_sessions(user_id)
                content = await ai_service.generate_educational_content(pair, level, topic)
                
                module = {
                    "module_id": module_id,
                    "title": f"{topic} - {pair}",
                    "description": f"Learn {topic} specifically for {pair} trading",
                    "level": level,
                    "pair": pair,
                    "content": content.get("combined_insights", "Content being generated..."),
                    "video_content": f"Interactive analysis of {topic} with real {pair} charts and examples",
                    "order": i + 1,
                    "created_at": datetime.utcnow()
                }
                course_modules.append(module)
    
    # Insert into database if not exists
    for module in course_modules:
        existing = courses_collection.find_one({"module_id": module["module_id"]})
        if not existing:
            courses_collection.insert_one(module)

# API Endpoints

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    # Skip course initialization for now to avoid startup delays
    # await initialize_courses()
    pass

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Forex Trading Education API is running"}

@app.post("/api/users")
async def create_user(user: User):
    """Create a new user"""
    user.user_id = str(uuid.uuid4())
    user.created_at = datetime.utcnow()
    
    user_dict = user.dict()
    users_collection.insert_one(user_dict)
    
    return {"message": "User created successfully", "user_id": user.user_id}

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get user information"""
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return user

@app.get("/api/courses")
async def get_courses(level: Optional[str] = None, pair: Optional[str] = None):
    """Get all courses or filter by level/pair"""
    query = {}
    if level:
        query["level"] = level
    if pair:
        query["pair"] = pair
    
    courses = list(courses_collection.find(query).sort("order", 1))
    for course in courses:
        course["_id"] = str(course["_id"])
    
    return courses

@app.get("/api/courses/{module_id}")
async def get_course_module(module_id: str):
    """Get specific course module"""
    module = courses_collection.find_one({"module_id": module_id})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    module["_id"] = str(module["_id"])
    return module

@app.post("/api/ai/analysis")
async def get_ai_analysis(request: AIAnalysisRequest):
    """Get AI-powered forex analysis"""
    try:
        user_id = f"analysis_{uuid.uuid4().hex[:8]}"
        await ai_service.init_ai_sessions(user_id)
        
        analysis = await ai_service.generate_educational_content(
            request.pair, 
            request.user_level, 
            request.analysis_type
        )
        
        return {
            "pair": request.pair,
            "analysis_type": request.analysis_type,
            "level": request.user_level,
            "analysis": analysis,
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/ai/chat")
async def chat_with_ai(message: ChatMessage):
    """Chat with AI mentor"""
    try:
        session_id = await ai_service.init_ai_sessions(message.user_id)
        
        # Create contextualized prompt
        context = f"User question about {message.pair if message.pair else 'forex trading'}: {message.message}"
        ai_message = UserMessage(text=context)
        
        # Get response from OpenAI
        response = await ai_service.openai_chat.send_message(ai_message)
        
        # Save chat to database
        chat_record = {
            "user_id": message.user_id,
            "session_id": session_id,
            "user_message": message.message,
            "ai_response": response,
            "pair": message.pair,
            "timestamp": datetime.utcnow()
        }
        chat_sessions_collection.insert_one(chat_record)
        
        return {
            "response": response,
            "session_id": session_id,
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.post("/api/quiz/generate")
async def generate_quiz(module_id: str):
    """Generate quiz for a module"""
    try:
        module = courses_collection.find_one({"module_id": module_id})
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        user_id = f"quiz_{uuid.uuid4().hex[:8]}"
        await ai_service.init_ai_sessions(user_id)
        
        quiz_content = await ai_service.generate_quiz(
            module["pair"],
            module["level"], 
            module["title"]
        )
        
        quiz_id = str(uuid.uuid4())
        quiz_record = {
            "quiz_id": quiz_id,
            "module_id": module_id,
            "content": quiz_content,
            "created_at": datetime.utcnow()
        }
        quizzes_collection.insert_one(quiz_record)
        
        return {"quiz_id": quiz_id, "content": quiz_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@app.post("/api/progress")
async def update_progress(progress: UserProgress):
    """Update user progress"""
    progress_dict = progress.dict()
    progress_dict["updated_at"] = datetime.utcnow()
    
    # Upsert progress
    progress_collection.update_one(
        {"user_id": progress.user_id, "module_id": progress.module_id},
        {"$set": progress_dict},
        upsert=True
    )
    
    return {"message": "Progress updated successfully"}

@app.get("/api/progress/{user_id}")
async def get_user_progress(user_id: str):
    """Get user's learning progress"""
    progress = list(progress_collection.find({"user_id": user_id}))
    for p in progress:
        p["_id"] = str(p["_id"])
    
    return progress

@app.get("/api/market/news")
async def get_market_news():
    """Get simulated market news and analysis"""
    # Simulated news data - in real app would connect to financial news API
    news = [
        {
            "title": "EUR/USD Breaks Key Resistance at 1.0850",
            "content": "The EUR/USD pair has broken above the crucial 1.0850 resistance level, signaling potential bullish momentum.",
            "impact": "high",
            "pairs_affected": ["EURUSD"],
            "timestamp": datetime.utcnow() - timedelta(hours=2)
        },
        {
            "title": "Gold (XAU/USD) Consolidates Near 2000 Level", 
            "content": "Gold continues to consolidate around the psychological 2000 level, with strong support holding.",
            "impact": "medium",
            "pairs_affected": ["XAUUSD"],
            "timestamp": datetime.utcnow() - timedelta(hours=4)
        },
        {
            "title": "GBP/JPY Shows Bullish Flag Pattern",
            "content": "Technical analysis suggests GBP/JPY is forming a bullish flag pattern with potential upside target at 165.50.",
            "impact": "medium", 
            "pairs_affected": ["GBPJPY"],
            "timestamp": datetime.utcnow() - timedelta(hours=6)
        }
    ]
    
    return news

@app.get("/api/risk/calculator")
async def risk_calculator(
    account_balance: float,
    risk_percentage: float,
    pair: str,
    entry_price: float,
    stop_loss: float
):
    """Calculate position size and risk"""
    # Basic risk calculation
    risk_amount = account_balance * (risk_percentage / 100)
    
    # Calculate pip value (simplified)
    pip_values = {
        "EURUSD": 10,  # $10 per pip for standard lot
        "GBPJPY": 6.5,  # Varies with exchange rate
        "XAUUSD": 10   # $10 per pip for standard lot
    }
    
    pip_value = pip_values.get(pair, 10)
    pips_to_sl = abs(entry_price - stop_loss) * (10000 if pair != "XAUUSD" else 100)
    
    position_size = risk_amount / (pips_to_sl * pip_value / 100)
    
    return {
        "account_balance": account_balance,
        "risk_percentage": risk_percentage,
        "risk_amount": risk_amount,
        "position_size": round(position_size, 2),
        "pips_to_stop_loss": round(pips_to_sl, 1),
        "potential_loss": risk_amount
    }

@app.get("/api/market/news/live")
async def get_live_market_news():
    """Get live market news with real data integration"""
    try:
        # This would integrate with real news APIs
        # For now, we'll simulate with enhanced data
        live_news = [
            {
                "title": "Fed mantiene tipos de interés en 5.25%-5.50% tras reunión de enero",
                "content": "La Reserva Federal de Estados Unidos mantiene su rango de tipos de interés en 5.25%-5.50% en su primera reunión del año. Powell indica que los recortes no llegarán hasta ver datos más consistentes de inflación hacia el objetivo del 2%.",
                "impact": "high",
                "pairs_affected": ["EURUSD", "XAUUSD", "GBPJPY"],
                "timestamp": datetime.utcnow() - timedelta(minutes=15),
                "source": "Federal Reserve",
                "sentiment": 0.1,
                "volatility_expected": "HIGH"
            },
            {
                "title": "Oro alcanza nuevo máximo histórico por encima de $2,100 la onza",
                "content": "El precio del oro continúa su rally alcanzando un nuevo récord histórico por encima de los $2,100 por onza, impulsado por la debilidad del dólar y las expectativas de recortes de tipos por parte de la Fed en 2024.",
                "impact": "high", 
                "pairs_affected": ["XAUUSD"],
                "timestamp": datetime.utcnow() - timedelta(minutes=32),
                "source": "Market Watch",
                "sentiment": 0.7,
                "volatility_expected": "MEDIUM"
            },
            {
                "title": "Banco de Inglaterra mantiene tipos en 5.25% pero divide opiniones",
                "content": "El Banco de Inglaterra mantiene su tipo de interés principal en 5.25% por tercera reunión consecutiva. Sin embargo, la división en el comité se intensifica con 3 miembros votando por un recorte, señalando posibles cambios futuros.",
                "impact": "medium",
                "pairs_affected": ["GBPJPY", "EURUSD"],
                "timestamp": datetime.utcnow() - timedelta(hours=1, minutes=20),
                "source": "Bank of England",
                "sentiment": -0.2,
                "volatility_expected": "MEDIUM"
            },
            {
                "title": "PMI manufacturero de la Eurozona supera expectativas en enero",
                "content": "El índice PMI manufacturero de la Eurozona se sitúa en 47.9 en enero, por encima de las expectativas de 46.5, aunque permanece en territorio contractivo. Los datos sugieren una estabilización gradual de la actividad económica.",
                "impact": "medium",
                "pairs_affected": ["EURUSD"],
                "timestamp": datetime.utcnow() - timedelta(hours=2, minutes=45),
                "source": "S&P Global",
                "sentiment": 0.3,
                "volatility_expected": "LOW"
            },
            {
                "title": "Tensiones geopolíticas impulsan la demanda de activos refugio",
                "content": "Las crecientes tensiones en Oriente Medio continúan impulsando la demanda de activos refugio como el oro y el yen japonés. Los inversores buscan cobertura ante la incertidumbre geopolítica global.",
                "impact": "medium",
                "pairs_affected": ["XAUUSD", "GBPJPY"],
                "timestamp": datetime.utcnow() - timedelta(hours=3, minutes=10),
                "source": "Reuters",
                "sentiment": -0.4,
                "volatility_expected": "MEDIUM"
            }
        ]
        
        return {
            "live_news": live_news,
            "last_updated": datetime.utcnow().isoformat(),
            "news_count": len(live_news),
            "high_impact_count": len([n for n in live_news if n["impact"] == "high"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching live news: {str(e)}")

@app.get("/api/market/analysis/{pair}")
async def get_pair_analysis(pair: str):
    """Get AI-powered analysis for a specific currency pair"""
    if pair not in ["XAUUSD", "GBPJPY", "EURUSD"]:
        raise HTTPException(status_code=400, detail="Pair not supported")
    
    try:
        # Simulate AI analysis based on current market conditions
        analyses = {
            "XAUUSD": {
                "trend": "BULLISH",
                "strength": 8.5,
                "key_levels": {
                    "support": [2080, 2050, 2020],
                    "resistance": [2120, 2150, 2180]
                },
                "news_impact": "Los recientes datos de inflación y la postura dovish de la Fed continúan apoyando el oro",
                "recommendation": "COMPRA en retrocesos hacia $2080-2090 con objetivo en $2140",
                "risk_level": "MEDIO",
                "time_horizon": "1-2 semanas"
            },
            "GBPJPY": {
                "trend": "RANGING", 
                "strength": 6.2,
                "key_levels": {
                    "support": [186.50, 185.20, 183.80],
                    "resistance": [189.80, 191.50, 193.20]
                },
                "news_impact": "Divergencia entre BoE y BoJ mantiene el par en rango amplio",
                "recommendation": "TRADING de rango: VENTA en 189.50+ y COMPRA en 186.80-",
                "risk_level": "ALTO",
                "time_horizon": "3-5 días"
            },
            "EURUSD": {
                "trend": "NEUTRAL",
                "strength": 5.8, 
                "key_levels": {
                    "support": [1.0820, 1.0780, 1.0720],
                    "resistance": [1.0920, 1.0980, 1.1050]
                },
                "news_impact": "Datos económicos mixtos de ambas regiones mantienen consolidación",
                "recommendation": "ESPERAR ruptura de rango 1.0780-1.0920 para direccionalidad",
                "risk_level": "BAJO",
                "time_horizon": "1-2 semanas"
            }
        }
        
        analysis = analyses.get(pair)
        analysis["pair"] = pair
        analysis["timestamp"] = datetime.utcnow().isoformat()
        analysis["ai_confidence"] = 87.5
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating analysis: {str(e)}")

@app.get("/api/market/alerts")
async def get_market_alerts():
    """Get current market alerts and notifications"""
    alerts = [
        {
            "id": "alert_001",
            "type": "BREAKOUT",
            "pair": "XAUUSD", 
            "level": 2100.00,
            "direction": "ABOVE",
            "importance": "HIGH",
            "message": "Oro rompe resistencia clave en $2,100 - Posible continuación alcista",
            "created_at": datetime.utcnow() - timedelta(minutes=23),
            "status": "ACTIVE"
        },
        {
            "id": "alert_002", 
            "type": "NEWS_IMPACT",
            "pair": "EURUSD",
            "importance": "MEDIUM", 
            "message": "PMI Eurozona mejor de lo esperado - Posible fortaleza del EUR",
            "created_at": datetime.utcnow() - timedelta(hours=1, minutes=15),
            "status": "ACTIVE"
        },
        {
            "id": "alert_003",
            "type": "VOLATILITY",
            "pair": "GBPJPY",
            "importance": "HIGH",
            "message": "Alta volatilidad esperada por decisión BoE - Precaución en operaciones",
            "created_at": datetime.utcnow() - timedelta(hours=2),
            "status": "RESOLVED"
        }
    ]
    
    active_alerts = [alert for alert in alerts if alert["status"] == "ACTIVE"]
    
    return {
        "alerts": active_alerts,
        "total_alerts": len(active_alerts),
        "high_importance": len([a for a in active_alerts if a["importance"] == "HIGH"]),
        "last_updated": datetime.utcnow().isoformat()
    }

# Subscription and Payment Endpoints
@app.get("/api/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {"plans": SUBSCRIPTION_PLANS}

@app.post("/api/subscription/create")
async def create_subscription(request: SubscriptionRequest):
    """Create subscription checkout session"""
    try:
        # Validate plan
        if request.plan_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")
        
        plan = SUBSCRIPTION_PLANS[request.plan_id]
        
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(
            api_key=STRIPE_API_KEY,
            webhook_url=f"{request.origin_url}/api/webhook/stripe"
        )
        
        # Create checkout session
        success_url = f"{request.origin_url}?session_id={{CHECKOUT_SESSION_ID}}&payment_success=true"
        cancel_url = f"{request.origin_url}?payment_cancelled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency=plan["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "plan_id": request.plan_id,
                "plan_name": plan["name"],
                "source": "forex_academy_subscription"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Save transaction to database
        transaction = {
            "transaction_id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "amount": plan["price"],
            "currency": plan["currency"],
            "status": "pending",
            "payment_status": "unpaid",
            "plan_id": request.plan_id,
            "metadata": checkout_request.metadata,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        payment_transactions_collection.insert_one(transaction)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "plan": plan
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subscription creation failed: {str(e)}")

@app.get("/api/payment/status/{session_id}")
async def get_payment_status(session_id: str):
    """Check payment status"""
    try:
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Get status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Update database if payment completed
        transaction = payment_transactions_collection.find_one({"session_id": session_id})
        
        if transaction and transaction["payment_status"] != "paid" and status_response.payment_status == "paid":
            # Update transaction
            payment_transactions_collection.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "status": status_response.status,
                        "payment_status": status_response.payment_status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Create or update user subscription
            plan_id = transaction.get("metadata", {}).get("plan_id")
            if plan_id:
                subscription = {
                    "user_id": transaction.get("user_id", "anonymous"),
                    "plan_id": plan_id,
                    "status": "active",
                    "started_at": datetime.utcnow(),
                    "next_billing": datetime.utcnow() + timedelta(days=30),
                    "amount": transaction["amount"],
                    "currency": transaction["currency"],
                    "session_id": session_id
                }
                
                subscriptions_collection.insert_one(subscription)
        
        return {
            "session_id": session_id,
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "metadata": status_response.metadata
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("stripe-signature")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.event_type == "checkout.session.completed":
            # Update payment status
            payment_transactions_collection.update_one(
                {"session_id": webhook_response.session_id},
                {
                    "$set": {
                        "status": "completed",
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook failed: {str(e)}")

@app.get("/api/user/{user_id}/subscription")
async def get_user_subscription(user_id: str):
    """Get user's subscription status"""
    subscription = subscriptions_collection.find_one({"user_id": user_id, "status": "active"})
    
    if subscription:
        subscription["_id"] = str(subscription["_id"])
        # Check if subscription includes EA-AKA-AI SNIPER discount
        subscription["ea_sniper_discount"] = 30 if subscription.get("plan_id") == "premium_monthly" else 0
        return subscription
    else:
        return {"status": "no_active_subscription", "ea_sniper_discount": 0}

@app.get("/api/subscription/features")
async def get_subscription_features():
    """Get subscription features and benefits"""
    return {
        "free_features": [
            "Access to basic courses",
            "Limited AI analysis (5/day)",
            "Basic market news"
        ],
        "premium_features": [
            "Full access to all courses (45+ modules)",
            "Unlimited AI analysis with OpenAI + Gemini",
            "Real-time news alerts and notifications",
            "Advanced risk management tools",
            "Priority support",
            "30% discount on EA-AKA-AI SNIPER channel access",
            "Exclusive trading webinars",
            "Advanced chart patterns library"
        ],
        "ea_sniper_benefits": {
            "regular_price": "€29.99/month",
            "discounted_price": "€20.99/month",
            "savings": "€9.00/month (30% off)",
            "features": [
                "AI-powered trading signals",
                "Automated risk management",
                "Real-time market analysis",
                "24/7 algorithm monitoring",
                "Telegram notifications",
                "Backtesting results"
            ]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

