const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

// @route  GET /api/projects
// @desc   Get all projects for current user (owned or member)
// @access Private
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }]
    })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  POST /api/projects
// @desc   Create a new project
// @access Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, color, members } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required' });
    }

    const project = await Project.create({
      title,
      description,
      color: color || '#6366f1',
      owner: req.user._id,
      members: members || []
    });

    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('projectCreated', project);

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  GET /api/projects/:id
// @desc   Get single project
// @access Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check access
    const isMember = project.members.some(m => m._id.toString() === req.user._id.toString());
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  PUT /api/projects/:id
// @desc   Update a project
// @access Private (owner only)
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can update this project' });
    }

    const { title, description, status, color, members } = req.body;
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (color) project.color = color;
    if (members) project.members = members;

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route  DELETE /api/projects/:id
// @desc   Delete a project and all its tasks/comments
// @access Private (owner only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can delete this project' });
    }

    // Delete all tasks and comments related to project
    const Comment = require('../models/Comment');
    const Task = require('../models/Task');
    const tasks = await Task.find({ project: project._id });
    for (const task of tasks) {
      await Comment.deleteMany({ task: task._id });
    }
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
