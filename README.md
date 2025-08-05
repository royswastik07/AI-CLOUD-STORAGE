# AI-Powered Personal Cloud Storage

A full-stack, intelligent cloud storage application that automatically analyzes and tags uploaded images using a scalable, asynchronous backend architecture.

---

## 🚀 Project Description

This project is a complete, modern web application that provides a personal cloud storage solution with a unique AI-powered organization feature. Users can upload, download, and manage their files through a clean web interface. The backend is built with a sophisticated, decoupled architecture where file analysis tasks are handled by a separate background worker process, ensuring the user experience is fast and non-blocking.

This project demonstrates a practical understanding of:
-   **Full-Stack Development:** Building both a frontend (React) and a backend (Node.js/Express) that work together seamlessly.
-   **Asynchronous Job Processing:** Using a Redis-backed job queue (BullMQ) to handle long-running AI tasks without freezing the API. This is a critical pattern for building scalable, real-world applications.
-   **Database Management:** Integrating a PostgreSQL database to store and manage file metadata in a structured way.
-   **Cloud AI Integration:** Interacting with a third-party AI service (Google Cloud Vision API) to add intelligent features to an application.
-   **System Architecture Design:** Designing and implementing a multi-process system (API Server, AI Worker, Database, Queue).

---

## ✨ Features

-   **Secure File Upload:** Upload files through a user-friendly web interface.
-   **File Management:** List, download, and delete uploaded files.
-   **Automatic AI Tagging:** Images are automatically analyzed in the background to generate descriptive content tags (e.g., "Soccer player", "Stadium", "Eyewear").
-   **Asynchronous Processing:** The UI remains fast and responsive while the AI analysis happens behind the scenes.
-   **Persistent Metadata Storage:** All file information and AI tags are stored in a robust PostgreSQL database.

---

## ⚙️ System Architecture

The application is composed of several independent services that communicate with each other:

1.  **Frontend (React App):** The user interface running in the browser. It communicates with the Backend API.
2.  **Backend (Node.js API Server):** Handles user requests, serves file metadata, and adds new jobs to the Job Queue.
3.  **Job Queue (Redis & BullMQ):** A message broker that holds tasks (like "analyze this image") waiting to be processed.
4.  **AI Worker (Node.js Process):** A separate background process that listens to the Job Queue. When a new job appears, it takes the file, sends it to the Google Vision API, and updates the database with the results.
5.  **Database (PostgreSQL):** The central source of truth for all file metadata.


---
[User] -> [React Frontend] -> [Backend API] -> [Job Queue (Redis)]
|                ^
|                | (Picks up job)
v                |
[Database] <----- [AI Worker] -> [Google Vision API]

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm
-   Docker and Docker Compose
-   A Google Cloud account with the **Cloud Vision API** enabled and a **Service Account JSON key**.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/ai-cloud-storage.git](https://github.com/your-username/ai-cloud-storage.git)
    cd ai-cloud-storage
    ```

2.  **Setup Google Cloud Credentials:**
    -   Place your downloaded Google Cloud Service Account `.json` file into the `backend/` directory.
    -   **IMPORTANT:** Add the name of your `.json` file to the `.gitignore` file in the project root to prevent committing your secrets.
        ```
        # .gitignore
        your-service-account-file.json
        ```
    -   Update `backend/worker.js` to point to your key file:
        ```javascript
        const client = new vision.ImageAnnotatorClient({
            keyFilename: './your-service-account-file.json' // Use your actual filename
        });
        ```

3.  **Start Background Services:**
    Launch the PostgreSQL and Redis containers using Docker.
    ```sh
    docker-compose up -d
    ```

4.  **Setup the Backend:**
    -   Navigate to the backend directory: `cd backend`
    -   Install dependencies: `npm install`
    -   Initialize the database table: `node init-db.js`
    -   Start the API server (in one terminal): `node index.js`
    -   Start the AI worker (in a *second* terminal): `node worker.js`

5.  **Setup the Frontend:**
    -   Navigate to the frontend directory (in a *third* terminal): `cd ../frontend`
    -   Install dependencies: `npm install`
    -   Start the development server: `npm run dev`

6.  **Open the application:**
    Navigate to `http://localhost:5173` in your web browser.

---

## 🔮 Future Improvements

-   **Display AI Tags:** Show the generated AI tags as badges next to each file in the UI.
-   **Search by Tag:** Implement a search bar to filter files based on their AI tags.
-   **User Authentication:** Add user accounts so each user has their own private storage space.
-   **Folder Management:** Allow users to create and organize files into folders.