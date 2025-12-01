class AppError extends Error {
    /**
     * Tạo một error với các thông tin tùy chỉnh
     * @param {object} options - Các thông tin muốn trả về cho client
     * @param {number} statusCode - HTTP status code (không trả về cho client)
     * 
     * Ví dụ:
     * new AppError({
     *   error: 'Lỗi đăng nhập',
     *   code: 'LOGIN_FAILED',
     *   errorCode: 410,        // Mã lỗi tự định nghĩa
     *   data: { ... },        // Data tùy chỉnh
     *   details: [ ... ],     // Chi tiết lỗi
     *   anyField: 'anything'  // Bất kỳ field nào
     * }, 401)
     */
    constructor(options = {}, statusCode = 500) {
        super(options.error || options.message || 'Internal Error');

        // HTTP status code để set response status
        this.statusCode = statusCode;

        // Lưu tất cả options để trả về client
        this.responseData = options;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }    /**
     * Tạo lỗi Bad Request (400)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static badRequest(message, code = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }

    /**
     * Tạo lỗi Unauthorized (401)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    /**
     * Tạo lỗi Forbidden (403)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    /**
     * Tạo lỗi Not Found (404)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static notFound(message = 'Not Found', code = 'NOT_FOUND') {
        return new AppError(message, 404, code);
    }

    /**
     * Tạo lỗi Conflict (409)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static conflict(message, code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }

    /**
     * Tạo lỗi Locked (423)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static locked(message, code = 'LOCKED') {
        return new AppError(message, 423, code);
    }

    /**
     * Tạo lỗi Validation (422)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static validation(message, code = 'VALIDATION_ERROR') {
        return new AppError(message, 422, code);
    }

    /**
     * Tạo lỗi Rate Limit (429)
     * @param {string} message - Thông báo lỗi
     * @param {string} code - Mã lỗi tùy chỉnh
     */
    static rateLimit(message = 'Too Many Requests', code = 'RATE_LIMIT') {
        return new AppError(message, 429, code);
    }

    /**
     * Chuyển đổi lỗi thành response format tùy chỉnh
     */
    toJSON() {
        return this.responseData;
    }
}

module.exports = AppError;