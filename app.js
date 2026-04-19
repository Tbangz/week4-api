require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Joi = require('joi');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Fixed: cors() instead of cors('*')

// 1. Logging Middleware - Logs all incoming requests
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// In-Memory Data
let todos = [
  { id: 1, task: 'Finish Week 4 slides', completed: false },
  { id: 2, task: 'Deploy API (today!)', completed: true },
];

// 2. Validation Schema using Joi
const todoSchema = Joi.object({
  task: Joi.string().min(3).trim().required().messages({
    'string.min': 'Task must be at least 3 characters long',
    'string.empty': 'Task cannot be empty',
    'any.required': 'Task is required'
  }),
  completed: Joi.boolean()
});

// Helper to validate
const validateTodo = (req, res, next) => {
  const { error } = todoSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(err => err.message)
    });
  }
  
  next();
};

// GET ALL Todos
app.get('/todos', (req, res, next) => {
  try {
    res.status(200).json(todos);
  } catch (err) {
    next(err);
  }
});

// POST New Todo
app.post('/todos', validateTodo, (req, res, next) => {
  try {
    const { task } = req.body;
    
    const newTodo = {
      id: todos.length + 1,
      task: task.trim(),
      completed: false
    };
    
    todos.push(newTodo);
    res.status(201).json(newTodo);
  } catch (err) {
    next(err);
  }
});

// GET One Todo
app.get('/todos/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const todo = todos.find((t) => t.id === id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.status(200).json(todo);
  } catch (err) {
    next(err);
  }
});

// PATCH Update Todo
app.patch('/todos/:id', validateTodo, (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const todo = todos.find((t) => t.id === id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Only allow updating task and/or completed
    const updates = {};
    if (req.body.task !== undefined) updates.task = req.body.task.trim();
    if (req.body.completed !== undefined) updates.completed = req.body.completed;

    Object.assign(todo, updates);
    res.status(200).json(todo);
  } catch (err) {
    next(err);
  }
});

// DELETE Todo
app.delete('/todos/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const lenBefore = todos.length;
    todos = todos.filter((t) => t.id !== id);

    if (todos.length === lenBefore) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// 3. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3500;

app.listen(PORT, () => {
  console.log(`Todo API is running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}/todos`);
});