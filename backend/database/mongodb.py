from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    
    # Create indexes
    await db.agents.create_index("created_by")
    await db.opinions.create_index("user_id")
    await db.opinions.create_index("meeting_id")
    await db.meetings.create_index("user_id")
    await db.company_files.create_index("user_id")
    await db.settings.create_index("key", unique=True)
    
    print("Connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")


def get_database():
    return db

