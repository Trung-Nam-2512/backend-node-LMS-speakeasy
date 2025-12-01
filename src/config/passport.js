const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');

const initializePassport = () => {
    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    // Load Google OAuth credentials from environment variables only
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback';

    // Google OAuth Strategy - chỉ đăng ký nếu có credentials từ environment
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email']
        }, (accessToken, refreshToken, profile, done) => {
            // The logic for finding or creating a user should be in the auth service.
            // Here, we just pass the Google profile to the next step.
            return done(null, profile);
        }));
        console.log('✅ Google OAuth strategy registered');
    } else {
        console.log('⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }
};

module.exports = initializePassport;