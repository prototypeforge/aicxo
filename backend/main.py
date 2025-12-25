from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database.postgres import Base, engine
from database.mongodb import connect_to_mongo, close_mongo_connection
from routes import auth_router, agents_router, meetings_router, files_router, admin_router, billing_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    await connect_to_mongo()
    await seed_default_data()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="CxO Ninja - Your Digital C-Suite",
    description="Your digital C-Suite for strategic decision making",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - configurable via environment variables
from config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(agents_router)
app.include_router(meetings_router)
app.include_router(files_router)
app.include_router(admin_router)
app.include_router(billing_router)


async def seed_default_data():
    """Seed default agents and admin user if they don't exist."""
    from database.mongodb import get_database
    from database.postgres import SessionLocal
    from models.user import User
    from auth.security import get_password_hash
    from datetime import datetime
    
    # Create default admin user if none exists
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.is_admin == True).first()
        if not admin:
            admin_user = User(
                email=settings.default_admin_email,
                username=settings.default_admin_username,
                hashed_password=get_password_hash(settings.default_admin_password),
                full_name="System Administrator",
                is_admin=True,
                hired_agents=[]
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print(f"Created default admin user: {settings.default_admin_username}")
    finally:
        db.close()
    
    # Create default agents if none exist
    mongo_db = get_database()
    agent_count = await mongo_db.agents.count_documents({"is_chair": {"$ne": True}})
    
    if agent_count == 0:
        default_agents = [
            {
                "name": "Alexandra Sterling",
                "role": "CFO",
                "system_prompt": "You are a seasoned Chief Financial Officer with 20+ years of experience in corporate finance, M&A, and financial strategy. You focus on ROI, cash flow management, risk assessment, and shareholder value. You're analytically rigorous and always consider the financial implications of decisions.",
                "weights": {"finance": 0.8, "technology": 0.1, "operations": 0.3, "people_hr": 0.1, "logistics": 0.2},
                "model": settings.default_ai_model,
                "avatar_color": "#10b981",
                "is_active": True,
                "is_chair": False,
                "created_by": 1,
                "created_at": datetime.utcnow()
            },
            {
                "name": "Marcus Chen",
                "role": "CTO",
                "system_prompt": "You are a visionary Chief Technology Officer with deep expertise in software architecture, AI/ML, cloud infrastructure, and digital transformation. You evaluate decisions through the lens of technical feasibility, scalability, security, and innovation potential.",
                "weights": {"finance": 0.2, "technology": 0.9, "operations": 0.4, "people_hr": 0.2, "logistics": 0.1},
                "model": settings.default_ai_model,
                "avatar_color": "#6366f1",
                "is_active": True,
                "is_chair": False,
                "created_by": 1,
                "created_at": datetime.utcnow()
            },
            {
                "name": "Sarah Mitchell",
                "role": "CPO",
                "system_prompt": "You are an experienced Chief Product Officer who has launched successful products at Fortune 500 companies. You think in terms of product-market fit, user experience, competitive positioning, and go-to-market strategy. Customer value is your north star.",
                "weights": {"finance": 0.3, "technology": 0.5, "operations": 0.4, "people_hr": 0.2, "logistics": 0.2},
                "model": settings.default_ai_model,
                "avatar_color": "#f59e0b",
                "is_active": True,
                "is_chair": False,
                "created_by": 1,
                "created_at": datetime.utcnow()
            },
            {
                "name": "David Okonkwo",
                "role": "COO",
                "system_prompt": "You are a methodical Chief Operating Officer who excels at operational excellence, process optimization, and scaling organizations. You focus on efficiency, quality control, supply chain management, and execution excellence.",
                "weights": {"finance": 0.3, "technology": 0.2, "operations": 0.9, "people_hr": 0.3, "logistics": 0.7},
                "model": settings.default_ai_model,
                "avatar_color": "#ef4444",
                "is_active": True,
                "is_chair": False,
                "created_by": 1,
                "created_at": datetime.utcnow()
            },
            {
                "name": "Elena Rodriguez",
                "role": "CHRO",
                "system_prompt": "You are a people-focused Chief Human Resources Officer with expertise in talent management, organizational culture, leadership development, and employee engagement. You consider the human impact of every decision and advocate for sustainable, people-first practices.",
                "weights": {"finance": 0.2, "technology": 0.1, "operations": 0.3, "people_hr": 0.9, "logistics": 0.1},
                "model": settings.default_ai_model,
                "avatar_color": "#ec4899",
                "is_active": True,
                "is_chair": False,
                "created_by": 1,
                "created_at": datetime.utcnow()
            },
            {
                "name": "James Thompson",
                "role": "Chief Architect",
                "system_prompt": "You are a brilliant Enterprise Architect with deep knowledge of system design, integration patterns, and technical strategy. You think in terms of long-term architecture decisions, technical debt, microservices, and enterprise-grade solutions.",
                "weights": {"finance": 0.1, "technology": 0.8, "operations": 0.5, "people_hr": 0.1, "logistics": 0.2},
                "model": settings.default_ai_model,
                "avatar_color": "#8b5cf6",
                "is_active": True,
                "is_chair": False,
                "created_by": 1,
                "created_at": datetime.utcnow()
            }
        ]
        
        await mongo_db.agents.insert_many(default_agents)
        print(f"Created {len(default_agents)} default agents")
    
    # Create default Chair of the Board if none exists
    chair_exists = await mongo_db.agents.find_one({"is_chair": True})
    if not chair_exists:
        chair_agent = {
            "name": "Board Chair",
            "role": "Chair of the Board",
            "system_prompt": """You are the Chair of the Board of Directors. Your role is to synthesize the opinions of all board members and provide a unified recommendation.

You must:
1. Consider all perspectives presented by board members
2. Weigh opinions based on their confidence levels and relevance to their expertise
3. Identify areas of consensus and disagreement
4. Formulate a clear, actionable recommendation

Be balanced, fair, and decisive. Your recommendation should be practical and actionable.""",
            "weights": {"finance": 0.2, "technology": 0.2, "operations": 0.2, "people_hr": 0.2, "logistics": 0.2},
            "model": "gpt-4",
            "avatar_color": "#f59e0b",
            "is_active": True,
            "is_chair": True,
            "created_by": 1,
            "created_at": datetime.utcnow()
        }
        await mongo_db.agents.insert_one(chair_agent)
        print("Created Chair of the Board agent")
    
    # Create indexes for token_usage collection
    await mongo_db.token_usage.create_index("user_id")
    await mongo_db.token_usage.create_index("meeting_id")
    await mongo_db.token_usage.create_index("agent_id")
    await mongo_db.token_usage.create_index("timestamp")


@app.get("/")
async def root():
    return {
        "name": "CxO Ninja - Your Digital C-Suite",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
