from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from backend.app.db.mongo import get_database
from backend.app.models.history_model import HistoryCreateRequest


def _to_object_id(id_value: str, entity_name: str) -> ObjectId:
    try:
        return ObjectId(id_value)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} id format.",
        ) from exc


def _serialize_history(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "user_id": str(document["user_id"]),
        "file_name": document["file_name"],
        "prediction": document["prediction"],
        "confidence": float(document["confidence"]),
        "real_score": float(document["real_score"]),
        "fake_score": float(document["fake_score"]),
        "timestamp": document["timestamp"].isoformat(),
    }


async def create_history_entry(payload: HistoryCreateRequest) -> dict:
    db = get_database()
    users = db.users
    history = db.history

    user_oid = _to_object_id(payload.user_id, "user")
    user = await users.find_one({"_id": user_oid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for history entry.",
        )

    timestamp = (
        datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        if payload.timestamp
        else datetime.now(timezone.utc)
    )

    document = {
        "user_id": user_oid,
        "file_name": payload.file_name,
        "prediction": payload.prediction,
        "confidence": payload.confidence,
        "real_score": payload.real_score,
        "fake_score": payload.fake_score,
        "timestamp": timestamp,
        "created_at": datetime.now(timezone.utc),
    }

    result = await history.insert_one(document)
    created = await history.find_one({"_id": result.inserted_id})
    return _serialize_history(created)


async def get_history_for_user(user_id: str) -> list[dict]:
    db = get_database()
    history = db.history

    user_oid = _to_object_id(user_id, "user")

    cursor = history.find({"user_id": user_oid}).sort("timestamp", -1)
    documents = await cursor.to_list(length=2000)
    return [_serialize_history(doc) for doc in documents]


async def delete_history_entry(entry_id: str) -> dict:
    db = get_database()
    history = db.history

    entry_oid = _to_object_id(entry_id, "history entry")
    result = await history.delete_one({"_id": entry_oid})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found.",
        )

    return {"deleted": True, "entry_id": entry_id}


async def clear_history_for_user(user_id: str) -> dict:
    db = get_database()
    history = db.history

    user_oid = _to_object_id(user_id, "user")
    result = await history.delete_many({"user_id": user_oid})

    return {"deleted": int(result.deleted_count), "user_id": user_id}

