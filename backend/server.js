const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('dotenv').config();

// Create Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Winston logger setup for professional DevOps logs
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Middleware
app.use(cors());
app.use(express.json());

// Hybrid Storage System
let useLocalDb = false;
const LOCAL_DB_PATH = path.join(__dirname, 'local_db.json');

// Mongoose Schemas (if MongoDB is available)
let TaskModel;
let PipelineModel;

const defaultTasks = [
  { id: '1', title: 'Configure docker-compose files', description: 'Set up local multi-container dev environment orchestration.', status: 'todo', priority: 'high', assignee: 'DevOps Lead' },
  { id: '2', title: 'Write GitHub Actions CI pipeline', description: 'Automate linting, testing, and Docker image pushing.', status: 'in-progress', priority: 'high', assignee: 'CI Engineer' },
  { id: '3', title: 'Configure Nginx reverse proxy', description: 'Route static assets and backend API endpoints smoothly.', status: 'done', priority: 'medium', assignee: 'SysAdmin' },
  { id: '4', title: 'Setup AWS EC2 instances & Security Groups', description: 'Deploy the application to AWS and manage standard security guidelines.', status: 'todo', priority: 'high', assignee: 'Cloud Architect' }
];

const defaultPipelines = [
  { id: 'p1', name: 'DevFlow Production CD', commit: 'feat: add pipeline visualization (#34)', author: 'Jane Doe', status: 'success', duration: '120s', startedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'p2', name: 'DevFlow Staging Build', commit: 'fix: database connection retry delay', author: 'John Smith', status: 'failed', duration: '45s', startedAt: new Date(Date.now() - 7200000).toISOString() }
];

// Helper to manage Local JSON File DB
function readLocalDb() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initialData = { tasks: defaultTasks, pipelines: defaultPipelines };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    logger.error('Failed to read local DB file. Falling back to in-memory store.');
    return { tasks: defaultTasks, pipelines: defaultPipelines };
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error(`Failed to write local DB file: ${err.message}`);
  }
}

// Database Connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/devflow';
logger.info(`Attempting to connect to MongoDB at: ${mongoUri}`);

mongoose.connect(mongoUri)
  .then(() => {
    logger.info('Successfully connected to MongoDB.');
    
    // Define Schemas
    const taskSchema = new mongoose.Schema({
      title: { type: String, required: true },
      description: { type: String },
      status: { type: String, enum: ['todo', 'in-progress', 'review', 'done'], default: 'todo' },
      priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      assignee: { type: String, default: 'Unassigned' }
    }, { timestamps: true });

    const pipelineSchema = new mongoose.Schema({
      name: { type: String, required: true },
      commit: { type: String },
      author: { type: String },
      status: { type: String, enum: ['success', 'failed', 'running', 'pending'], default: 'pending' },
      duration: { type: String },
      startedAt: { type: Date, default: Date.now }
    }, { timestamps: true });

    TaskModel = mongoose.model('Task', taskSchema);
    PipelineModel = mongoose.model('Pipeline', pipelineSchema);
  })
  .catch(err => {
    logger.warn(`MongoDB Connection Failed: ${err.message}. Switching to robust Local JSON Database fallback.`);
    useLocalDb = true;
  });

// --- API ROUTES ---

// 1. HEALTH CHECK ENDPOINT
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(0)}s`,
    database: useLocalDb ? 'LOCAL_JSON_FALLBACK' : 'MONGODB_CONNECTED',
    system: {
      platform: process.platform,
      memoryUsage: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      }
    }
  };
  res.status(200).json(healthStatus);
});

// 2. DEV-TASKS ENDPOINTS

// Get All Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    if (useLocalDb) {
      const db = readLocalDb();
      res.json(db.tasks);
    } else {
      const tasks = await TaskModel.find();
      // Format to ensure front-end consistency (id vs _id)
      const formatted = tasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee
      }));
      res.json(formatted);
    }
  } catch (err) {
    logger.error(`Error fetching tasks: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create New Task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status, priority, assignee } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (useLocalDb) {
      const db = readLocalDb();
      const newTask = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        description: description || '',
        status: status || 'todo',
        priority: priority || 'medium',
        assignee: assignee || 'Unassigned'
      };
      db.tasks.push(newTask);
      writeLocalDb(db);
      logger.info(`Task created successfully (Local DB): ${title}`);
      res.status(201).json(newTask);
    } else {
      const newTask = new TaskModel({ title, description, status, priority, assignee });
      await newTask.save();
      logger.info(`Task created successfully (MongoDB): ${title}`);
      res.status(201).json({
        id: newTask._id.toString(),
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignee: newTask.assignee
      });
    }
  } catch (err) {
    logger.error(`Error creating task: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignee } = req.body;

    if (useLocalDb) {
      const db = readLocalDb();
      const taskIndex = db.tasks.findIndex(t => t.id === id);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      db.tasks[taskIndex] = {
        ...db.tasks[taskIndex],
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignee && { assignee })
      };
      
      writeLocalDb(db);
      logger.info(`Task updated successfully (Local DB): ${id}`);
      res.json(db.tasks[taskIndex]);
    } else {
      const updated = await TaskModel.findByIdAndUpdate(
        id,
        { title, description, status, priority, assignee },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'Task not found' });
      }
      logger.info(`Task updated successfully (MongoDB): ${id}`);
      res.json({
        id: updated._id.toString(),
        title: updated.title,
        description: updated.description,
        status: updated.status,
        priority: updated.priority,
        assignee: updated.assignee
      });
    }
  } catch (err) {
    logger.error(`Error updating task: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (useLocalDb) {
      const db = readLocalDb();
      const initialLen = db.tasks.length;
      db.tasks = db.tasks.filter(t => t.id !== id);
      
      if (db.tasks.length === initialLen) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      writeLocalDb(db);
      logger.info(`Task deleted successfully (Local DB): ${id}`);
      res.json({ message: 'Task deleted successfully' });
    } else {
      const deleted = await TaskModel.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }
      logger.info(`Task deleted successfully (MongoDB): ${id}`);
      res.json({ message: 'Task deleted successfully' });
    }
  } catch (err) {
    logger.error(`Error deleting task: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PIPELINE HISTORY ENDPOINTS

// Get Pipeline History
app.get('/api/pipelines', async (req, res) => {
  try {
    if (useLocalDb) {
      const db = readLocalDb();
      res.json(db.pipelines);
    } else {
      const runs = await PipelineModel.find().sort({ startedAt: -1 });
      const formatted = runs.map(r => ({
        id: r._id.toString(),
        name: r.name,
        commit: r.commit,
        author: r.author,
        status: r.status,
        duration: r.duration,
        startedAt: r.startedAt.toISOString()
      }));
      res.json(formatted);
    }
  } catch (err) {
    logger.error(`Error fetching pipelines: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Trigger Simulated Pipeline Run
app.post('/api/pipelines/trigger', async (req, res) => {
  try {
    const { name, commit, author } = req.body;
    const pipelineName = name || 'DevFlow Dev CI';
    const commitMsg = commit || 'docs: update deployment architecture diagram';
    const commitAuthor = author || 'DevOps Engineer';

    let newRun;
    if (useLocalDb) {
      const db = readLocalDb();
      newRun = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        name: pipelineName,
        commit: commitMsg,
        author: commitAuthor,
        status: 'running',
        duration: '...',
        startedAt: new Date().toISOString()
      };
      db.pipelines.unshift(newRun);
      writeLocalDb(db);
    } else {
      const modelRun = new PipelineModel({
        name: pipelineName,
        commit: commitMsg,
        author: commitAuthor,
        status: 'running',
        duration: '...'
      });
      await modelRun.save();
      newRun = {
        id: modelRun._id.toString(),
        name: modelRun.name,
        commit: modelRun.commit,
        author: modelRun.author,
        status: modelRun.status,
        duration: modelRun.duration,
        startedAt: modelRun.startedAt.toISOString()
      };
    }

    logger.info(`Pipeline execution started: [${newRun.id}] - ${pipelineName}`);

    // Non-blocking simulated pipeline execution that updates the status in local memory / MongoDB
    let durationSec = 0;
    const interval = setInterval(async () => {
      durationSec += 2;
      const isComplete = durationSec >= 10; // Takes 10 seconds total to simulate
      const currentStatus = isComplete ? 'success' : 'running';
      const finalDuration = isComplete ? `${durationSec}s` : '...';

      if (useLocalDb) {
        const db = readLocalDb();
        const runIndex = db.pipelines.findIndex(p => p.id === newRun.id);
        if (runIndex !== -1) {
          db.pipelines[runIndex].status = currentStatus;
          db.pipelines[runIndex].duration = finalDuration;
          writeLocalDb(db);
        }
      } else {
        await PipelineModel.findByIdAndUpdate(newRun.id, {
          status: currentStatus,
          duration: finalDuration
        });
      }

      if (isComplete) {
        clearInterval(interval);
        logger.info(`Pipeline execution successfully finished: [${newRun.id}]`);
      }
    }, 2000);

    res.status(202).json(newRun);
  } catch (err) {
    logger.error(`Error triggering pipeline: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start listening
app.listen(PORT, () => {
  logger.info(`DevFlow DevOps API running on http://localhost:${PORT}`);
});
