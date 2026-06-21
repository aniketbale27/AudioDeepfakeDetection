# This will contain model loading + prediction logic
from fastapi import UploadFile

async def predict_audio(file: UploadFile):
    return {
        "status": "ok",
        "note": "Inference pipeline not implemented yet. Models will be loaded here."
    }
