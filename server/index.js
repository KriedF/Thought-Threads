const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
let db;
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'thoughts.db');

// Stop words to filter out
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'any', 'also', 'over', 'out', 'up', 'down', 'off', 'if', 'my',
  'your', 'our', 'their', 'its', 'as', 'get', 'make', 'like', 'think',
  'know', 'want', 'need', 'use', 'try', 'come', 'go', 'see', 'look', 'way',
  'im', "i'm", "don't", "dont", "can't", "cant", "won't", "wont", "it's",
  'really', 'maybe', 'something', 'things', 'thing', 'much', 'many', 'well'
]);

// Simple stemmer (Porter-like, simplified)
function stem(word) {
  word = word.toLowerCase();
  // Remove common suffixes
  const suffixes = ['ing', 'ed', 'ly', 'er', 'est', 'ness', 'ment', 'tion', 'sion', 'ies', 's'];
  for (const suffix of suffixes) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      if (suffix === 'ies') {
        return word.slice(0, -3) + 'y';
      }
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

// Extract keywords from text
function extractKeywords(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));

  // Get unique keywords using stems
  const stemmedMap = new Map();
  words.forEach(word => {
    const stemmed = stem(word);
    if (!stemmedMap.has(stemmed)) {
      stemmedMap.set(stemmed, word);
    }
  });

  return Array.from(stemmedMap.values()).slice(0, 10);
}

// Calculate similarity between two thoughts based on keywords
function calculateSimilarity(keywords1, keywords2) {
  if (!keywords1.length || !keywords2.length) return 0;

  const set1 = new Set(keywords1.map(k => stem(k)));
  const set2 = new Set(keywords2.map(k => stem(k)));

  let intersection = 0;
  set1.forEach(k => {
    if (set2.has(k)) intersection++;
  });

  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Determine cluster based on keywords
function determineCluster(keywords, existingThoughts) {
  if (!keywords.length) return 'general';

  // Find the most common cluster among similar thoughts
  const clusterScores = {};

  existingThoughts.forEach(thought => {
    if (!thought.keywords) return;
    const thoughtKeywords = JSON.parse(thought.keywords);
    const similarity = calculateSimilarity(keywords, thoughtKeywords);

    if (similarity > 0.1 && thought.cluster) {
      clusterScores[thought.cluster] = (clusterScores[thought.cluster] || 0) + similarity;
    }
  });

  // If similar to existing clusters, join the best one
  const bestCluster = Object.entries(clusterScores)
    .sort((a, b) => b[1] - a[1])[0];

  if (bestCluster && bestCluster[1] > 0.2) {
    return bestCluster[0];
  }

  // Otherwise, create a new cluster based on the primary keyword
  return keywords[0] || 'general';
}

// Save database to file
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  try {
    // Try to load existing database
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (error) {
    console.log('Creating new database');
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      keywords TEXT,
      cluster TEXT,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      strength REAL DEFAULT 0.5,
      UNIQUE(source_id, target_id)
    )
  `);

  saveDatabase();
}

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Helper function to run queries
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
}

function dbGet(sql, params = []) {
  const results = dbAll(sql, params);
  return results[0] || null;
}

// API Routes

// Get all thoughts
app.get('/api/thoughts', (req, res) => {
  try {
    const thoughts = dbAll('SELECT * FROM thoughts ORDER BY created_at DESC');
    const connections = dbAll('SELECT * FROM connections');

    res.json({
      thoughts: thoughts.map(t => ({
        ...t,
        keywords: t.keywords ? JSON.parse(t.keywords) : []
      })),
      connections
    });
  } catch (error) {
    console.error('Error fetching thoughts:', error);
    res.status(500).json({ error: 'Failed to fetch thoughts' });
  }
});

// Add a new thought
app.post('/api/thoughts', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Extract keywords
    const keywords = extractKeywords(content);

    // Get existing thoughts for clustering
    const existingThoughts = dbAll('SELECT * FROM thoughts');

    // Determine cluster
    const cluster = determineCluster(keywords, existingThoughts);

    // Insert the thought
    const result = dbRun(
      'INSERT INTO thoughts (content, keywords, cluster) VALUES (?, ?, ?)',
      [content.trim(), JSON.stringify(keywords), cluster]
    );

    const newThought = dbGet('SELECT * FROM thoughts WHERE id = ?', [result.lastInsertRowid]);

    // Create connections to similar thoughts
    const newConnections = [];
    existingThoughts.forEach(thought => {
      if (!thought.keywords) return;
      const thoughtKeywords = JSON.parse(thought.keywords);
      const similarity = calculateSimilarity(keywords, thoughtKeywords);

      if (similarity > 0.15) {
        try {
          dbRun(
            'INSERT OR IGNORE INTO connections (source_id, target_id, strength) VALUES (?, ?, ?)',
            [newThought.id, thought.id, similarity]
          );
          newConnections.push({
            source_id: newThought.id,
            target_id: thought.id,
            strength: similarity
          });
        } catch (e) {}
      }
    });

    // Also connect thoughts in the same cluster with lower strength
    existingThoughts.forEach(thought => {
      if (thought.cluster === cluster && thought.id !== newThought.id) {
        const existingConnection = dbGet(
          'SELECT * FROM connections WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)',
          [newThought.id, thought.id, thought.id, newThought.id]
        );

        if (!existingConnection) {
          try {
            dbRun(
              'INSERT OR IGNORE INTO connections (source_id, target_id, strength) VALUES (?, ?, ?)',
              [newThought.id, thought.id, 0.1]
            );
            newConnections.push({
              source_id: newThought.id,
              target_id: thought.id,
              strength: 0.1
            });
          } catch (e) {}
        }
      }
    });

    saveDatabase();

    res.json({
      thought: {
        ...newThought,
        keywords: JSON.parse(newThought.keywords || '[]')
      },
      connections: newConnections
    });
  } catch (error) {
    console.error('Error adding thought:', error);
    res.status(500).json({ error: 'Failed to add thought' });
  }
});

// Delete a thought
app.delete('/api/thoughts/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Delete connections first
    dbRun('DELETE FROM connections WHERE source_id = ? OR target_id = ?', [id, id]);

    // Delete the thought
    dbRun('DELETE FROM thoughts WHERE id = ?', [id]);

    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting thought:', error);
    res.status(500).json({ error: 'Failed to delete thought' });
  }
});

// Update thought position
app.patch('/api/thoughts/:id/position', (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;

    dbRun('UPDATE thoughts SET x = ?, y = ? WHERE id = ?', [x, y, id]);
    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// Clear all thoughts
app.delete('/api/thoughts', (req, res) => {
  try {
    dbRun('DELETE FROM connections');
    dbRun('DELETE FROM thoughts');
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing thoughts:', error);
    res.status(500).json({ error: 'Failed to clear thoughts' });
  }
});

// Serve React app for any other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Start server after database is initialized
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🧠 Thought Threads server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
