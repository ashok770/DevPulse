import { useState, useCallback } from "react";
import UploadZone from "./UploadZone";
import axios from "axios";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [affectedFiles, setAffectedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [currentProjectPath, setCurrentProjectPath] = useState("../test_project");
  const [projectId, setProjectId] = useState(null);
  const [search, setSearch] = useState("");
  const [originalNodes, setOriginalNodes] = useState([]);
  const [originalEdges, setOriginalEdges] = useState([]);
  const [highlighted, setHighlighted] = useState([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [githubStatus, setGithubStatus] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleNodeClick = useCallback(async (event, node) => {
    console.log("Node clicked:", node);
    setSelectedFile(node.id);

    try {
      const impactPath = projectId ? `uploads/${projectId}` : currentProjectPath;
      const res = await axios.post("http://127.0.0.1:8000/impact", {
        file: node.id,
        project_path: impactPath,
      });

      setAffectedFiles(res.data.affected_files);
    } catch (err) {
      console.error(err);
    }
  }, [currentProjectPath, projectId]);

  const analyzeGithub = async () => {
    if (!repoUrl.trim()) {
      alert("Please enter a GitHub repository URL");
      return;
    }

    setIsAnalyzing(true);
    setGithubStatus("Starting analysis...");

    try {
      // Start the analysis
      const res = await axios.post("http://127.0.0.1:8000/github", {
        repo_url: repoUrl
      });

      if (res.data.error) {
        alert(`Error: ${res.data.error}`);
        setIsAnalyzing(false);
        setGithubStatus("");
        return;
      }

      const jobId = res.data.job_id;
      setGithubStatus("Analysis in progress...");

      // Poll for status updates
      const pollStatus = async () => {
        try {
          const statusRes = await axios.post("http://127.0.0.1:8000/github/status", {
            job_id: jobId
          });

          const status = statusRes.data;

          if (status.status === "processing") {
            setGithubStatus(status.progress || "Processing...");
            setTimeout(pollStatus, 2000); // Poll every 2 seconds
          } else if (status.status === "completed") {
            setGithubStatus("Analysis completed!");
            
            // Process the results
            const graph = status.graph;
            const nodes = [];
            const edges = [];

            Object.keys(graph).forEach((file, index) => {
              nodes.push({
                id: file,
                data: { label: file },
                position: { x: index * 200, y: 100 }
              });

              graph[file].forEach(target => {
                edges.push({
                  id: file + "-" + target,
                  source: file,
                  target: target
                });
              });
            });

            const layouted = getLayoutedElements(nodes, edges);

            setOriginalNodes(layouted.nodes);
            setOriginalEdges(layouted.edges);
            
            setNodes(layouted.nodes);
            setEdges(layouted.edges);
            setProjectId(null);
            
            setIsAnalyzing(false);
            setGithubStatus("");
          } else if (status.status === "error") {
            alert(`Error: ${status.error}`);
            setIsAnalyzing(false);
            setGithubStatus("");
          }
        } catch (err) {
          console.error("Status polling error:", err);
          setTimeout(pollStatus, 2000); // Continue polling on error
        }
      };

      // Start polling
      setTimeout(pollStatus, 1000);

    } catch (err) {
      console.error(err);
      alert(`Failed to start analysis: ${err.response?.data?.detail || err.message}`);
      setIsAnalyzing(false);
      setGithubStatus("");
    }
  };

  const highlightDependencies = (file) => {
    const related = new Set();
    related.add(file);

    originalEdges.forEach(edge => {
      if (edge.source === file || edge.target === file) {
        related.add(edge.source);
        related.add(edge.target);
      }
    });

    const newNodes = originalNodes.map(node => ({
      ...node,
      style: {
        opacity: related.has(node.id) ? 1 : 0.2
      }
    }));

    const newEdges = originalEdges.map(edge => ({
      ...edge,
      animated: related.has(edge.source) && related.has(edge.target),
      style: {
        opacity: related.has(edge.source) && related.has(edge.target) ? 1 : 0.1
      }
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const filterGraph = (query) => {
    if (!query) {
      setNodes(originalNodes);
      setEdges(originalEdges);
      return;
    }

    const lower = query.toLowerCase();

    const matchedNodes = originalNodes.filter(node =>
      node.id.toLowerCase().includes(lower)
    );

    const matchedIds = new Set(matchedNodes.map(n => n.id));

    const connectedEdges = originalEdges.filter(edge =>
      matchedIds.has(edge.source) || matchedIds.has(edge.target)
    );

    connectedEdges.forEach(edge => {
      matchedIds.add(edge.source);
      matchedIds.add(edge.target);
    });

    const filteredNodes = originalNodes.filter(node =>
      matchedIds.has(node.id)
    );

    setNodes(filteredNodes);
    setEdges(connectedEdges);
  };

  const getLayoutedElements = (nodes, edges) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB" }); // TB = Top to Bottom

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 150, height: 50 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 75,
          y: nodeWithPosition.y - 25,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  const scanProject = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/scan", {
        project_path: currentProjectPath,
      });

      const graph = res.data.graph;

      const newNodes = [];
      const newEdges = [];

      Object.keys(graph).forEach((file) => {
        newNodes.push({
          id: file,
          data: { label: file },
          position: { x: 0, y: 0 },
        });

        graph[file].forEach((target) => {
          newEdges.push({
            id: file + "-" + target,
            source: file,
            target: target,
            animated: true,
          });
        });
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(newNodes, newEdges);

      setOriginalNodes(layoutedNodes);
      setOriginalEdges(layoutedEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setProjectId(null); // Reset for local scan
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <button
        onClick={scanProject}
        style={{
          position: "absolute",
          zIndex: 10,
          top: 20,
          left: 20,
          padding: "10px 20px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Scan Codebase
      </button>

      <input
        type="text"
        placeholder="Search file..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          filterGraph(e.target.value);
        }}
        style={{
          position: "absolute",
          top: 20,
          left: 200,
          zIndex: 10,
          padding: "8px",
          width: "200px",
          borderRadius: "6px",
          border: "1px solid #ccc"
        }}
      />

      <input
        type="text"
        placeholder="Paste GitHub repo URL"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        style={{
          position: "absolute",
          top: 60,
          left: 200,
          zIndex: 10,
          padding: "8px",
          width: "260px",
          borderRadius: "6px",
          border: "1px solid #ccc"
        }}
      />

      <button
        onClick={analyzeGithub}
        disabled={isAnalyzing}
        style={{
          position: "absolute",
          top: 60,
          left: 470,
          zIndex: 10,
          padding: "8px 14px",
          background: isAnalyzing ? "#9ca3af" : "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: isAnalyzing ? "not-allowed" : "pointer"
        }}
      >
        {isAnalyzing ? "Analyzing..." : "Analyze Repo"}
      </button>

      {githubStatus && (
        <div
          style={{
            position: "absolute",
            top: 100,
            left: 200,
            zIndex: 10,
            padding: "8px 12px",
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            fontSize: "14px",
            maxWidth: "400px"
          }}
        >
          {githubStatus}
        </div>
      )}

      {selectedFile && (
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            top: 20,
            right: 20,
            padding: "15px",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            maxWidth: "300px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
            Impact Analysis
          </h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
            <strong>Changed File:</strong> {selectedFile}
          </p>
          <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
            <strong>Affected Files:</strong>
          </p>
          {affectedFiles.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {affectedFiles.map((file, index) => (
                <li key={index} style={{ fontSize: "13px" }}>
                  {file}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: "13px", color: "#666" }}>No files affected</p>
          )}
          <button
            onClick={() => setSelectedFile("")}
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              background: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Close
          </button>
        </div>
      )}

      <div style={{ height: "100%", width: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(event, node) => {
            handleNodeClick(event, node);
            highlightDependencies(node.id);
          }}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <UploadZone
        setNodes={setNodes}
        setEdges={setEdges}
        getLayoutedElements={getLayoutedElements}
        setProjectId={setProjectId}
        setOriginalNodes={setOriginalNodes}
        setOriginalEdges={setOriginalEdges}
      />
    </div>
  );
}

export default App;
