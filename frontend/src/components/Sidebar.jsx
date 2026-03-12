import React from "react";
import { useDropzone } from "react-dropzone";

export default function Sidebar({ 
  impactData, 
  selectedFile, 
  affectedFiles, 
  setSelectedFile,
  onFileUpload 
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: onFileUpload,
    accept: {
      'application/zip': ['.zip']
    }
  });

  return (
    <div className="sidebar">
      {/* Upload Section */}
      <div className="upload-section">
        <h3>Upload Project</h3>
        <div 
          {...getRootProps()} 
          className={`upload-zone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the ZIP file here...</p>
          ) : (
            <p>
              📁 Drag & Drop ZIP<br />
              or Click to Upload
            </p>
          )}
        </div>
      </div>

      {/* Impact Analysis Section */}
      <div className="impact-section">
        <h3>Impact Analysis</h3>
        
        {selectedFile ? (
          <div className="impact-data">
            <div className="selected-file">
              <strong>Selected:</strong> {selectedFile}
              <button 
                className="close-btn"
                onClick={() => setSelectedFile("")}
              >
                ×
              </button>
            </div>
            
            <div className="affected-files">
              <strong>Affected Files:</strong>
              {affectedFiles && affectedFiles.length > 0 ? (
                <ul>
                  {affectedFiles.map((file, index) => (
                    <li key={index}>{file}</li>
                  ))}
                </ul>
              ) : (
                <p className="no-impact">No files affected</p>
              )}
            </div>
          </div>
        ) : (
          <p className="placeholder">Click a node to see impact analysis</p>
        )}
      </div>
    </div>
  );
}
