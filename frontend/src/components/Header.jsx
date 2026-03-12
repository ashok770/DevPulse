import React from "react";

export default function Header({
  repoUrl,
  setRepoUrl,
  analyzeGithub,
  search,
  setSearch,
  filterGraph,
  scanProject,
  isAnalyzing,
  githubStatus
}) {
  return (
    <div className="header">
      <div className="logo">DevPulse</div>

      <div className="controls">
        <button onClick={scanProject} className="scan-btn">
          Scan Local Project
        </button>
        
        <input
          placeholder="Search files..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            filterGraph(e.target.value);
          }}
        />

        <input
          placeholder="GitHub repo URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={isAnalyzing}
        />

        <button
          onClick={analyzeGithub}
          disabled={isAnalyzing}
          className={`analyze-btn ${isAnalyzing ? "analyzing" : ""}`}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Repo"}
        </button>
      </div>
      
      {githubStatus && (
        <div className="status-bar">
          {githubStatus}
        </div>
      )}
    </div>
  );
}
