# 💭 Thought Threads

A brainstorming tool that visually connects your ideas. Drop in a thought, and watch as related concepts cluster together, helping you see patterns and spark new directions.

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

MIT License © 2026 Fatima Kried

You are free to use, modify, and distribute this software, but you must include the original copyright notice and license. See [LICENSE](LICENSE) for details.

---

Created by **Fatima** · Built with 💜 for creative thinkers everywhere.
