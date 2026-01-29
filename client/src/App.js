import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import './App.css';

const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

// Generate consistent colors for clusters
const clusterColors = {};
const colorPalette = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1'
];
let colorIndex = 0;

function getClusterColor(cluster) {
  if (!clusterColors[cluster]) {
    clusterColors[cluster] = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;
  }
  return clusterColors[cluster];
}

function App() {
  const [thoughts, setThoughts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedThought, setSelectedThought] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    fetchThoughts();
  }, []);

  const fetchThoughts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/thoughts`);
      const data = await response.json();
      setThoughts(data.thoughts);
      setConnections(data.connections);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching thoughts:', error);
      setIsLoading(false);
    }
  };

  const addThought = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue.trim() })
      });

      const data = await response.json();

      if (data.thought) {
        setThoughts(prev => [...prev, data.thought]);
        setConnections(prev => [...prev, ...data.connections]);
        setInputValue('');
      }
    } catch (error) {
      console.error('Error adding thought:', error);
    }
  };

  const deleteThought = async (id) => {
    try {
      await fetch(`${API_URL}/api/thoughts/${id}`, { method: 'DELETE' });
      setThoughts(prev => prev.filter(t => t.id !== id));
      setConnections(prev => prev.filter(c => c.source_id !== id && c.target_id !== id));
      setSelectedThought(null);
    } catch (error) {
      console.error('Error deleting thought:', error);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all thoughts?')) return;

    try {
      await fetch(`${API_URL}/api/thoughts`, { method: 'DELETE' });
      setThoughts([]);
      setConnections([]);
      setSelectedThought(null);
    } catch (error) {
      console.error('Error clearing thoughts:', error);
    }
  };

  // D3 Force Simulation
  const initializeSimulation = useCallback(() => {
    if (!svgRef.current || thoughts.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create container for zoom
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare nodes and links
    const nodes = thoughts.map(t => ({
      ...t,
      x: t.x || width / 2 + (Math.random() - 0.5) * 200,
      y: t.y || height / 2 + (Math.random() - 0.5) * 200
    }));

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    const links = connections
      .filter(c => nodeById.has(c.source_id) && nodeById.has(c.target_id))
      .map(c => ({
        source: nodeById.get(c.source_id),
        target: nodeById.get(c.target_id),
        strength: c.strength
      }));

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(d => 150 - d.strength * 100)
        .strength(d => d.strength * 0.5))
      .force('charge', d3.forceManyBody()
        .strength(-200)
        .distanceMax(400))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(60))
      .force('cluster', forceCluster(nodes, 0.3));

    simulationRef.current = simulation;

    // Draw links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#ffffff')
      .attr('stroke-opacity', d => d.strength * 0.3 + 0.1)
      .attr('stroke-width', d => d.strength * 2 + 0.5);

    // Draw nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    // Add glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Add circles with gradient
    node.each(function(d) {
      const g = d3.select(this);
      const color = getClusterColor(d.cluster);

      // Create gradient for each node
      const gradientId = `gradient-${d.id}`;
      const gradient = defs.append('radialGradient')
        .attr('id', gradientId)
        .attr('cx', '30%')
        .attr('cy', '30%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(color).brighter(0.5));

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d3.color(color).darker(0.3));

      // Outer glow
      g.append('circle')
        .attr('r', 45)
        .attr('fill', color)
        .attr('opacity', 0.2)
        .attr('filter', 'url(#glow)');

      // Main bubble
      g.append('circle')
        .attr('r', 40)
        .attr('fill', `url(#${gradientId})`)
        .attr('stroke', d3.color(color).brighter(0.8))
        .attr('stroke-width', 2)
        .attr('opacity', 0.9);
    });

    // Add text
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .text(d => truncateText(d.content, 15))
      .each(function(d) {
        const text = d3.select(this);
        const words = d.content.split(/\s+/);
        if (words.length > 3) {
          text.text('');
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', '-0.5em')
            .text(truncateText(words.slice(0, Math.ceil(words.length/2)).join(' '), 12));
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', '1.2em')
            .text(truncateText(words.slice(Math.ceil(words.length/2)).join(' '), 12));
        }
      });

    // Click handler
    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedThought(d);
    });

    // Click on background to deselect
    svg.on('click', () => {
      setSelectedThought(null);
    });

    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;

      // Save position
      fetch(`${API_URL}/api/thoughts/${d.id}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: d.x, y: d.y })
      });
    }

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = container.node().getBBox();
      const fullWidth = bounds.width;
      const fullHeight = bounds.height;
      const midX = bounds.x + fullWidth / 2;
      const midY = bounds.y + fullHeight / 2;

      if (fullWidth > 0 && fullHeight > 0) {
        const scale = Math.min(0.8, 0.8 / Math.max(fullWidth / width, fullHeight / height));
        const translate = [width / 2 - scale * midX, height / 2 - scale * midY];

        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }
    }, 500);

  }, [thoughts, connections]);

  // Custom force to cluster nodes by theme
  function forceCluster(nodes, strength) {
    const clusters = {};

    nodes.forEach(node => {
      if (!clusters[node.cluster]) {
        clusters[node.cluster] = { x: 0, y: 0, count: 0 };
      }
      clusters[node.cluster].count++;
    });

    // Assign cluster positions
    const clusterKeys = Object.keys(clusters);
    const angleStep = (2 * Math.PI) / clusterKeys.length;

    clusterKeys.forEach((key, i) => {
      const angle = i * angleStep;
      const radius = 200;
      clusters[key].x = Math.cos(angle) * radius;
      clusters[key].y = Math.sin(angle) * radius;
    });

    return function(alpha) {
      nodes.forEach(node => {
        const cluster = clusters[node.cluster];
        if (cluster) {
          node.vx = (node.vx || 0) + (cluster.x - node.x) * strength * alpha;
          node.vy = (node.vy || 0) + (cluster.y - node.y) * strength * alpha;
        }
      });
    };
  }

  useEffect(() => {
    initializeSimulation();
  }, [initializeSimulation]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      initializeSimulation();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initializeSimulation]);

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '...';
  }

  // Get unique clusters for legend
  const clusters = [...new Set(thoughts.map(t => t.cluster))].filter(Boolean);

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">💭</span>
          <h1>Thought Threads</h1>
        </div>
        <p className="tagline">Drop in a thought, watch ideas connect</p>
      </header>

      <form className="input-container" onSubmit={addThought}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="What's on your mind?"
          className="thought-input"
          autoFocus
        />
        <button type="submit" className="add-button">
          Add Thought
        </button>
      </form>

      <svg ref={svgRef} className="visualization" />

      {clusters.length > 0 && (
        <div className="legend">
          <h3>Themes</h3>
          <div className="legend-items">
            {clusters.map(cluster => (
              <div key={cluster} className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: getClusterColor(cluster) }}
                />
                <span className="legend-label">{cluster}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedThought && (
        <div className="detail-panel">
          <button className="close-button" onClick={() => setSelectedThought(null)}>×</button>
          <h3>Thought Details</h3>
          <p className="detail-content">{selectedThought.content}</p>
          <div className="detail-meta">
            <span className="detail-cluster" style={{ background: getClusterColor(selectedThought.cluster) }}>
              {selectedThought.cluster}
            </span>
            {selectedThought.keywords && selectedThought.keywords.length > 0 && (
              <div className="detail-keywords">
                {selectedThought.keywords.map((keyword, i) => (
                  <span key={i} className="keyword">{keyword}</span>
                ))}
              </div>
            )}
          </div>
          <button className="delete-button" onClick={() => deleteThought(selectedThought.id)}>
            Delete Thought
          </button>
        </div>
      )}

      {thoughts.length > 0 && (
        <button className="clear-button" onClick={clearAll}>
          Clear All
        </button>
      )}

      {isLoading && (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading thoughts...</p>
        </div>
      )}

      {!isLoading && thoughts.length === 0 && (
        <div className="empty-state">
          <p>✨ Start by adding your first thought above</p>
          <p className="hint">Related ideas will automatically cluster together</p>
        </div>
      )}
    </div>
  );
}

export default App;
