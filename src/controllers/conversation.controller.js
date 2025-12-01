const ConversationService = require('../services/conversation.service');
const AppError = require('../utils/AppError');

// Wrapper function to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const ConversationController = {
    /**
     * Tạo hội thoại mới
     * POST /api/conversations
     */
    createConversation: asyncHandler(async (req, res) => {
        const conversationData = req.body;
        const userId = req.user.id;
        const userRoles = req.user.roles;

        // Kiểm tra quyền tạo hội thoại
        if (!userRoles.includes('admin') && !userRoles.includes('teacher')) {
            throw new AppError('Bạn không có quyền tạo hội thoại', 403, 'INSUFFICIENT_PERMISSION');
        }

        const conversation = await ConversationService.createConversation(conversationData, userId);

        res.status(201).json({
            success: true,
            message: 'Tạo hội thoại thành công',
            data: conversation
        });
    }),

    /**
     * Lấy danh sách hội thoại
     * GET /api/conversations
     */
    getConversations: asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            topic,
            level,
            isActive,
            tags,
            search
        } = req.query;

        const filters = {
            topic,
            level,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            tags: tags ? tags.split(',') : undefined,
            search
        };

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder
        };

        const result = await ConversationService.getConversations(filters, pagination);

        res.json({
            success: true,
            data: result.conversations,
            pagination: result.pagination
        });
    }),

    /**
     * Lấy hội thoại theo ID
     * GET /api/conversations/:id
     */
    getConversationById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const conversation = await ConversationService.getConversationById(id);

        res.json({
            success: true,
            data: conversation
        });
    }),

    /**
     * Cập nhật hội thoại
     * PUT /api/conversations/:id
     */
    updateConversation: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user.id;
        const userRoles = req.user.roles;

        const conversation = await ConversationService.updateConversation(
            id,
            updateData,
            userId,
            userRoles
        );

        res.json({
            success: true,
            message: 'Cập nhật hội thoại thành công',
            data: conversation
        });
    }),

    /**
     * Xóa hội thoại (soft delete)
     * DELETE /api/conversations/:id
     */
    deleteConversation: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles;

        await ConversationService.deleteConversation(id, userId, userRoles);

        res.json({
            success: true,
            message: 'Xóa hội thoại thành công'
        });
    }),

    /**
     * Xóa vĩnh viễn hội thoại
     * DELETE /api/conversations/:id/permanent
     */
    permanentDeleteConversation: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles;

        await ConversationService.permanentDeleteConversation(id, userId, userRoles);

        res.json({
            success: true,
            message: 'Xóa vĩnh viễn hội thoại thành công'
        });
    }),

    /**
     * Khôi phục hội thoại đã xóa
     * POST /api/conversations/:id/restore
     */
    restoreConversation: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles;

        const conversation = await ConversationService.restoreConversation(id, userId, userRoles);

        res.json({
            success: true,
            message: 'Khôi phục hội thoại thành công',
            data: conversation
        });
    }),

    /**
     * Lấy thống kê hội thoại
     * GET /api/conversations/stats
     */
    getConversationStats: asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const userRoles = req.user.roles;

        // Chỉ admin và teacher mới xem được thống kê
        if (!userRoles.includes('admin') && !userRoles.includes('teacher')) {
            throw new AppError('Bạn không có quyền xem thống kê', 403, 'INSUFFICIENT_PERMISSION');
        }

        const stats = await ConversationService.getConversationStats();

        res.json({
            success: true,
            data: stats
        });
    }),

    /**
     * Tìm kiếm hội thoại
     * GET /api/conversations/search
     */
    searchConversations: asyncHandler(async (req, res) => {
        const { q: keyword, topic, level, tags } = req.query;

        if (!keyword) {
            throw new AppError('Từ khóa tìm kiếm là bắt buộc', 400, 'MISSING_SEARCH_KEYWORD');
        }

        const filters = {
            topic,
            level,
            tags: tags ? tags.split(',') : undefined
        };

        const conversations = await ConversationService.searchConversations(keyword, filters);

        res.json({
            success: true,
            data: conversations,
            count: conversations.length
        });
    }),

    /**
     * Lấy danh sách topics
     * GET /api/conversations/topics
     */
    getTopics: asyncHandler(async (req, res) => {
        const topics = await ConversationService.getTopics();

        res.json({
            success: true,
            data: topics
        });
    }),

    /**
     * Lấy danh sách levels
     * GET /api/conversations/levels
     */
    getLevels: asyncHandler(async (req, res) => {
        const levels = [
            { value: 'beginner', label: 'Cơ bản' },
            { value: 'intermediate', label: 'Trung cấp' },
            { value: 'advanced', label: 'Nâng cao' }
        ];

        res.json({
            success: true,
            data: levels
        });
    }),

    /**
     * Tăng số lần sử dụng hội thoại
     * POST /api/conversations/:id/use
     */
    incrementUsage: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const conversation = await ConversationService.getConversationById(id);

        await conversation.incrementUsage();

        res.json({
            success: true,
            message: 'Cập nhật số lần sử dụng thành công'
        });
    })
};

module.exports = ConversationController;

