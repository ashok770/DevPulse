import os
import re

IGNORE_DIRS = {"node_modules", "dist", "build", ".git", "coverage", ".next"}

import_pattern = r'import\s+.*\s+from\s+[\'"](.*)[\'"]'
require_pattern = r'require\([\'"](.*)[\'"]\)'


def scan_project(project_path):

    project_path = os.path.abspath(project_path)
    print("Scanning project path:", project_path)
    print("Directory exists:", os.path.exists(project_path))
    print("Directory contents:", os.listdir(project_path))

    files = []
    dependencies = []

    for root, dirs, filenames in os.walk(project_path):

        print("Current folder:", root)
        print("Files here:", filenames)

        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in filenames:

            if file.endswith(".js") or file.endswith(".ts"):

                file_path = os.path.join(root, file)
                print("JS file detected:", file_path)

                files.append(file)

                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                    imports = re.findall(import_pattern, content)
                    requires = re.findall(require_pattern, content)

                    print(f"Found imports in {file}:", imports)
                    print(f"Found requires in {file}:", requires)

                    for imp in imports:
                        target_file = os.path.basename(imp) + ".js"
                        dependencies.append({
                            "source": file,
                            "target": target_file
                        })

                    for req in requires:
                        target_file = os.path.basename(req) + ".js"
                        dependencies.append({
                            "source": file,
                            "target": target_file
                        })

    graph = {file: [] for file in files}
    
    for dep in dependencies:
        source = dep["source"]
        target = dep["target"]
        if source in graph:
            graph[source].append(target)
    
    return {
        "files": files,
        "dependencies": dependencies,
        "graph": graph
    }