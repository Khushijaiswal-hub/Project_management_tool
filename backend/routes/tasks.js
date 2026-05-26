const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// Helper: check if user has project access
const hasProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { access: false, project: null };
  const isOwner = project.owner.toString() === userId.toString();
  const isMember = project.members.some(m => m.toString() === userId.toString());
  return { access: isOwner || isMember, project };
};

// @route  GET /api/tasks/:projectId
// @desc   Get all tasks for a project
// @access Private
router.get('/:projectId', protect, async (req, res) => {
  try {
    const { access } = await hasProjectAccess(req.params.projectId, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  POST /api/tasks
// @desc   Create a new task
// @access Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, project, assignedTo, priority, dueDate, status } = req.body;

    if (!title || !project) {
      return res.status(400).json({ success: false, message: 'Title and project are required' });
    }

    const { access } = await hasProjectAccess(project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      status: status || 'todo'
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    // Real-time update
    const io = req.app.get('io');
    io.to(project).emit('taskCreated', task);

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  PUT /api/tasks/:id
// @desc   Update a task (status, assignment, etc.)
// @access Private
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { access } = await hasProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    const { title, description, status, priority, assignedTo, dueDate, order } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (order !== undefined) task.order = order;

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    // Real-time update
    const io = req.app.get('io');
    io.to(task.project.toString()).emit('taskUpdated', task);

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  DELETE /api/tasks/:id
// @desc   Delete a task
// @access Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { access, project } = await hasProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    // Only owner of project or task creator can delete
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    if (!isOwner && !isCreator) {
      return res.status(403).json({ success: false, message: 'Only the task creator or project owner can delete this task' });
    }

    // Delete comments for this task
    const Comment = require('../models/Comment');
    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();

    // Real-time update
    const io = req.app.get('io');
    io.to(task.project.toString()).emit('taskDeleted', { taskId: req.params.id });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
