import { useState, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState('gallery');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/files`);
      if (!response.ok) throw new Error('Failed to fetch files');
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
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };



  // Upload with progress
  const handleUpload = async () => {
    if (!selectedFile) return alert('Please select a file first!');
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', `${API_URL}/upload`);
        xhr.send(formData);
      });

      fetchFiles();
    } catch (error) {
      setError(error.message);
      alert('Error uploading file.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      document.getElementById('file-input').value = null;
    }
  };

  const handleDownload = (filename) => {
    window.open(`${API_URL}/files/${filename}`, '_blank');
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete this file?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/files/${filename}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      await response.json();
      fetchFiles();
    } catch (error) {
      setError(error.message);
      alert('Error deleting file.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎬';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    return '📁';
  };

  const isImage = (mimeType) => mimeType?.startsWith('image/');

  const openLightbox = (file) => {
    if (isImage(file.mime_type)) {
      setLightboxImage(file);
    }
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  // Filter files by search query (matches name or AI tags)
  const filteredFiles = files.filter(file => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = file.original_name.toLowerCase().includes(query);
    const tagMatch = file.ai_tags?.some(tag => tag.toLowerCase().includes(query));
    return nameMatch || tagMatch;
  });

  // Filter only images for gallery view
  const imageFiles = filteredFiles.filter(f => isImage(f.mime_type));

  // Get all unique tags for suggestions
  const allTags = [...new Set(files.flatMap(f => f.ai_tags || []))];

  return (
    <div className="container">
      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Header */}
      <header className="header">
        <h1>
          <span className="header-icon">☁️</span>
          Cloud Storage
        </h1>
        <p>AI-powered file management with automatic tagging</p>
      </header>

      {/* Upload Section */}
      <div className="glass-card">
        <div className="upload-section">
          <h2>📤 Upload New File</h2>
          <div className="upload-area">
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
            />
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? (
                <>⬆️ Uploading... {uploadProgress}%</>
              ) : (
                <>⬆️ Upload to Cloud</>
              )}
            </button>
          </div>
          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by name or AI tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Tag Suggestions */}
      {allTags.length > 0 && !searchQuery && (
        <div className="tag-suggestions">
          <span className="tag-label">Quick filters:</span>
          {allTags.slice(0, 8).map((tag, i) => (
            <button key={i} className="tag-btn" onClick={() => setSearchQuery(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'gallery' ? 'active' : ''}`}
          onClick={() => setViewMode('gallery')}
        >
          🖼️ Gallery
        </button>
        <button
          className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          📋 Table
        </button>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading files from cloud...</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ Error: {error}
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && !isLoading && (
        <p className="search-results">
          Found {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </p>
      )}

      {/* Gallery View */}
      {!isLoading && !error && viewMode === 'gallery' && (
        <div className="glass-card">
          <h2>
            🖼️ Image Gallery
            <span className="file-count">{imageFiles.length} images</span>
          </h2>

          {imageFiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📷</div>
              <p>{searchQuery ? 'No images match your search.' : 'No images uploaded yet.'}</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {imageFiles.map((file) => (
                <div
                  key={file.id}
                  className="gallery-item"
                  onClick={() => openLightbox(file)}
                >
                  <div className="gallery-image-container">
                    <img
                      src={file.signed_url || file.public_url}
                      alt={file.original_name}
                      className="gallery-image"
                      loading="lazy"
                    />
                    <div className="gallery-overlay">
                      <span className="gallery-name">{file.original_name}</span>
                      {file.ai_tags && file.ai_tags.length > 0 && (
                        <div className="gallery-tags">
                          {file.ai_tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="gallery-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.stopPropagation(); handleDownload(file.file_name); }}
                      title="Download"
                    >
                      ⬇️
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.file_name); }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {!isLoading && !error && viewMode === 'table' && (
        <div className="glass-card file-list-section">
          <h2>
            📂 All Files
            <span className="file-count">{filteredFiles.length} files</span>
          </h2>

          {filteredFiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>{searchQuery ? 'No files match your search.' : 'No files uploaded yet.'}</p>
            </div>
          ) : (
            <div className="file-table">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Date</th>
                    <th>AI Tags</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <div className="file-name">
                          <span className="file-icon">{getFileIcon(file.mime_type)}</span>
                          {file.original_name}
                        </div>
                      </td>
                      <td className="file-size">{formatFileSize(file.file_size)}</td>
                      <td className="file-date">{formatDate(file.upload_date)}</td>
                      <td>
                        <div className="tags-container">
                          {file.ai_tags && file.ai_tags.length > 0 ? (
                            file.ai_tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="tag clickable"
                                onClick={() => setSearchQuery(tag)}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="no-tags">No tags</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn-download"
                            onClick={() => handleDownload(file.file_name)}
                          >
                            ⬇️ Download
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(file.file_name)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox}>✕</button>
            <img
              src={lightboxImage.signed_url || lightboxImage.public_url}
              alt={lightboxImage.original_name}
              className="lightbox-image"
            />
            <div className="lightbox-info">
              <h3>{lightboxImage.original_name}</h3>
              <p>{formatFileSize(lightboxImage.file_size)} • {formatDate(lightboxImage.upload_date)}</p>
              {lightboxImage.ai_tags && lightboxImage.ai_tags.length > 0 && (
                <div className="lightbox-tags">
                  {lightboxImage.ai_tags.map((tag, i) => (
                    <span
                      key={i}
                      className="tag clickable"
                      onClick={() => { setSearchQuery(tag); closeLightbox(); }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="lightbox-actions">
                <button
                  className="btn-download"
                  onClick={() => handleDownload(lightboxImage.file_name)}
                >
                  ⬇️ Download
                </button>
                <button
                  className="btn-delete"
                  onClick={() => { handleDelete(lightboxImage.file_name); closeLightbox(); }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;