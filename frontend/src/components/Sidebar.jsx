import React from "react";
import { useDropzone } from "react-dropzone";

export default function Sidebar({
  impactData,
  selectedFile,
  affectedFiles,
  setSelectedFile,
  onFileUpload,
  width,
  setWidth,
}) {
  const handleMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(200, Math.min(800, moveEvent.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileUpload,
    accept: { "application/zip": [".zip"] },
  });

  return (
    <div className="sidebar" style={{ width: `${width}px` }}>
      <div className="upload-section">
        <h3>Upload Project</h3>
        <div
          {...getRootProps()}
          className={`upload-zone ${isDragActive ? "active" : ""}`}
        >
          <input {...getInputProps()} />
          <p>
            {isDragActive ? "Drop ZIP here..." : "📁 Drag & Drop ZIP or Click"}
          </p>
        </div>
      </div>

      <div className="impact-section">
        <h3>Impact Analysis</h3>
        {selectedFile ? (
          <div className="impact-data">
            <div className="selected-file">
              <strong>Selected:</strong> {selectedFile.split("/").pop()}
              <button className="close-btn" onClick={() => setSelectedFile("")}>
                ×
              </button>
            </div>
            <div className="affected-files">
              <strong>Affected Files:</strong>
              {affectedFiles?.length > 0 ? (
                <ul>
                  {affectedFiles.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              ) : (
                <p className="no-impact">No files affected</p>
              )}
            </div>
          </div>
        ) : (
          <p className="placeholder">Click a node to see impact</p>
        )}
      </div>

      {/* Resizer Handle placed at the very edge */}
      <div className="resizer" onMouseDown={handleMouseDown} />
    </div>
  );
}
