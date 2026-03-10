import os
import re

IGNORE_DIRS = {"node_modules", "dist", "build", ".git", "coverage", ".next"}

import_pattern = r'import\s+.*\s+from\s+[\'"](.*)[\'"]'
require_pattern = r'require\([\'"](.*)[\'"]\)'


def scan_project(project_path):
    files = []
    dependencies = []

    for root, dirs, filenames in os.walk(project_path):

        # Remove ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in filenames:

            if file.endswith(".js") or file.endswith(".ts"):

                file_path = os.path.join(root, file)
                files.append(file_path)

                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                    imports = re.findall(import_pattern, content)
                    requires = re.findall(require_pattern, content)

                    for imp in imports:
                        dependencies.append({
                            "source": file,
                            "target": imp
                        })

                    for req in requires:
                        dependencies.append({
                            "source": file,
                            "target": req
                        })

    return {
        "files": files,
        "dependencies": dependencies
    }