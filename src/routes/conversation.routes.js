const { Router } = require('express');
const ConversationController = require('../controllers/conversation.controller');
const AuthGuard = require('../middlewares/auth.guard');
const RoleGuard = require('../middlewares/role.guard');
const validate = require('../middlewares/validate');
const conversationValidation = require('../validations/conversation.validation');
const rateLimiter = require('../middlewares/rateLimiter');

const router = Router();

// Middleware xác thực cho tất cả routes
router.use(AuthGuard.guard);

// Routes cho quản lý hội thoại
router.post('/',
    RoleGuard.requireRoles(['admin', 'teacher']),
    validate(conversationValidation.create),
    ConversationController.createConversation
);

router.get('/',
    RoleGuard.requireRoles(['admin', 'teacher', 'student']),
    validate(conversationValidation.query, 'query'),
    ConversationController.getConversations
);

router.get('/stats',
    RoleGuard.requireRoles(['admin', 'teacher']),
    ConversationController.getConversationStats
);

router.get('/topics',
    RoleGuard.requireRoles(['admin', 'teacher', 'student']),
    ConversationController.getTopics
);

router.get('/levels',
    RoleGuard.requireRoles(['admin', 'teacher', 'student']),
    ConversationController.getLevels
);

router.get('/search',
    RoleGuard.requireRoles(['admin', 'teacher', 'student']),
    validate(conversationValidation.search, 'query'),
    ConversationController.searchConversations
);

// Routes cho hội thoại cụ thể
router.get('/:id',
    RoleGuard.requireRoles(['admin', 'teacher', 'student']),
    validate(conversationValidation.id, 'params'),
    ConversationController.getConversationById
);

router.put('/:id',
    RoleGuard.requireRoles(['admin', 'teacher']),
    validate(conversationValidation.id, 'params'),
    validate(conversationValidation.update),
    ConversationController.updateConversation
);

router.delete('/:id',
    RoleGuard.requireRoles(['admin', 'teacher']),
    validate(conversationValidation.id, 'params'),
    ConversationController.deleteConversation
);

router.delete('/:id/permanent',
    RoleGuard.requireRoles(['admin']),
    validate(conversationValidation.id, 'params'),
    ConversationController.permanentDeleteConversation
);

router.post('/:id/restore',
    RoleGuard.requireRoles(['admin', 'teacher']),
    validate(conversationValidation.id, 'params'),
    ConversationController.restoreConversation
);

router.post('/:id/use',
    RoleGuard.requireRoles(['admin', 'teacher', 'student']),
    validate(conversationValidation.id, 'params'),
    rateLimiter.createAccountLimiter, // Giới hạn số lần sử dụng
    ConversationController.incrementUsage
);

module.exports = router;

