# 💭 Thought Threads

A brainstorming tool that visually connects your ideas. Drop in a thought, and watch as related concepts cluster together, helping you see patterns and spark new directions.

![Thought Threads](https://via.placeholder.com/800x400?text=Thought+Threads+Visualization)

## Features

- **Visual Brainstorming**: Ideas appear as colorful bubbles in an interactive force-directed graph
- **Auto-Clustering**: Related thoughts automatically group together based on themes and keywords
- **Persistent Storage**: Your thoughts are saved to a database and persist between sessions
- **Interactive**: Drag, zoom, and click on thoughts to explore connections
- **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React + D3.js for force-directed graph visualization
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3) for persistence
- **NLP**: Natural.js for keyword extraction and theme clustering

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/thought-threads.git
   cd thought-threads
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts both the backend (port 3001) and frontend (port 3000).

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Production Build

```bash
npm run build
npm start
```

## Deploy to Render

### Option 1: One-Click Deploy

1. Fork this repository to your GitHub account
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub account and select the forked repository
5. Render will automatically detect the `render.yaml` and configure everything
6. Click **Apply** to deploy

### Option 2: Manual Deploy

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: thought-threads
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `NODE_ENV`: production
   - `DATABASE_PATH`: /opt/render/project/src/data/thoughts.db
6. Add a disk:
   - **Name**: thought-threads-data
   - **Mount Path**: /opt/render/project/src/data
   - **Size**: 1 GB
7. Click **Create Web Service**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/thoughts` | Get all thoughts and connections |
| POST | `/api/thoughts` | Add a new thought |
| DELETE | `/api/thoughts/:id` | Delete a specific thought |
| PATCH | `/api/thoughts/:id/position` | Update thought position |
| DELETE | `/api/thoughts` | Clear all thoughts |

## How It Works

1. **Keyword Extraction**: When you add a thought, the system extracts meaningful keywords using NLP
2. **Similarity Matching**: New thoughts are compared to existing ones using Jaccard similarity
3. **Cluster Assignment**: Thoughts are assigned to clusters based on shared themes
4. **Force Simulation**: D3.js positions bubbles so related ones cluster together naturally

## Project Structure

```
thought-threads/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── App.js         # Main React component
│       ├── App.css        # Styles
│       └── index.js       # Entry point
├── server/
│   └── index.js           # Express server + API
├── package.json           # Root package.json
├── render.yaml            # Render deployment config
└── README.md
```

## License

MIT License - feel free to use this for your own projects!

---

Built with 💜 for creative thinkers everywhere.
