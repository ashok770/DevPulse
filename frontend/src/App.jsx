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
          onNodeClick={handleNodeClick}
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
      />
    </div>
  );
}

export default App;
