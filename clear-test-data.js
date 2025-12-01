const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/userSchema');
const Conversation = require('./src/models/conversation');

async function clearTestData() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/englishdb_nodejs');
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Clearing test data...');

        // Xóa users test
        const testUsers = await User.find({
            $or: [
                { email: /test/i },
                { username: /test/i },
                { name: /test/i }
            ]
        });

        if (testUsers.length > 0) {
            await User.deleteMany({
                _id: { $in: testUsers.map(u => u._id) }
            });
            console.log(`✅ Deleted ${testUsers.length} test users`);
        } else {
            console.log('ℹ️ No test users found');
        }

        // Xóa conversations test
        const testConversations = await Conversation.find({
            $or: [
                { title: /test/i },
                { description: /test/i },
                { topic: /test/i }
            ]
        });

        if (testConversations.length > 0) {
            await Conversation.deleteMany({
                _id: { $in: testConversations.map(c => c._id) }
            });
            console.log(`✅ Deleted ${testConversations.length} test conversations`);
        } else {
            console.log('ℹ️ No test conversations found');
        }

        console.log('✅ Test data cleared successfully');

    } catch (error) {
        console.error('❌ Error clearing test data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

clearTestData();
