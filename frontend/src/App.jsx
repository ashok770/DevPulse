import { useState, useCallback } from "react";
import axios from "axios";
import ReactFlow, { 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import GraphView from "./components/GraphView";
import UploadZone from "./UploadZone";
import "./App.css";

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
  const [impactData, setImpactData] = useState(null);

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
      setImpactData(res.data);
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
            const newNodes = [];
            const newEdges = [];

            Object.keys(graph).forEach((file) => {
              newNodes.push({
                id: file,
                data: { label: file },
                position: { x: 0, y: 0 }
              });

              graph[file].forEach(target => {
                newEdges.push({
                  id: file + "-" + target,
                  source: file,
                  target: target,
                  animated: true
                });
              });
            });

            const layouted = getLayoutedElements(newNodes, newEdges);

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

  const onNodeClick = (event, node) => {
    handleNodeClick(event, node);
    highlightDependencies(node.id);
  };

  const onFileUpload = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const graph = res.data.graph;
      const projectId = res.data.project_id;

      // Set the project ID for impact analysis
      setProjectId(projectId);

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

      const layouted = getLayoutedElements(newNodes, newEdges);

      setOriginalNodes(layouted.nodes);
      setOriginalEdges(layouted.edges);
      
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch (err) {
      console.error(err);
      alert("Failed to upload and analyze file");
    }
  };

  return (
    <div className="app">
      <Header
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        analyzeGithub={analyzeGithub}
        search={search}
        setSearch={setSearch}
        filterGraph={filterGraph}
        scanProject={scanProject}
        isAnalyzing={isAnalyzing}
        githubStatus={githubStatus}
      />

      <div className="main">
        <Sidebar 
          impactData={impactData}
          selectedFile={selectedFile}
          affectedFiles={affectedFiles}
          setSelectedFile={setSelectedFile}
          onFileUpload={onFileUpload}
        />

        <GraphView
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        />
      </div>
    </div>
  );
}

export default App;
