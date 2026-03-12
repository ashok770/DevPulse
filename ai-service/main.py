import zipfile
import os
import uuid
import shutil
import time
import threading
import subprocess
import tempfile
import asyncio
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from scanner import scan_project, impact_analysis 
from fastapi.middleware.cors import CORSMiddleware
from git import Repo    

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

# Store for async GitHub analysis results
github_results = {}

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

class GitHubRequest(BaseModel):
    repo_url: str

class GitHubStatusRequest(BaseModel):
    job_id: str

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

@app.post("/github")
def analyze_github(req: GitHubRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    github_results[job_id] = {"status": "processing", "progress": "Starting analysis..."}
    
    # Start background processing
    background_tasks.add_task(process_github_repo, req.repo_url, job_id)
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Analysis started. Use /github/status to check progress."
    }

@app.post("/github/status")
def get_github_status(req: GitHubStatusRequest):
    if req.job_id not in github_results:
        return {"error": "Job ID not found"}
    
    return github_results[req.job_id]

def process_github_repo(repo_url: str, job_id: str):
    temp_dir = None
    try:
        github_results[job_id]["progress"] = "Creating temporary directory..."
        temp_dir = tempfile.mkdtemp()
        
        github_results[job_id]["progress"] = "Cloning repository (this may take a while for large repos)..."
        
        # Use shallow clone with limited options for faster cloning
        result = subprocess.run(
            ["git", "clone", "--depth", "1", "--single-branch", repo_url, temp_dir],
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes for large repos
        )
        
        if result.returncode != 0:
            github_results[job_id] = {
                "status": "error",
                "error": f"Failed to clone repository: {result.stderr}"
            }
            return
        
        github_results[job_id]["progress"] = "Repository cloned successfully. Scanning files..."
        
        # Scan the cloned repository
        scan_result = scan_project(temp_dir)
        
        github_results[job_id] = {
            "status": "completed",
            "graph": scan_result["graph"],
            "files": scan_result["files"],
            "dependencies": scan_result["dependencies"]
        }
        
    except subprocess.TimeoutExpired:
        github_results[job_id] = {
            "status": "error",
            "error": "Repository cloning timed out (10 minutes limit). Repository may be too large."
        }
    except Exception as e:
        github_results[job_id] = {
            "status": "error",
            "error": f"Error analyzing repository: {str(e)}"
        }
    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


@app.post("/github")
def analyze_github(repo_url: str):

    project_id = str(uuid.uuid4())

    clone_path = f"uploads/{project_id}"

    Repo.clone_from(repo_url, clone_path)

    result = scan_project(clone_path)

    return {
        "project_id": project_id,
        "graph": result["graph"]
    }
