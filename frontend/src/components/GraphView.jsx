import React from "react";
import ReactFlow, { Controls, Background } from "reactflow";
import "reactflow/dist/style.css";

export default function GraphView({
  nodes,
  edges,
  onNodeClick,
  onNodesChange,
  onEdgesChange,
  onConnect,
}) {
  return (
    <div className="graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        // This ensures it uses the full height/width of the .graph div
        style={{ width: "100%", height: "100%" }}
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
