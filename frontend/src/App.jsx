import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001';

function App() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/files`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert('Please select a file first!');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      await response.json();
      fetchFiles(); // Refresh the list after upload
    } catch (error) {
      setError(error.message);
      alert('Error uploading file.');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      document.getElementById('file-input').value = null;
    }
  };

  // --- NEW: Download Handler ---
  const handleDownload = (filename) => {
    window.open(`${API_URL}/files/${filename}`, '_blank');
  };

  // --- NEW: Delete Handler ---
  const handleDelete = async (filename) => {
    // Important UX: Ask for confirmation before deleting!
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/files/${filename}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      await response.json();
      fetchFiles(); // Refresh the list after delete
    } catch (error) {
      setError(error.message);
      alert('Error deleting file.');
    }
  };

  return (
    <div className="container">
      <h1>My Cloud Storage</h1>

      <div className="upload-section">
        <h2>Upload a New File</h2>
        <input id="file-input" type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      <div className="file-list">
        <h2>Uploaded Files</h2>
        {isLoading && <p>Loading files...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.length > 0 ? (
                files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.original_name}</td>
                    <td>{Math.round(file.file_size / 1024)} KB</td>
                    <td>
                      {/* --- NEW: Action Buttons --- */}
                      <button onClick={() => handleDownload(file.file_name)}>Download</button>
                      <button className="delete-btn" onClick={() => handleDelete(file.file_name)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No files uploaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;