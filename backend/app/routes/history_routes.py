from fastapi import APIRouter

from backend.app.controllers.history_controller import (
    clear_history_for_user,
    create_history_entry,
    delete_history_entry,
    get_history_for_user,
)
from backend.app.models.history_model import HistoryCreateRequest, HistoryResponse

router = APIRouter(prefix="/api/history", tags=["history"])


@router.post("", response_model=HistoryResponse)
async def create_history(payload: HistoryCreateRequest):
    return await create_history_entry(payload)


@router.get("/user/{user_id}", response_model=list[HistoryResponse])
async def get_history(user_id: str):
    return await get_history_for_user(user_id)


@router.delete("/{entry_id}")
async def delete_entry(entry_id: str):
    return await delete_history_entry(entry_id)


@router.delete("/user/{user_id}")
async def clear_user_history(user_id: str):
    return await clear_history_for_user(user_id)

