const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// Helper: check project access
const hasProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return false;
  const isOwner = project.owner.toString() === userId.toString();
  const isMember = project.members.some(m => m.toString() === userId.toString());
  return isOwner || isMember;
};

// @route  GET /api/comments/:taskId
// @desc   Get all comments for a task
// @access Private
router.get('/:taskId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await hasProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });

    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  POST /api/comments
// @desc   Add a comment to a task
// @access Private
router.post('/', protect, async (req, res) => {
  try {
    const { text, taskId } = req.body;

    if (!text || !taskId) {
      return res.status(400).json({ success: false, message: 'Text and taskId are required' });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await hasProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    const comment = await Comment.create({
      text,
      task: taskId,
      project: task.project,
      author: req.user._id
    });

    await comment.populate('author', 'name email');

    // Real-time update
    const io = req.app.get('io');
    io.to(task.project.toString()).emit('commentAdded', { comment, taskId });

    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  DELETE /api/comments/:id
// @desc   Delete a comment
// @access Private (comment author only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the author can delete this comment' });
    }

    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
