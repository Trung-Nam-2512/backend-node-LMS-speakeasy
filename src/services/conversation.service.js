const Conversation = require('../models/conversation');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

class ConversationService {
    /**
     * Tạo hội thoại mới
     * @param {Object} conversationData - Dữ liệu hội thoại
     * @param {string} userId - ID người tạo
     * @returns {Promise<Object>} Hội thoại đã tạo
     */
    static async createConversation(conversationData, userId) {
        const {
            title,
            description,
            topic,
            level,
            lines,
            duration,
            tags,
            difficulty
        } = conversationData;

        // Kiểm tra trùng lặp title
        const existingConversation = await Conversation.findOne({ title });
        if (existingConversation) {
            throw new AppError('Tiêu đề hội thoại đã tồn tại', 400, 'DUPLICATE_TITLE');
        }

        // Validate số lượng câu
        if (!lines || lines.length < 2 || lines.length > 10) {
            throw new AppError('Hội thoại phải có từ 2 đến 10 câu', 400, 'INVALID_LINES_COUNT');
        }

        // Validate nội dung không trùng lặp
        await this.validateUniqueContent(lines);

        // Tạo hội thoại mới
        const conversation = await Conversation.create({
            title,
            description,
            topic,
            level,
            lines,
            duration,
            tags,
            difficulty,
            createdBy: userId,
            lastModifiedBy: userId
        });

        return conversation;
    }

    /**
     * Lấy danh sách hội thoại với filters
     * @param {Object} filters - Bộ lọc
     * @param {Object} pagination - Phân trang
     * @returns {Promise<Object>} Danh sách hội thoại và metadata
     */
    static async getConversations(filters = {}, pagination = {}) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = pagination;

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const query = Conversation.findByFilters(filters);
        const conversations = await query
            .populate('creator', 'name email')
            .populate('lastModifier', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Conversation.countDocuments(query.getQuery());

        return {
            conversations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Lấy hội thoại theo ID
     * @param {string} conversationId - ID hội thoại
     * @returns {Promise<Object>} Hội thoại
     */
    static async getConversationById(conversationId) {
        const conversation = await Conversation.findById(conversationId)
            .populate('creator', 'name email')
            .populate('lastModifier', 'name email');

        if (!conversation) {
            throw new AppError('Hội thoại không tồn tại', 404, 'CONVERSATION_NOT_FOUND');
        }

        return conversation;
    }

    /**
     * Cập nhật hội thoại
     * @param {string} conversationId - ID hội thoại
     * @param {Object} updateData - Dữ liệu cập nhật
     * @param {string} userId - ID người cập nhật
     * @param {Array} userRoles - Vai trò người dùng
     * @returns {Promise<Object>} Hội thoại đã cập nhật
     */
    static async updateConversation(conversationId, updateData, userId, userRoles) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw new AppError('Hội thoại không tồn tại', 404, 'CONVERSATION_NOT_FOUND');
        }

        // Kiểm tra quyền chỉnh sửa
        if (!conversation.canEdit(userId, userRoles)) {
            throw new AppError('Bạn không có quyền chỉnh sửa hội thoại này', 403, 'INSUFFICIENT_PERMISSION');
        }

        // Kiểm tra trùng lặp title nếu có thay đổi
        if (updateData.title && updateData.title !== conversation.title) {
            const existingConversation = await Conversation.findOne({
                title: updateData.title,
                _id: { $ne: conversationId }
            });
            if (existingConversation) {
                throw new AppError('Tiêu đề hội thoại đã tồn tại', 400, 'DUPLICATE_TITLE');
            }
        }

        // Validate nội dung nếu có thay đổi
        if (updateData.lines) {
            if (updateData.lines.length < 2 || updateData.lines.length > 10) {
                throw new AppError('Hội thoại phải có từ 2 đến 10 câu', 400, 'INVALID_LINES_COUNT');
            }
            await this.validateUniqueContent(updateData.lines, conversationId);
        }

        // Cập nhật hội thoại
        Object.assign(conversation, updateData);
        conversation.lastModifiedBy = userId;

        await conversation.save();

        return conversation;
    }

    /**
     * Xóa hội thoại (soft delete)
     * @param {string} conversationId - ID hội thoại
     * @param {string} userId - ID người xóa
     * @param {Array} userRoles - Vai trò người dùng
     * @returns {Promise<boolean>} Kết quả xóa
     */
    static async deleteConversation(conversationId, userId, userRoles) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw new AppError('Hội thoại không tồn tại', 404, 'CONVERSATION_NOT_FOUND');
        }

        // Kiểm tra quyền xóa
        if (!conversation.canEdit(userId, userRoles)) {
            throw new AppError('Bạn không có quyền xóa hội thoại này', 403, 'INSUFFICIENT_PERMISSION');
        }

        // Soft delete
        conversation.isActive = false;
        conversation.lastModifiedBy = userId;
        await conversation.save();

        return true;
    }

    /**
     * Xóa vĩnh viễn hội thoại
     * @param {string} conversationId - ID hội thoại
     * @param {string} userId - ID người xóa
     * @param {Array} userRoles - Vai trò người dùng
     * @returns {Promise<boolean>} Kết quả xóa
     */
    static async permanentDeleteConversation(conversationId, userId, userRoles) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw new AppError('Hội thoại không tồn tại', 404, 'CONVERSATION_NOT_FOUND');
        }

        // Chỉ admin mới có quyền xóa vĩnh viễn
        if (!userRoles.includes('admin')) {
            throw new AppError('Chỉ admin mới có quyền xóa vĩnh viễn', 403, 'INSUFFICIENT_PERMISSION');
        }

        await Conversation.findByIdAndDelete(conversationId);
        return true;
    }

    /**
     * Khôi phục hội thoại đã xóa
     * @param {string} conversationId - ID hội thoại
     * @param {string} userId - ID người khôi phục
     * @param {Array} userRoles - Vai trò người dùng
     * @returns {Promise<Object>} Hội thoại đã khôi phục
     */
    static async restoreConversation(conversationId, userId, userRoles) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw new AppError('Hội thoại không tồn tại', 404, 'CONVERSATION_NOT_FOUND');
        }

        // Kiểm tra quyền khôi phục
        if (!conversation.canEdit(userId, userRoles)) {
            throw new AppError('Bạn không có quyền khôi phục hội thoại này', 403, 'INSUFFICIENT_PERMISSION');
        }

        conversation.isActive = true;
        conversation.lastModifiedBy = userId;
        await conversation.save();

        return conversation;
    }

    /**
     * Lấy thống kê hội thoại
     * @returns {Promise<Object>} Thống kê
     */
    static async getConversationStats() {
        const stats = await Conversation.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: ['$isActive', 1, 0] } },
                    inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
                    byLevel: {
                        $push: {
                            level: '$level',
                            isActive: '$isActive'
                        }
                    },
                    byTopic: {
                        $push: {
                            topic: '$topic',
                            isActive: '$isActive'
                        }
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                total: 0,
                active: 0,
                inactive: 0,
                byLevel: {},
                byTopic: {}
            };
        }

        const result = stats[0];

        // Thống kê theo level
        const levelStats = {};
        result.byLevel.forEach(item => {
            if (!levelStats[item.level]) {
                levelStats[item.level] = { total: 0, active: 0 };
            }
            levelStats[item.level].total++;
            if (item.isActive) levelStats[item.level].active++;
        });

        // Thống kê theo topic
        const topicStats = {};
        result.byTopic.forEach(item => {
            if (!topicStats[item.topic]) {
                topicStats[item.topic] = { total: 0, active: 0 };
            }
            topicStats[item.topic].total++;
            if (item.isActive) topicStats[item.topic].active++;
        });

        return {
            total: result.total,
            active: result.active,
            inactive: result.inactive,
            byLevel: levelStats,
            byTopic: topicStats
        };
    }

    /**
     * Validate nội dung không trùng lặp
     * @param {Array} lines - Danh sách câu hội thoại
     * @param {string} excludeId - ID hội thoại loại trừ (khi update)
     * @returns {Promise<void>}
     */
    static async validateUniqueContent(lines, excludeId = null) {
        const contentSet = new Set();

        for (const line of lines) {
            const content = line.content.toLowerCase().trim();

            // Kiểm tra trùng lặp trong cùng hội thoại
            if (contentSet.has(content)) {
                throw new AppError('Nội dung hội thoại bị trùng lặp', 400, 'DUPLICATE_CONTENT');
            }
            contentSet.add(content);
        }

        // Kiểm tra trùng lặp với hội thoại khác
        const contents = lines.map(line => line.content.toLowerCase().trim());
        const query = {
            'lines.content': { $in: contents }
        };

        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existingConversations = await Conversation.find(query);
        if (existingConversations.length > 0) {
            throw new AppError('Nội dung hội thoại đã tồn tại trong hệ thống', 400, 'DUPLICATE_CONTENT');
        }
    }

    /**
     * Tìm kiếm hội thoại theo từ khóa
     * @param {string} keyword - Từ khóa tìm kiếm
     * @param {Object} filters - Bộ lọc bổ sung
     * @returns {Promise<Array>} Danh sách hội thoại
     */
    static async searchConversations(keyword, filters = {}) {
        const searchFilters = {
            ...filters,
            search: keyword
        };

        const conversations = await Conversation.findByFilters(searchFilters)
            .populate('creator', 'name email')
            .populate('lastModifier', 'name email')
            .sort({ createdAt: -1 });

        return conversations;
    }

    /**
     * Lấy danh sách topics
     * @returns {Promise<Array>} Danh sách topics
     */
    static async getTopics() {
        const topics = await Conversation.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$topic', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $project: { _id: 0, name: '$_id', count: 1 } }
        ]);

        return topics;
    }
}

module.exports = ConversationService;
