const AuthService = require('../services/auth.service');
const EmailService = require('../services/email.service');
const passport = require('passport');

const AppError = require('../utils/AppError');

// Wrapper function to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const AuthController = {
    register: asyncHandler(async (req, res) => {
        const { email, password, name, username, phone } = req.body;
        const result = await AuthService.register({ email, password, name, username, phone });
        res.status(201).json(result);
    }),

    login: asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const ip = req.ip || req.connection.remoteAddress;
        const result = await AuthService.login({ email, password, ip });
        res.json(result);
    }),
    refresh: asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw AppError.badRequest('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
        }
        const out = await AuthService.refresh({ token: refreshToken });
        res.json({
            success: true,
            data: out
        });
    }),

    logout: asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw AppError.badRequest('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
        }
        await AuthService.logout({ userId: req.user.id, token: refreshToken });
        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    }),

    me: asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: { user: req.user }
        });
    }),

    changePassword: asyncHandler(async (req, res) => {
        const { oldPass, newPass } = req.body;
        if (!oldPass || !newPass) {
            throw AppError.badRequest('Thiếu thông tin mật khẩu', 'MISSING_PASSWORD_INFO');
        }
        await AuthService.changePassword({ userId: req.user.id, oldPass, newPass });
        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    }),

    forgotPassword: asyncHandler(async (req, res) => {
        const { email } = req.body;
        await AuthService.forgotPassword(email);
        res.json({
            success: true,
            message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'
        });
    }),

    resetPassword: asyncHandler(async (req, res) => {
        const { token, newPassword } = req.body;
        await AuthService.resetPassword(token, newPassword);
        res.json({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công.'
        });
    }),

    verifyEmail: asyncHandler(async (req, res) => {
        const { token } = req.body;
        await AuthService.verifyEmail(token);
        res.json({
            success: true,
            message: 'Email đã được xác thực thành công.'
        });
    }),

    resendVerification: asyncHandler(async (req, res) => {
        await AuthService.resendVerification(req.user.id);
        res.json({
            success: true,
            message: 'Email xác thực đã được gửi lại.'
        });
    }),

    listSessions: asyncHandler(async (req, res) => {
        const sessions = await AuthService.listActiveSessions(req.user.id);
        res.json({ sessions });
    }),

    logoutAll: asyncHandler(async (req, res) => {
        await AuthService.logout({
            userId: req.user.id,
            all: true
        });
        res.json({
            success: true,
            message: 'Đã đăng xuất khỏi tất cả các thiết bị.'
        });
    }),

    terminateSession: asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        await AuthService.terminateSession(req.user.id, sessionId);
        res.json({
            success: true,
            message: 'Phiên đăng nhập đã được kết thúc.'
        });
    }),

    // Google OAuth routes
    googleAuth: passport.authenticate('google', {
        scope: ['profile', 'email']
    }),

    googleCallback: asyncHandler(async (req, res) => {
        try {
            // req.user contains Google profile from passport
            if (!req.user) {
                throw new AppError('Không nhận được thông tin từ Google', 400, 'GOOGLE_AUTH_ERROR');
            }

            // Process Google authentication and get tokens
            const result = await AuthService.googleAuth(req.user);

            // Redirect to frontend with tokens or return JSON
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;

            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const errorMessage = encodeURIComponent(error.message || 'Đăng nhập Google thất bại');
            res.redirect(`${frontendUrl}/auth/error?message=${errorMessage}`);
        }
    })
};

module.exports = AuthController;
