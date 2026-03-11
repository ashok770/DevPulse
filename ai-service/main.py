from fastapi import FastAPI
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
