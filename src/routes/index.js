const { Router } = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const conversationRoutes = require('./conversation.routes');

const router = Router();

// Authentication routes
router.use('/auth', authRoutes);

// Learning platform routes
router.use('/courses', courseRoutes);

// Conversation management routes
router.use('/conversations', conversationRoutes);

module.exports = router;
