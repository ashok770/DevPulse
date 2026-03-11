import { useDropzone } from "react-dropzone";
import axios from "axios";

function UploadZone({ setNodes, setEdges, getLayoutedElements }) {
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const graph = res.data.graph;

      const nodes = [];
      const edges = [];

      Object.keys(graph).forEach((file, index) => {
        nodes.push({
          id: file,
          data: { label: file },
          position: { x: index * 200, y: 100 },
        });

        graph[file].forEach((target) => {
          edges.push({
            id: file + "-" + target,
            source: file,
            target: target,
            animated: true,
          });
        });
      });

      const layouted = getLayoutedElements(nodes, edges);

      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch (err) {
      console.error(err);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      style={{
        position: "absolute",
        top: 80,
        left: 20,
        padding: "20px",
        border: "2px dashed #4f46e5",
        borderRadius: "10px",
        background: "#f8fafc",
        width: "220px",
        textAlign: "center",
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      <input {...getInputProps()} />

      {isDragActive ? (
        <p>Drop the ZIP file here...</p>
      ) : (
        <p>
          Drag & Drop ZIP
          <br />
          or Click to Upload
        </p>
      )}
    </div>
  );
}

export default UploadZone;
