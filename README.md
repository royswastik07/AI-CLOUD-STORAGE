# AI-Powered Personal Cloud Storage

A full-stack, intelligent cloud storage application that automatically analyzes and tags uploaded images using Google Cloud Vision API and stores files in Google Cloud Storage.

---

## 🚀 Project Description

This project is a complete, modern web application that provides a personal cloud storage solution with AI-powered organization features. Users can upload, download, and manage their files through a sleek web interface with both gallery and table views. Files are stored in Google Cloud Storage, and images are automatically analyzed for content tags.

**Key Technical Highlights:**
- **Full-Stack Development:** React frontend + Node.js/Express backend
- **Cloud Storage:** Files stored in Google Cloud Storage with signed URLs
- **Asynchronous Processing:** Redis-backed job queue (BullMQ) for non-blocking AI analysis
- **AI Integration:** Google Cloud Vision API for automatic image tagging
- **Modern UI:** Dark/Light themes, image gallery with lightbox, search by tags

---

## ✨ Features

### Core Features
- ☁️ **Cloud File Storage** - Files stored securely in Google Cloud Storage
- 📤 **File Upload** - Upload with real-time progress bar
- 📥 **File Download** - Download via signed URLs
- 🗑️ **File Delete** - Remove files from cloud and database

### AI Features
- 🏷️ **Automatic AI Tagging** - Images analyzed by Google Vision API
- 🔍 **Search by Tags** - Filter files by name or AI-generated tags
- 🎯 **Tag Suggestions** - Quick filter buttons for common tags

### UI Features
- 🖼️ **Image Gallery** - Visual grid view with hover effects
- 📋 **Table View** - Detailed list with file metadata
- 🔍 **Lightbox Preview** - Click images for full-size view with all tags
- 🌙 **Dark/Light Theme** - Toggle between themes (persisted in localStorage)
- 📊 **Upload Progress** - Real-time progress bar during uploads

---

## ⚙️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    React + Vite (Port 5173)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────────┐
│                         BACKEND API                             │
│                   Node.js/Express (Port 3001)                   │
└──────┬────────────────────┬──────────────────────────┬──────────┘
       │                    │                          │
       ▼                    ▼                          ▼
┌──────────────┐    ┌──────────────┐           ┌──────────────────┐
│  PostgreSQL  │    │    Redis     │           │  Google Cloud    │
│   (Metadata) │    │   (Queue)    │           │  Storage         │
└──────────────┘    └──────┬───────┘           └──────────────────┘
                           │
                    ┌──────▼───────┐
                    │  AI Worker   │
                    │  (Separate   │──────► Google Vision API
                    │   Process)   │
                    └──────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- Docker and Docker Compose
- Google Cloud account with:
  - **Cloud Vision API** enabled
  - **Cloud Storage** bucket created
  - **Service Account JSON key**

### Installation & Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-username/ai-cloud-storage.git
   cd ai-cloud-storage
   ```

2. **Create a Google Cloud Storage Bucket:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/storage)
   - Create a new bucket (e.g., `ai-cloud-storage-files`)
   - Set region to your preferred location
   - Grant your service account `Storage Object Admin` role

3. **Setup Google Cloud Credentials:**
   - Place your Service Account `.json` file in the `backend/` directory
   - Update the filename in these files:
     - `backend/storage.js` - line 7
     - `backend/worker.js` - lines 12 and 16
   - Update bucket name in `backend/storage.js` - line 11
   - **IMPORTANT:** Ensure your `.json` file is in `.gitignore`

4. **Start Background Services:**
   ```sh
   docker-compose up -d
   ```

5. **Setup the Backend:**
   ```sh
   cd backend
   npm install
   node init-db.js
   node index.js        # Terminal 1 - API Server
   node worker.js       # Terminal 2 - AI Worker
   ```

6. **Setup the Frontend:**
   ```sh
   cd frontend
   npm install
   npm run dev          # Terminal 3
   ```

7. **Open the application:**
   Navigate to `http://localhost:5173`

---

## � Project Structure

```
ai-cloud-storage/
├── backend/
│   ├── index.js        # Express API server
│   ├── worker.js       # AI analysis worker
│   ├── storage.js      # Google Cloud Storage module
│   ├── queue.js        # Redis/BullMQ queue
│   ├── db.js           # PostgreSQL connection
│   ├── init-db.js      # Database schema setup
│   └── uploads/        # Temporary upload directory
├── frontend/
│   └── src/
│       ├── App.jsx     # Main React component
│       ├── App.css     # Component styles
│       └── index.css   # Global styles & themes
└── docker-compose.yml  # PostgreSQL & Redis
```

---

## 🔮 Future Improvements

- **User Authentication** - Add user accounts for private storage
- **Folder Management** - Organize files into directories
- **Bulk Operations** - Select and manage multiple files
- **Image Editing** - Crop, rotate, and filter images
- **Mobile App** - React Native version

---

## 📄 License

This project is open source and available under the MIT License.