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

const Todo = mongoose.model('Todo', todoSchemaMongoose);