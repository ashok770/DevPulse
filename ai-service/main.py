from fastapi import FastAPI
from pydantic import BaseModel
from scanner import scan_project

app = FastAPI()

class ScanRequest(BaseModel):
    project_path: str


@app.post("/scan")
def scan(req: ScanRequest):
    result = scan_project(req.project_path)
    return result