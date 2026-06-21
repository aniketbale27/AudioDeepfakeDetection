import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.app.db.mongo import close_mongo_connection, connect_to_mongo
from backend.app.inference import predict
from backend.app.routes.history_routes import router as history_router
from backend.app.routes.user_routes import router as user_router

app = FastAPI(title="Audio Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


# @app.on_event("startup")
# async def startup_event() -> None:
#     await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await close_mongo_connection()


@app.get("/")
def home():
    return {"message": "Audio Deepfake Detection API is running"}


@app.post("/predict")
async def predict_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    file_path = UPLOAD_FOLDER / f"{uuid.uuid4()}_{file.filename}"

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict(str(file_path))

        return {
            "file_name": file.filename,
            **result,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
    finally:
        if file_path.exists():
            file_path.unlink()


app.include_router(user_router)
app.include_router(history_router)


