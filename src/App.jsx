
import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Layout, Zap, Info, Trophy, Fingerprint, MousePointer2, Play, UserCircle2, Sparkles, Target, Activity, Rocket } from 'lucide-react';
import { BFS, DFS, AStar } from './algorithms/pathfinding';

const ROWS = 20;
const COLS = 40;

const CHARACTERS = [
  { id: 'pikachu', name: 'Pikachu', img: '/pikachu.png', color: '#facc15' },
  { id: 'charmander', name: 'Charmander', img: '/charmander.png', color: '#f97316' },
  { id: 'squirtle', name: 'Squirtle', img: '/squirtle.png', color: '#06b6d4' },
  { id: 'meowth', name: 'Meowth', img: '/meowth.png', color: '#f5f5f5' }
];

const App = () => {
  const [grid, setGrid] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [moving, setMoving] = useState(false);
  const [stats, setStats] = useState({ steps: 0, explored: 0 });
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [startPos, setStartPos] = useState({ row: 0, col: 0 });
  const [endPos, setEndPos] = useState({ row: 0, col: 0 });
  const [gameWon, setGameWon] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [algorithm, setAlgorithm] = useState('A*');
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);
  const [showCharSelect, setShowCharSelect] = useState(true);
  const [mouseIsPressed, setMouseIsPressed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guidePath, setGuidePath] = useState([]);
  const [revealAll, setRevealAll] = useState(false);

  const getDistance = (p1, p2) => Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col);

  const createNode = (row, col, sPos, ePos) => ({
    row,
    col,
    isStart: row === sPos.row && col === sPos.col,
    isEnd: row === ePos.row && col === ePos.col,
    isWall: false,
    distance: Infinity,
    isVisited: false,
    isRevealed: false,
    previousNode: null,
  });

  const resetVisualizationOnly = () => {
    const nodes = document.querySelectorAll('.node-unique');
    nodes.forEach(n => {
      const classes = ['n-wall', 'n-start', 'n-target', 'n-player'];
      const hasGameClass = classes.some(cls => n.classList.contains(cls));
      if (!hasGameClass) {
        n.classList.remove('node-path-active');
      }
    });
  };

  const revealCells = useCallback((row, col) => {
    setGrid(prev => {
      if (!prev || prev.length === 0) return prev;
      let changed = false;
      const next = prev.map(r => r.map(node => {
        const dist = Math.abs(node.row - row) + Math.abs(node.col - col);
        if (dist <= visibleRadius && !node.isRevealed) {
          changed = true;
          return { ...node, isRevealed: true };
        }
        return node;
      }));
      return changed ? next : prev;
    });
  }, [visibleRadius]);

  const generateNewGame = useCallback(() => {
    const sPos = {
      row: Math.floor(Math.random() * ROWS),
      col: Math.floor(Math.random() * (COLS / 4))
    };
    const ePos = {
      row: Math.floor(Math.random() * ROWS),
      col: Math.floor(COLS - 1 - (Math.random() * (COLS / 4)))
    };

    const newGrid = [];
    for (let row = 0; row < ROWS; row++) {
      const currentRow = [];
      for (let col = 0; col < COLS; col++) {
        const isWall = (row !== sPos.row || col !== sPos.col) &&
          (row !== ePos.row || col !== ePos.col) &&
          Math.random() < 0.3;
        currentRow.push({
          ...createNode(row, col, sPos, ePos),
          isWall
        });
      }
      newGrid.push(currentRow);
    }

    const finalGrid = newGrid.map(r => r.map(node => {
      const dist = Math.abs(node.row - sPos.row) + Math.abs(node.col - sPos.col);
      // Reveal nodes around start AND the portal itself
      if (dist <= visibleRadius || (node.row === ePos.row && node.col === ePos.col)) {
        return { ...node, isRevealed: true };
      }
      return node;
    }));

    setGrid(finalGrid);
    setStartPos(sPos);
    setEndPos(ePos);
    setPlayerPos(sPos);
    setStats({ steps: 0, explored: 0 });
    setGameWon(false);
    setGameStarted(false);
    resetVisualizationOnly();
  }, [visibleRadius]);

  const walkPath = async (path) => {
    if (!path || !gameStarted) return;
    setMoving(true);
    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      await new Promise(r => setTimeout(r, 60));

      setGrid(prev => {
        const newGrid = [...prev];
        newGrid[node.row] = [...newGrid[node.row]];
        newGrid[node.row][node.col] = {
          ...newGrid[node.row][node.col],
          isVisited: true,
          isRevealed: true
        };
        return newGrid;
      });

      setPlayerPos({ row: node.row, col: node.col });
      revealCells(node.row, node.col);
      setStats(s => ({ ...s, steps: i }));

      if (node.row === endPos.row && node.col === endPos.col) {
        setGameWon(true);
        break;
      }
    }
    setMoving(false);
  };

  const walkToDestination = async (targetRow, targetCol) => {
    if (moving || gameWon || !gameStarted) return;
    resetVisualizationOnly();
    const startNode = grid[playerPos.row][playerPos.col];
    const endNode = grid[targetRow][targetCol];
    const { path } = AStar(grid, startNode, endNode);
    await walkPath(path);
  };

  const aiSolve = async () => {
    if (moving || gameWon || !gameStarted) return;
    resetVisualizationOnly();
    const startNode = grid[playerPos.row][playerPos.col];
    const endNode = grid[endPos.row][endPos.col];

    let result;
    if (algorithm === 'BFS') result = BFS(grid, startNode, endNode);
    else if (algorithm === 'DFS') result = DFS(grid, startNode, endNode);
    else result = AStar(grid, startNode, endNode);

    if (result && result.path) {
      await walkPath(result.path);
    }
  };

  const movePlayerManual = useCallback((dRow, dCol) => {
    if (moving || gameWon || showCharSelect || !gameStarted) return;

    setPlayerPos(prev => {
      const newRow = prev.row + dRow;
      const newCol = prev.col + dCol;

      if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
        if (!grid[newRow][newCol].isWall) {
          const nextPos = { row: newRow, col: newCol };

          setGrid(prevGrid => {
            const nGrid = [...prevGrid];
            nGrid[newRow] = [...nGrid[newRow]];
            nGrid[newRow][newCol] = {
              ...nGrid[newRow][newCol],
              isVisited: true,
              isRevealed: true
            };
            return nGrid;
          });

          revealCells(newRow, newCol);
          if (nextPos.row === endPos.row && nextPos.col === endPos.col) {
            setGameWon(true);
          }
          setStats(s => ({ ...s, steps: s.steps + 1 }));
          return nextPos;
        }
      }
      return prev;
    });
  }, [grid, moving, gameWon, showCharSelect, endPos, gameStarted, revealCells]);

  const updateGuide = useCallback(() => {
    if (!showGuide || gameWon || !gameStarted || !grid.length) {
      setGuidePath([]);
      return;
    }
    const startNode = grid[playerPos.row][playerPos.col];
    const endNode = grid[endPos.row][endPos.col];
    const { path } = AStar(grid, startNode, endNode);
    setGuidePath(path || []);
  }, [showGuide, gameWon, gameStarted, grid, playerPos, endPos]);

  useEffect(() => {
    updateGuide();
  }, [playerPos, showGuide, updateGuide]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': movePlayerManual(-1, 0); break;
        case 'ArrowDown': case 's': movePlayerManual(1, 0); break;
        case 'ArrowLeft': case 'a': movePlayerManual(0, -1); break;
        case 'ArrowRight': case 'd': movePlayerManual(0, 1); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayerManual]);

  const handleMouseDown = (row, col) => {
    if (moving || gameWon || showCharSelect) return;

    if (editMode) {
      const node = grid[row][col];
      if (node.isStart || node.isEnd) return;
      const newGrid = [...grid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = { ...node, isWall: !node.isWall };
      setGrid(newGrid);
      setMouseIsPressed(true);
    } else {
      if (!grid[row][col].isWall) {
        walkToDestination(row, col);
      }
    }
  };

  const handleMouseEnter = (row, col) => {
    if (!mouseIsPressed || !editMode || moving || gameWon) return;
    const node = grid[row][col];
    if (node.isStart || node.isEnd) return;
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = { ...node, isWall: !node.isWall };
    setGrid(newGrid);
  };

  const handleMouseUp = () => {
    setMouseIsPressed(false);
  };

  const startGame = (char) => {
    setSelectedChar(char);
    setShowCharSelect(false);
    generateNewGame();
  };

  if (showCharSelect) {
    return (
      <div className="game-lobby">
        <div className="lobby-content">
          <header className="lobby-header">
            <Sparkles className="icon-sparkle" />
            <h1>POKÉ-MAZE ORIGINS</h1>
            <p>CHOOSE YOUR JOURNEY</p>
          </header>

          <div className="hero-selection">
            {CHARACTERS.map(char => (
              <div
                key={char.id}
                className="hero-card"
                onClick={() => startGame(char)}
                style={{ '--hero-color': char.color }}
              >
                <div className="hero-img-box">
                  <img src={char.img} alt={char.name} onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/188/188987.png' }} />
                  <div className="hero-glown"></div>
                </div>
                <div className="hero-info">
                  <h2>{char.name}</h2>
                  <div className="hero-stats">
                    <div className="stat-bar"><div className="fill" style={{ width: '80%' }}></div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container-unique">
      <aside className="game-sidebar-hud">
        <div className="hud-header">
          <Activity size={20} className="pulse-icon" />
          <span>PLAYER HUD</span>
        </div>

        <div className="hud-hero-box">
          <div className="hero-avatar" style={{ backgroundImage: `url(${selectedChar.img})` }}></div>
          <div className="hero-details">
            <span className="hero-name">{selectedChar.name}</span>
            <span className="hero-status">MAZE RUNNER V1.0</span>
          </div>
        </div>

        <div className="hud-nav">
          <div className="stat-hud-box gold">
            <span className="label">ENERGY / STEPS</span>
            <span className="value">{stats.steps}</span>
          </div>

          <div className="stat-hud-box blue">
            <span className="label">CURRENT MODE</span>
            <span className="value">{editMode ? 'BUILDER' : 'MISSION'}</span>
          </div>

          <div className="stat-hud-box green">
            <span className="label">ALGORITHM</span>
            <span className="value">{algorithm}</span>
          </div>

          <div className="stat-hud-box orange">
            <span className="label">DISTANCE TO GO</span>
            <span className="value">{getDistance(playerPos, endPos)}</span>
          </div>
        </div>

        <div className="hud-controls">
          <label>PATHFINDER PROTOCOL</label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} disabled={moving}>
            <option value="BFS">BFS - Shortest Path</option>
            <option value="DFS">DFS - Deep Exploration</option>
            <option value="A*">A* - Dynamic Intel</option>
          </select>

          <button className="hud-btn primary" onClick={aiSolve} disabled={moving || gameWon}>
            <Play size={16} /> INITIALIZE AI
          </button>

          <button className={`hud-btn ${editMode ? 'active' : ''}`} onClick={() => setEditMode(!editMode)}>
            <Layout size={16} /> {editMode ? 'LOCK MAZE' : 'EDIT TERRAIN'}
          </button>

          <button className={`hud-btn ${showGuide ? 'active-pulse' : ''}`} onClick={() => setShowGuide(!showGuide)}>
            <Info size={16} /> {showGuide ? 'HIDE SCANNER' : 'SCANNER PING'}
          </button>

          <button className={`hud-btn ${revealAll ? 'active-pulse' : ''}`} onClick={() => setRevealAll(!revealAll)}>
            <Sparkles size={16} /> {revealAll ? 'HIDE INTEL' : 'REVEAL FULL MAP'}
          </button>

          <button className="hud-btn secondary" onClick={generateNewGame} disabled={moving || gameWon}>
            <Zap size={16} /> NEW SESSION
          </button>

          <button className="hud-btn danger" onClick={() => setShowCharSelect(true)}>
            <RotateCcw size={16} /> MAIN MENU
          </button>
        </div>
      </aside>

      <main className="game-main-view">
        <header className="main-view-header">
          <div className="header-point">
            <UserCircle2 size={16} />
            <span>START: ({startPos.row}, {startPos.col})</span>
          </div>
          <div className="header-divider"></div>
          <div className="header-point">
            <Target size={16} />
            <span>OBJECTIVE: ({endPos.row}, {endPos.col})</span>
          </div>
        </header>

        <div className="maze-viewport">
          <div
            className="grid-unique"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 28px)`,
              gridTemplateRows: `repeat(${ROWS}, 28px)`
            }}
            onMouseLeave={handleMouseUp}
          >
            {grid.map((row, rowIdx) => (
              row.map((node, colIdx) => {
                const isPlayer = playerPos.row === rowIdx && playerPos.col === colIdx;
                const isGuide = guidePath.some(p => p.row === rowIdx && p.col === colIdx);
                const { isStart, isEnd, isWall, isRevealed } = node;

                let nodeClass = 'node-unique';
                if (isStart) nodeClass += ' n-start';
                if (isEnd) nodeClass += ' n-target';
                if (isWall) nodeClass += ' n-wall';
                if (isPlayer) nodeClass += ' n-player';
                if (!isRevealed && !revealAll) nodeClass += ' n-hidden';
                if (node.isVisited && !isStart && !isEnd) nodeClass += ' n-trail';
                if (isGuide && showGuide && !isPlayer && !isEnd) nodeClass += ' n-guide';

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    id={`node-${rowIdx}-${colIdx}`}
                    className={nodeClass}
                    onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                    onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                    onMouseUp={handleMouseUp}
                  >
                    {isPlayer && (
                      <div
                        className="player-sprite"
                        style={{ backgroundImage: `url(${selectedChar.img})` }}
                      />
                    )}
                    {isStart && <UserCircle2 size={18} className="start-icon" />}
                    {isEnd && <Fingerprint size={18} className="objective-icon" />}
                  </div>
                );
              })
            ))}
          </div>

          {!gameStarted && !showCharSelect && (
            <div className="mission-start-overlay">
              <div className="start-panel">
                <Rocket size={48} className="start-icon-rocket" />
                <h2>READY FOR MISSION?</h2>
                <p>The maze is hidden. Explore to reveal the path.</p>
                <button className="btn-start-game" onClick={() => setGameStarted(true)}>
                  START MISSION
                </button>
              </div>
            </div>
          )}

          {gameWon && (
            <div className="victory-modal">
              <div className="modal-inner">
                <Trophy size={80} className="modal-icon" />
                <h2>MISSION ACCOMPLISHED</h2>
                <div className="modal-stats">
                  <div className="m-stat">
                    <span>STEPS TAKEN</span>
                    <strong>{stats.steps}</strong>
                  </div>
                </div>
                <div className="modal-actions">
                  <button onClick={generateNewGame}>NEXT MISSION</button>
                  <button className="outline" onClick={() => setShowCharSelect(true)}>MAIN MENU</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="main-view-footer">
          <div className="legend-unique">
            <div className="l-item">
              <div className="l-box p-start"></div> <span>ORIGIN</span>
            </div>
            <div className="l-item">
              <div className="l-box p-wall"></div> <span>BARRIER</span>
            </div>
            <div className="l-item">
              <div className="l-box p-trail"></div> <span>TRACE</span>
            </div>
            <div className="l-item">
              <div className="l-box p-hidden" style={{ background: '#010409', border: '1px solid rgba(255,255,255,0.1)' }}></div> <span>HIDDEN</span>
            </div>
          </div>
          <div className="footer-tip">
            <Info size={14} />
            <span>OPERATOR TIP: CLICK ANY ACCESSIBLE TILE FOR AUTO-NAVIGATION.</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
