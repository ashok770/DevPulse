import { useState, useCallback } from "react";
import axios from "axios";
import ReactFlow, { 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from "reactflow";
import "reactflow/dist/style.css";

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const scanProject = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/scan", {
        project_path: "../test_project",
      });

      const graph = res.data.graph;

      const newNodes = [];
      const newEdges = [];

      Object.keys(graph).forEach((file, index) => {
        newNodes.push({
          id: file,
          data: { label: file },
          position: { x: index * 250, y: 150 },
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

      setNodes(newNodes);
      setEdges(newEdges);
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

      <div style={{ height: "100%", width: "100%" }}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
