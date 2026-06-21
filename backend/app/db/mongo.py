import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING


class MongoConnection:
    """Holds global Mongo client + database references for the app lifecycle."""

    def __init__(self) -> None:
        self.client: AsyncIOMotorClient | None = None
        self.db: AsyncIOMotorDatabase | None = None


mongo = MongoConnection()


async def connect_to_mongo() -> None:
    """Open Mongo connection and initialize indexes."""

    mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    mongo_db_name = os.getenv("MONGO_DB_NAME", "audio_spoof_detection")

    mongo.client = AsyncIOMotorClient(mongo_uri)
    mongo.db = mongo.client[mongo_db_name]

    # Unique email for user auth.
    await mongo.db.users.create_index("email", unique=True)
    # Optimized history retrieval by user and timestamp.
    await mongo.db.history.create_index(
        [("user_id", ASCENDING), ("timestamp", ASCENDING)]
    )


async def close_mongo_connection() -> None:
    """Close Mongo connection when server shuts down."""

    if mongo.client is not None:
        mongo.client.close()
        mongo.client = None
        mongo.db = None


def get_database() -> AsyncIOMotorDatabase:
    """Return active database reference."""

    if mongo.db is None:
        raise RuntimeError("Mongo database is not connected.")
    return mongo.db

