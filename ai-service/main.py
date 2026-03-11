import zipfile
import os
import uuid
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

    upload_id = str(uuid.uuid4())
    extract_path = f"uploads/{upload_id}"

    os.makedirs(extract_path, exist_ok=True)

    zip_path = f"{extract_path}/project.zip"

    with open(zip_path, "wb") as buffer:
        buffer.write(await file.read())

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)

    result = scan_project(extract_path)

    return {
        "project_id": upload_id,
        "graph": result["graph"],
        "files": result["files"]
    }    
