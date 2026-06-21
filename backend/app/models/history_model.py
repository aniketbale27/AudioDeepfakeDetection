from pydantic import BaseModel, Field


class HistoryCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    file_name: str = Field(..., min_length=1)
    prediction: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    real_score: float = Field(..., ge=0.0, le=1.0)
    fake_score: float = Field(..., ge=0.0, le=1.0)
    timestamp: str | None = None


class HistoryResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    prediction: str
    confidence: float
    real_score: float
    fake_score: float
    timestamp: str

