import { useState, useEffect, useRef } from 'react';
import {
  Play, CheckCircle2, RefreshCw, Plus, Trash2,
  Terminal, ShieldCheck, HardDrive, Cpu, GitBranch,
  User, Clock, Loader2
} from 'lucide-react';

// Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
}

interface PipelineRun {
  id: string;
  name: string;
  commit: string;
  author: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  duration: string;
  startedAt: string;
}

interface HealthData {
  status: string;
  uptime: string;
  database: string;
  system: {
    platform: string;
    memoryUsage: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
    }
  }
}

const mockHealth: HealthData = {
  status: 'UP (Offline Mock Mode)',
  uptime: '42s',
  database: 'MOCK_IN_MEMORY',
  system: {
    platform: 'win32',
    memoryUsage: {
      rss: '32.12 MB',
      heapTotal: '15.44 MB',
      heapUsed: '8.12 MB'
    }
  }
};

const pipelineStages = [
  { id: 'commit', name: 'Commit / Lint', icon: GitBranch, description: 'Static analysis & lint validations.' },
  { id: 'build', name: 'Docker Build', icon: HardDrive, description: 'Package container image binaries.' },
  { id: 'test', name: 'Test Suites', icon: ShieldCheck, description: 'Run comprehensive integration tests.' },
  { id: 'release', name: 'Push Release', icon: CheckCircle2, description: 'Push image tags to repository hub.' },
  { id: 'deploy', name: 'EC2 Deploy', icon: Cpu, description: 'Hot re-route via Nginx reverse proxy.' }
];

export default function App() {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRun[]>([]);
  const [health, setHealth] = useState<HealthData>(mockHealth);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingPipelines, setLoadingPipelines] = useState(true);

  // New task form state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAssignee, setNewAssignee] = useState('');

  // Active Pipeline State & Terminal Simulation
  const [activePipeline, setActivePipeline] = useState<PipelineRun | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1); // -1 = idle
  const [terminalLogs, setTerminalLogs] = useState<string[]>(['[SYSTEM] Welcome to DevFlow CI/CD Control Console.', '[SYSTEM] System ready. Trigger a pipeline above to start.']);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // API base URL helper
  const API_BASE = '/api';

  // Log auto-scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Fetch health data
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setIsBackendConnected(true);
      } else {
        setIsBackendConnected(false);
      }
    } catch {
      setIsBackendConnected(false);
      setHealth(mockHealth);
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        setFallbackTasks();
      }
    } catch {
      setFallbackTasks();
    } finally {
      setLoadingTasks(false);
    }
  };

  // Set Local Mock Tasks if backend is down
  const setFallbackTasks = () => {
    const local = localStorage.getItem('devflow_mock_tasks');
    if (local) {
      setTasks(JSON.parse(local));
    } else {
      const defaults: Task[] = [
        { id: '1', title: 'Configure docker-compose files', description: 'Set up local multi-container dev environment orchestration.', status: 'todo', priority: 'high', assignee: 'DevOps Lead' },
        { id: '2', title: 'Write GitHub Actions CI pipeline', description: 'Automate linting, testing, and Docker image pushing.', status: 'in-progress', priority: 'high', assignee: 'CI Engineer' },
        { id: '3', title: 'Configure Nginx reverse proxy', description: 'Route static assets and backend API endpoints smoothly.', status: 'done', priority: 'medium', assignee: 'SysAdmin' },
        { id: '4', title: 'Setup AWS EC2 instances & Security Groups', description: 'Deploy the application to AWS and manage standard security guidelines.', status: 'todo', priority: 'high', assignee: 'Cloud Architect' }
      ];
      setTasks(defaults);
      localStorage.setItem('devflow_mock_tasks', JSON.stringify(defaults));
    }
  };

  // Save Local Mock Tasks
  const saveMockTasks = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem('devflow_mock_tasks', JSON.stringify(updated));
  };

  // Fetch Pipeline History
  const fetchPipelines = async () => {
    setLoadingPipelines(true);
    try {
      const res = await fetch(`${API_BASE}/pipelines`);
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      } else {
        setFallbackPipelines();
      }
    } catch {
      setFallbackPipelines();
    } finally {
      setLoadingPipelines(false);
    }
  };

  const setFallbackPipelines = () => {
    const local = localStorage.getItem('devflow_mock_pipelines');
    if (local) {
      setPipelines(JSON.parse(local));
    } else {
      const defaults: PipelineRun[] = [
        { id: 'p1', name: 'DevFlow Production CD', commit: 'feat: add pipeline visualization (#34)', author: 'Jane Doe', status: 'success', duration: '120s', startedAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'p2', name: 'DevFlow Staging Build', commit: 'fix: database connection retry delay', author: 'John Smith', status: 'failed', duration: '45s', startedAt: new Date(Date.now() - 7200000).toISOString() }
      ];
      setPipelines(defaults);
      localStorage.setItem('devflow_mock_pipelines', JSON.stringify(defaults));
    }
  };

  const saveMockPipelines = (updated: PipelineRun[]) => {
    setPipelines(updated);
    localStorage.setItem('devflow_mock_pipelines', JSON.stringify(updated));
  };

  // Poll Health & Initial Load
  useEffect(() => {
    fetchHealth();
    fetchTasks();
    fetchPipelines();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync state if active pipeline simulation concludes in the background
  useEffect(() => {
    if (activePipeline && currentStageIndex === 5) {
      // Pipeline completed successfully!
      const finishPipeline = async () => {
        const updatedRun: PipelineRun = {
          ...activePipeline,
          status: 'success',
          duration: '10s'
        };

        if (isBackendConnected) {
          await fetchPipelines();
        } else {
          const stored = pipelines.map(p => p.id === activePipeline.id ? updatedRun : p);
          saveMockPipelines(stored);
        }
        
        setActivePipeline(null);
        setCurrentStageIndex(-1);
        setTerminalLogs(prev => [...prev, '\n[SUCCESS] CI/CD pipeline flow completed. Image built, pushed to hub, and hot-deployed successfully to EC2 instance! 🎉\n']);
      };
      
      const timeout = setTimeout(finishPipeline, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentStageIndex, activePipeline]);

  // Terminal Runner Simulation logic
  useEffect(() => {
    if (currentStageIndex >= 0 && currentStageIndex < 5 && activePipeline) {
      const stage = pipelineStages[currentStageIndex];
      
      const stageLogs: Record<string, string[]> = {
        commit: [
          `\n[STAGE: COMMIT / LINT] -------------------------------------`,
          `[LOG] Fetching code from branch: main`,
          `[LOG] Triggered by: ${activePipeline.author}`,
          `[LOG] Commit SHA: ${activePipeline.commit}`,
          `[LOG] Running ESLint validation check...`,
          `[LOG] Checking Prettier alignment standards...`,
          `[LOG] PASS: No syntax warnings found. All checks verified.`
        ],
        build: [
          `\n[STAGE: DOCKER BUILD] -------------------------------------`,
          `[LOG] Initializing Docker multi-stage environment builder...`,
          `[LOG] Step 1/12 : FROM node:18-alpine AS builder`,
          `[LOG] Step 2/12 : WORKDIR /app`,
          `[LOG] Step 3/12 : COPY package*.json ./`,
          `[LOG] Step 4/12 : RUN npm ci --only=production`,
          `[LOG] Bundle optimization completed. Final footprint is minimal.`,
          `[LOG] Building production artifacts for frontend client...`,
          `[LOG] SUCCESS: Docker image compiled successfully (Tag: devflow-prod:latest).`
        ],
        test: [
          `\n[STAGE: TEST SUITES] --------------------------------------`,
          `[LOG] Launching Jest unit testing pipeline runner...`,
          `[LOG] Running: backend/server.test.js - 4 tests passed`,
          `[LOG] Running: frontend/App.test.tsx - 8 tests passed`,
          `[LOG] Evaluating Code Coverage metric...`,
          `[LOG] Coverage results: 94.2% statements covered.`,
          `[LOG] PASS: 12/12 test suites executed successfully.`
        ],
        release: [
          `\n[STAGE: PUSH RELEASE] -------------------------------------`,
          `[LOG] Authenticating with Docker Hub registry token...`,
          `[LOG] Pushing layers to repository: index.docker.io/library/devflow-prod...`,
          `[LOG] Layer 1/4 [====================>] 12.3 MB/12.3 MB - Pushed`,
          `[LOG] Layer 2/4 [====================>]  4.1 MB/ 4.1 MB - Pushed`,
          `[LOG] SUCCESS: Registered release version v1.0.0-build-${activePipeline.id.slice(0, 4)}.`
        ],
        deploy: [
          `\n[STAGE: EC2 DEPLOY] ---------------------------------------`,
          `[LOG] Resolving production address: 54.210.82.90...`,
          `[LOG] Establishing SSH handshake protocol...`,
          `[LOG] pulling docker-compose pull configurations...`,
          `[LOG] Downscaling old instance containers...`,
          `[LOG] Executing: docker-compose up -d --force-recreate`,
          `[LOG] Re-routing traffic with Nginx configuration check...`,
          `[LOG] nginx: configurations test is successful`,
          `[LOG] Reloading system Nginx reverse proxy daemon...`,
          `[LOG] Deployment active! Application alive at production gateway.`
        ]
      };

      const lines = stageLogs[stage.id];
      let lineIndex = 0;

      const logTimer = setInterval(() => {
        if (lineIndex < lines.length) {
          setTerminalLogs(prev => [...prev, lines[lineIndex]]);
          lineIndex++;
        } else {
          clearInterval(logTimer);
          // Advance stage index after 2.5 seconds
          const advanceTimer = setTimeout(() => {
            setCurrentStageIndex(prev => prev + 1);
          }, 1000);
          return () => clearTimeout(advanceTimer);
        }
      }, 300);

      return () => {
        clearInterval(logTimer);
      };
    }
  }, [currentStageIndex, activePipeline]);

  // Trigger Pipeline Flow
  const handleTriggerPipeline = async () => {
    if (activePipeline) return; // Prevent multiple parallel pipelines in demo for simplicity

    const commitMsg = `feat: integrate database models (#${Math.floor(Math.random() * 90) + 10})`;
    const author = 'Lead DevOps';
    const name = 'DevFlow Automated Deploy';

    setTerminalLogs([
      `[SYSTEM] Preparing CI/CD Environment workflow trigger...`,
      `[SYSTEM] Connecting to runner socket cluster... Connected.`
    ]);

    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_BASE}/pipelines/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, commit: commitMsg, author })
        });
        if (res.ok) {
          const run = await res.json();
          // Backend handles duration state in 10s. Let's sync frontend visualizer
          setActivePipeline(run);
          setCurrentStageIndex(0);
        }
      } catch (err) {
        console.error('Failed to trigger pipeline via backend', err);
      }
    } else {
      // Mock flow trigger
      const mockRun: PipelineRun = {
        id: 'p-' + Math.random().toString(36).substr(2, 5),
        name,
        commit: commitMsg,
        author,
        status: 'running',
        duration: '...',
        startedAt: new Date().toISOString()
      };
      
      const updated = [mockRun, ...pipelines];
      saveMockPipelines(updated);
      setActivePipeline(mockRun);
      setCurrentStageIndex(0);
    }
  };

  // Kanban Board Card Actions
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload = {
      title: newTitle,
      description: newDesc,
      status: 'todo' as const,
      priority: newPriority,
      assignee: newAssignee || 'Unassigned'
    };

    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setTasks(prev => [...prev, created]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const mockCreated: Task = {
        ...payload,
        id: Math.random().toString(36).substr(2, 9)
      };
      const updated = [...tasks, mockCreated];
      saveMockTasks(updated);
    }

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewAssignee('');
    setShowNewTaskModal(false);
  };

  const handleUpdateTaskStatus = async (id: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...task, status: newStatus })
        });
        if (res.ok) {
          const updated = await res.json();
          setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const updated = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
      saveMockTasks(updated);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setTasks(prev => prev.filter(t => t.id !== id));
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const updated = tasks.filter(t => t.id !== id);
      saveMockTasks(updated);
    }
  };

  // Stats Counters
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dynamic Header Area */}
      <header className="glass-card" style={{ margin: '1.5rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', padding: '0.6rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>♾️</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, hsl(var(--text-muted)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>DevFlow</h1>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Enterprise-Grade CI/CD & DevOps Task Engine</p>
          </div>
        </div>

        {/* Dynamic Statistics Counters */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>{totalTasks}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--warning))' }}>{inProgressTasks}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{completedTasks}</span>
          </div>
        </div>

        {/* Global Connection Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: isBackendConnected ? 'hsla(var(--success), 0.1)' : 'hsla(var(--warning), 0.1)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${isBackendConnected ? 'hsla(var(--success), 0.3)' : 'hsla(var(--warning), 0.3)'}` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isBackendConnected ? 'hsl(var(--success))' : 'hsl(var(--warning))', animation: isBackendConnected ? 'pulse-glow 1.5s infinite' : 'none' }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isBackendConnected ? 'hsl(var(--success))' : 'hsl(var(--warning))', textTransform: 'uppercase' }}>
              {isBackendConnected ? 'Server Live' : 'Offline Sandbox'}
            </span>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { fetchHealth(); fetchTasks(); fetchPipelines(); }} title="Refresh Application Data">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Main Grid Area */}
      <main style={{ flex: '1', padding: '0 1.5rem 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Row 1: Pipeline Control & Statistics */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* CI/CD Actions and Visualizer */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Interactive CD Pipelines</h2>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Trigger automated deployments to cloud environment</p>
              </div>
              <button className="btn-primary" onClick={handleTriggerPipeline} disabled={activePipeline !== null}>
                {activePipeline ? (
                  <>
                    <Loader2 size={16} className="pulse-glow-status" style={{ animation: 'spin-slow 2s linear infinite' }} />
                    Running...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Trigger Release
                  </>
                )}
              </button>
            </div>

            {/* Pipeline Stage Visualizer (Dynamic SVG / Canvas-like layout) */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', padding: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                {/* Horizontal progress bar backdrop */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', top: '50%', height: 2, backgroundColor: 'hsl(var(--card-border))', zIndex: 0 }}></div>
                
                {/* Active progress bar highlight */}
                {activePipeline && (
                  <div style={{
                    position: 'absolute',
                    left: '10%',
                    width: `${Math.min(100, currentStageIndex * 20 + 10)}%`,
                    maxWidth: '80%',
                    top: '50%',
                    height: 2,
                    background: 'linear-gradient(to right, hsl(var(--success)), hsl(var(--secondary)))',
                    transition: 'width 0.5s ease',
                    zIndex: 0
                  }}></div>
                )}

                {pipelineStages.map((stage, idx) => {
                  const StageIcon = stage.icon;
                  const isCompleted = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isPending = idx > currentStageIndex && activePipeline !== null;

                  let borderCol = 'hsl(var(--card-border))';
                  let bgCol = 'hsl(var(--bg-darker))';
                  let iconCol = 'hsl(var(--text-muted))';
                  let textCol = 'hsl(var(--text-muted))';

                  if (isCompleted) {
                    borderCol = 'hsl(var(--success))';
                    bgCol = 'hsla(var(--success), 0.15)';
                    iconCol = 'hsl(var(--success))';
                    textCol = 'hsl(var(--text-main))';
                  } else if (isCurrent) {
                    borderCol = 'hsl(var(--primary))';
                    bgCol = 'hsla(var(--primary), 0.2)';
                    iconCol = 'hsl(var(--primary))';
                    textCol = 'hsl(var(--text-main))';
                  } else if (isPending) {
                    borderCol = 'hsl(var(--card-border))';
                    bgCol = 'hsl(var(--bg-darker))';
                    iconCol = 'hsl(var(--text-muted))';
                  }

                  return (
                    <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', zIndex: 1, width: '18%', position: 'relative' }}>
                      {/* Step Circle with Glass backdrop */}
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: bgCol,
                        border: `2px solid ${borderCol}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: isCurrent ? '0 0 15px hsla(var(--primary), 0.4)' : 'none',
                        animation: isCurrent ? 'pulse-glow 2s infinite' : 'none'
                      }} title={stage.description}>
                        <StageIcon size={20} color={iconCol} style={{ transition: 'all 0.3s ease' }} />
                      </div>
                      
                      {/* Label */}
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textCol, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {stage.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Terminal Console Output Logs */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="hsl(var(--secondary))" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>CI/CD Deployment Runner logs</h2>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Live Stream</span>
            </div>

            <div style={{
              flex: 1,
              backgroundColor: '#030712',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid hsl(var(--card-border))',
              padding: '1rem',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#34d399', // nice green text
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              maxHeight: 180
            }}>
              {terminalLogs.map((log, index) => (
                <div key={index} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{log}</div>
              ))}
              <div ref={terminalEndRef}></div>
            </div>
          </div>

        </section>

        {/* Row 2: Live Server Status Metrics & DevOps Tasks */}
        <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Kanban Task Board */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>DevOps Operations Pipeline Tasks</h2>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Assign and synchronize engineering tasks instantly</p>
              </div>
              <button className="btn-primary" onClick={() => setShowNewTaskModal(true)} style={{ padding: '0.5rem 1rem' }}>
                <Plus size={16} />
                Create Task
              </button>
            </div>

            {/* Kanban Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {(['todo', 'in-progress', 'review', 'done'] as const).map((column) => {
                const columnTasks = tasks.filter(t => t.status === column);
                const colLabels = {
                  'todo': { label: 'To Do', border: 'hsla(var(--primary), 0.2)', textCol: 'hsl(var(--text-main))' },
                  'in-progress': { label: 'Active Progress', border: 'hsla(var(--warning), 0.2)', textCol: 'hsl(var(--warning))' },
                  'review': { label: 'Code Review', border: 'hsla(var(--secondary), 0.2)', textCol: 'hsl(var(--secondary))' },
                  'done': { label: 'Production Deployed', border: 'hsla(var(--success), 0.2)', textCol: 'hsl(var(--success))' }
                };

                return (
                  <div key={column} style={{
                    background: 'hsla(223, 20%, 8%, 0.4)',
                    border: `1px solid ${colLabels[column].border}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    minHeight: 350,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colLabels[column].textCol }}>
                        {colLabels[column].label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--card-border))', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Task Stack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto' }}>
                      {loadingTasks ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, height: '100%' }}>
                          <Loader2 size={24} className="pulse-glow-status" style={{ animation: 'spin-slow 2s linear infinite' }} />
                        </div>
                      ) : columnTasks.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed hsl(var(--card-border))', borderRadius: 'var(--radius-sm)', flex: 1, padding: '2rem 0.5rem', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
                          Drag or create cards here
                        </div>
                      ) : (
                        columnTasks.map(task => (
                          <div key={task.id} style={{
                            backgroundColor: 'hsl(var(--bg-darker))',
                            border: '1px solid hsl(var(--card-border))',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            position: 'relative'
                          }}>
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <span className={`badge ${
                                task.priority === 'high' ? 'badge-error' : task.priority === 'medium' ? 'badge-warning' : 'badge-info'
                              }`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>
                                {task.priority}
                              </span>
                              <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--error))', cursor: 'pointer', opacity: 0.7, padding: '0.1rem' }} title="Delete Task">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Title & Desc */}
                            <div>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-main))', marginBottom: '0.2rem' }}>{task.title}</h4>
                              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: '1.3' }}>{task.description}</p>
                            </div>

                            {/* Assignee Footer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid hsl(var(--card-border))', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'hsl(var(--text-muted))', fontSize: '0.7rem' }}>
                                <User size={10} />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 90 }}>{task.assignee}</span>
                              </div>

                              {/* Column Navigator Buttons */}
                              <div style={{ display: 'flex', gap: '0.2rem' }}>
                                {column !== 'todo' && (
                                  <button onClick={() => handleUpdateTaskStatus(task.id, column === 'done' ? 'review' : column === 'review' ? 'in-progress' : 'todo')} style={{ background: 'hsla(223, 20%, 20%, 0.8)', border: 'none', color: 'hsl(var(--text-main))', width: 18, height: 18, borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ←
                                  </button>
                                )}
                                {column !== 'done' && (
                                  <button onClick={() => handleUpdateTaskStatus(task.id, column === 'todo' ? 'in-progress' : column === 'in-progress' ? 'review' : 'done')} style={{ background: 'hsla(var(--primary), 0.2)', border: 'none', color: 'hsl(var(--primary))', width: 18, height: 18, borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Infrastructure Metrics & Environment Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Health Metrics */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.5rem' }}>
                <Cpu size={18} color="hsl(var(--primary))" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Telemetry Metrics</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Environment Uptime</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{health.uptime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Database Cluster</span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                    {health.database}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Host Platform</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{health.system.platform}</span>
                </div>
                
                <div style={{ borderTop: '1px dashed hsl(var(--card-border))', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Memory Footprint (RSS)</span>
                  <div style={{ width: '100%', height: 6, backgroundColor: 'hsl(var(--card-border))', borderRadius: 999 }}>
                    <div style={{ width: '35%', height: '100%', backgroundColor: 'hsl(var(--primary))', borderRadius: 999 }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{health.system.memoryUsage.rss}</span>
                </div>
              </div>
            </div>

            {/* Pipeline History List */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.5rem' }}>
                <Clock size={18} color="hsl(var(--secondary))" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Pipeline History</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 200, overflowY: 'auto' }}>
                {loadingPipelines ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                    <Loader2 size={18} className="pulse-glow-status" style={{ animation: 'spin-slow 2s linear infinite' }} />
                  </div>
                ) : pipelines.map(run => (
                  <div key={run.id} style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid hsl(var(--card-border))',
                    backgroundColor: 'hsla(223, 20%, 8%, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontWeight: 700, color: 'hsl(var(--text-main))' }}>{run.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={run.commit}>{run.commit}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span className={`badge ${
                        run.status === 'success' ? 'badge-success' : run.status === 'failed' ? 'badge-error' : 'badge-warning'
                      }`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.3rem' }}>
                        {run.status}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>{run.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* Task Creation Modal */}
      {showNewTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div className="glass-card" style={{ padding: '2rem', width: '90%', maxWidth: 450, display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Create New DevOps Task</h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Instantly dispatch operational task boards to core engineers.</p>
            </div>

            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.3rem' }}>Task Title</label>
                <input className="form-input" type="text" placeholder="e.g. Write deploy hooks" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.3rem' }}>Task Description</label>
                <textarea className="form-textarea" rows={3} placeholder="Briefly specify operations scope..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.3rem' }}>Priority Level</label>
                  <select className="form-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.3rem' }}>Engineer Assignee</label>
                  <input className="form-input" type="text" placeholder="Assignee Name" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic footer status bar */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid hsl(var(--card-border))', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
        <span>DevFlow Suite © 2026. Built with React, TS, Express, & MongoDB.</span>
        <span>Environment Node: production-gateway-us-east-1</span>
      </footer>

    </div>
  );
}
