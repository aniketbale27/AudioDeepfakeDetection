import hashlib
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from backend.app.db.mongo import get_database
from backend.app.models.user_model import (
    UserCreateRequest,
    UserLoginRequest,
    UserUpdateRequest,
)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _serialize_user(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "name": document["name"],
        "email": document["email"],
        "joined_at": document["created_at"].isoformat(),
    }


def _to_object_id(id_value: str) -> ObjectId:
    try:
        return ObjectId(id_value)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user id format.",
        ) from exc


async def register_user(payload: UserCreateRequest) -> dict:
    db = get_database()
    users = db.users

    normalized_email = _normalize_email(payload.email)
    existing = await users.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    document = {
        "name": payload.name.strip(),
        "email": normalized_email,
        "password_hash": _hash_password(payload.password),
        "created_at": now,
        "updated_at": now,
    }

    result = await users.insert_one(document)
    created_user = await users.find_one({"_id": result.inserted_id})
    return _serialize_user(created_user)


async def login_user(payload: UserLoginRequest) -> dict:
    db = get_database()
    users = db.users

    normalized_email = _normalize_email(payload.email)
    user = await users.find_one(
        {
            "email": normalized_email,
            "password_hash": _hash_password(payload.password),
        }
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return _serialize_user(user)


async def get_user_by_id(user_id: str) -> dict:
    db = get_database()
    users = db.users

    oid = _to_object_id(user_id)
    user = await users.find_one({"_id": oid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return _serialize_user(user)


async def update_user(user_id: str, payload: UserUpdateRequest) -> dict:
    db = get_database()
    users = db.users

    oid = _to_object_id(user_id)
    user = await users.find_one({"_id": oid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    update_doc = {}

    if payload.name is not None:
        update_doc["name"] = payload.name.strip()

    if payload.email is not None:
        normalized_email = _normalize_email(payload.email)
        existing = await users.find_one({"email": normalized_email, "_id": {"$ne": oid}})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another user already uses this email.",
            )
        update_doc["email"] = normalized_email

    if payload.password is not None:
        update_doc["password_hash"] = _hash_password(payload.password)

    if not update_doc:
        return _serialize_user(user)

    update_doc["updated_at"] = datetime.now(timezone.utc)

    await users.update_one({"_id": oid}, {"$set": update_doc})
    updated_user = await users.find_one({"_id": oid})
    return _serialize_user(updated_user)

