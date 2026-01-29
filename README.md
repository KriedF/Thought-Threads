# 🎯 Skill Threads

A career discovery tool that helps you visualize how your skills connect to different career paths. Enter your skills and watch them cluster into job categories, helping you discover career opportunities that match your abilities.

## Features

- **Visual Skill Mapping**: Skills appear as colorful bubbles in an interactive force-directed graph
- **Auto-Clustering**: Related skills automatically group into career categories (Software Development, Data Science, Marketing, Healthcare, etc.)
- **Persistent Storage**: Your skills are saved to a database and persist between sessions
- **Interactive**: Drag, zoom, and click on skills to explore career connections
- **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React + D3.js for force-directed graph visualization
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3) for persistence
- **NLP**: Natural.js for keyword extraction and theme clustering

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/thoughts` | Get all skills and connections |
| POST | `/api/thoughts` | Add a new skill |
| DELETE | `/api/thoughts/:id` | Delete a specific skill |
| PATCH | `/api/thoughts/:id/position` | Update skill position |
| DELETE | `/api/thoughts` | Clear all skills |

## How It Works

1. **Keyword Extraction**: When you add a skill, the system extracts meaningful keywords
2. **Career Matching**: Skills are matched against 20+ career categories including Software Development, Data Science, Design, Marketing, Healthcare, Finance, and more
3. **Cluster Assignment**: Skills are assigned to career clusters based on industry relevance
4. **Force Simulation**: D3.js positions bubbles so related career paths cluster together naturally

## Project Structure

```
skill-threads/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── App.js         # Main React component
│       ├── App.css        # Styles
│       └── index.js       # Entry point
├── server/
│   └── index.js           # Express server + API + Career categories
├── package.json           # Root package.json
├── render.yaml            # Render deployment config
└── README.md
```

## License

MIT License © 2026 Fatima Kried

You are free to use, modify, and distribute this software, but you must include the original copyright notice and license. See [LICENSE](LICENSE) for details.

---

Created by **Fatima Kried** · Built with 💜 to help people discover their career paths.
