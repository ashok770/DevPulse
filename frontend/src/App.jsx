import { useState, useMemo } from "react";
import axios from "axios";
import ReactFlow from "reactflow";
import "reactflow/dist/style.css";

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const nodeTypes = useMemo(() => ({}), []);
  const edgeTypes = useMemo(() => ({}), []);

  const scanProject = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/scan", {
        project_path: "../test_project",
      });

      const graph = res.data.graph;

      const newNodes = [];
      const newEdges = [];

      let y = 0;

      Object.keys(graph).forEach((file, index) => {
        newNodes.push({
          id: file,
          data: { label: file },
          position: { x: index * 200, y },
        });

        graph[file].forEach((target) => {
          newEdges.push({
            id: file + "-" + target,
            source: file,
            target: target,
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
        }}
      >
        Scan Codebase
      </button>

      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView 
      />
    </div>
  );
}

export default App;
