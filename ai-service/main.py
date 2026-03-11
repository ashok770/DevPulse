import zipfile
import os
import uuid
import shutil
import time
import threading
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from scanner import scan_project, impact_analysis 
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_old_uploads():
    """Clean up upload folders older than 1 hour"""
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        return
    
    current_time = time.time()
    one_hour = 3600  # 1 hour in seconds
    
    for folder_name in os.listdir(uploads_dir):
        folder_path = os.path.join(uploads_dir, folder_name)
        if os.path.isdir(folder_path):
            folder_age = current_time - os.path.getctime(folder_path)
            if folder_age > one_hour:
                try:
                    shutil.rmtree(folder_path)
                    print(f"Cleaned up old upload: {folder_name}")
                except Exception as e:
                    print(f"Error cleaning up {folder_name}: {e}")

def schedule_cleanup(upload_path):
    """Schedule cleanup of upload folder after 1 hour"""
    def delayed_cleanup():
        time.sleep(3600)  # Wait 1 hour
        if os.path.exists(upload_path):
            try:
                shutil.rmtree(upload_path)
                print(f"Auto-cleaned upload: {upload_path}")
            except Exception as e:
                print(f"Error auto-cleaning {upload_path}: {e}")
    
    # Run cleanup in background thread
    cleanup_thread = threading.Thread(target=delayed_cleanup, daemon=True)
    cleanup_thread.start()

class ScanRequest(BaseModel):
    project_path: str

class ImpactRequest(BaseModel):
    file: str
    project_path: str

@app.post("/scan")
def scan(req: ScanRequest):
    result = scan_project(req.project_path)
    return result

@app.post("/impact")
def impact(req: ImpactRequest):

    result = scan_project(req.project_path)
    graph = result["graph"]

    affected = impact_analysis(graph, req.file)

    return {
        "changed_file": req.file,
        "affected_files": affected
    }
@app.post("/upload")
async def upload_zip(file: UploadFile = File(...)):
    # Clean up old uploads first
    cleanup_old_uploads()
    
    upload_id = str(uuid.uuid4())
    extract_path = f"uploads/{upload_id}"

    os.makedirs(extract_path, exist_ok=True)

    zip_path = f"{extract_path}/project.zip"

    with open(zip_path, "wb") as buffer:
        buffer.write(await file.read())

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)

    result = scan_project(extract_path)
    
    # Schedule cleanup after 1 hour
    schedule_cleanup(extract_path)

    return {
        "project_id": upload_id,
        "graph": result["graph"],
        "files": result["files"]
    }    
