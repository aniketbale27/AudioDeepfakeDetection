from fastapi import APIRouter, UploadFile, File
from backend.app.services.inference import predict_audio

router = APIRouter()

@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    result = await predict_audio(file)
    return result