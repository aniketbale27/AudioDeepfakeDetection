from fastapi import APIRouter

from backend.app.controllers.user_controller import (
    get_user_by_id,
    login_user,
    register_user,
    update_user,
)
from backend.app.models.user_model import (
    UserCreateRequest,
    UserLoginRequest,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/register", response_model=UserResponse)
async def register(payload: UserCreateRequest):
    return await register_user(payload)


@router.post("/login", response_model=UserResponse)
async def login(payload: UserLoginRequest):
    return await login_user(payload)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    return await get_user_by_id(user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update(user_id: str, payload: UserUpdateRequest):
    return await update_user(user_id, payload)

