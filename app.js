require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const mongoose = require('mongoose');

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

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });


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

const todoSchemaMongoose = new mongoose.Schema({
  task: {
    type: String,
    required: true,
    minlength: 3,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Todo = mongoose.model('Todo', todoSchemaMongoose); // ✅ THIS LINE FIXES YOUR ERROR

// GET ALL Todos
app.get('/todos', async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.completed !== undefined) {
      filter.completed = req.query.completed === 'true';
    }

    const todos = await Todo.find(filter);
    res.status(200).json(todos);
  } catch (err) {
    next(err);
  }
});

// POST New Todo
app.post('/todos', validateTodo, async (req, res, next) => {
  try {
    const todo = new Todo({
      task: req.body.task
    });

    const saved = await todo.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// GET One Todo
app.get('/todos', async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.completed !== undefined) {
      filter.completed = req.query.completed === 'true';
    }

    const todos = await Todo.find(filter);
    res.status(200).json(todos);
  } catch (err) {
    next(err);
  }
});

// PATCH Update Todo
app.patch('/todos/:id', async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.task !== undefined) updates.task = req.body.task;
    if (req.body.completed !== undefined) updates.completed = req.body.completed;

    const updated = await Todo.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE Todo
app.delete('/todos/:id', async (req, res, next) => {
  try {
    const deleted = await Todo.findByIdAndDelete(req.params.id);

    if (!deleted) {
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