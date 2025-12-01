const mongoose = require('mongoose');

// Schema cho từng câu trong hội thoại
const conversationLineSchema = new mongoose.Schema({
    speaker: {
        type: String,
        required: true,
        enum: ['A', 'B'], // Người A hoặc người B
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    translation: {
        type: String,
        trim: true,
        maxlength: 500
    },
    audioUrl: {
        type: String,
        trim: true
    },
    order: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });

// Schema chính cho hội thoại
const conversationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    topic: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    level: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    lines: {
        type: [conversationLineSchema],
        required: true,
        validate: {
            validator: function (lines) {
                return lines.length >= 2 && lines.length <= 10;
            },
            message: 'Hội thoại phải có từ 2 đến 10 câu'
        }
    },
    totalLines: {
        type: Number,
        required: true,
        min: 2,
        max: 10,
        default: 10
    },
    duration: {
        type: Number, // Thời gian ước tính (phút)
        min: 1,
        max: 60
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    usageCount: {
        type: Number,
        default: 0
    },
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
        default: 1
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes cho performance
conversationSchema.index({ title: 1 }, { unique: true });
conversationSchema.index({ topic: 1 });
conversationSchema.index({ level: 1 });
conversationSchema.index({ isActive: 1 });
conversationSchema.index({ createdBy: 1 });
conversationSchema.index({ tags: 1 });
conversationSchema.index({ createdAt: -1 });

// Virtual để lấy thông tin người tạo
conversationSchema.virtual('creator', {
    ref: 'User',
    localField: 'createdBy',
    foreignField: '_id',
    justOne: true
});

// Virtual để lấy thông tin người sửa cuối
conversationSchema.virtual('lastModifier', {
    ref: 'User',
    localField: 'lastModifiedBy',
    foreignField: '_id',
    justOne: true
});

// Pre-save middleware để tự động cập nhật totalLines
conversationSchema.pre('save', function (next) {
    if (this.lines && this.lines.length > 0) {
        this.totalLines = this.lines.length;

        // Sắp xếp lines theo order
        this.lines.sort((a, b) => a.order - b.order);

        // Cập nhật order nếu cần
        this.lines.forEach((line, index) => {
            line.order = index + 1;
        });
    }
    next();
});

// Pre-save middleware để kiểm tra trùng lặp nội dung
conversationSchema.pre('save', async function (next) {
    if (this.isModified('lines')) {
        const contentSet = new Set();
        for (const line of this.lines) {
            const content = line.content.toLowerCase().trim();
            if (contentSet.has(content)) {
                return next(new Error('Nội dung hội thoại bị trùng lặp'));
            }
            contentSet.add(content);
        }
    }
    next();
});

// Static method để tìm kiếm hội thoại
conversationSchema.statics.findByFilters = function (filters = {}) {
    const query = {};

    if (filters.topic) {
        query.topic = new RegExp(filters.topic, 'i');
    }

    if (filters.level) {
        query.level = filters.level;
    }

    if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
    }

    if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
    }

    if (filters.search) {
        query.$or = [
            { title: new RegExp(filters.search, 'i') },
            { description: new RegExp(filters.search, 'i') }
        ];
    }

    return this.find(query);
};

// Instance method để cập nhật usage count
conversationSchema.methods.incrementUsage = function () {
    this.usageCount += 1;
    return this.save();
};

// Instance method để kiểm tra quyền chỉnh sửa
conversationSchema.methods.canEdit = function (userId, userRoles) {
    return userRoles.includes('admin') ||
        (userRoles.includes('teacher') && this.createdBy.toString() === userId.toString());
};

module.exports = mongoose.model('Conversation', conversationSchema);

