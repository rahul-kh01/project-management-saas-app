/**
 * Test Users Creation Script
 * 
 * This script creates test users for each role in the system.
 * Run this AFTER the backend is running and MongoDB is connected.
 * 
 * Usage: node create-test-users.js
 */

import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User Schema
const userSchema = new mongoose.Schema({
  avatar: {
    type: {
      url: String,
      localPath: String,
    },
    default: {
      url: `https://placehold.co/200x200`,
      localPath: "",
    },
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
  },
  forgotPasswordToken: {
    type: String,
  },
  forgotPasswordExpiry: {
    type: Date,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpiry: {
    type: Date,
  },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

// Test users data
const testUsers = [
  {
    email: 'admin@projectcamp.com',
    username: 'admin',
    password: 'Admin123!',
    fullName: 'Admin User',
    role: 'Admin (will be assigned when creating projects)'
  },
  {
    email: 'projectadmin@projectcamp.com',
    username: 'projectadmin',
    password: 'ProjectAdmin123!',
    fullName: 'Project Admin User',
    role: 'Project Admin (assigned per project)'
  },
  {
    email: 'member@projectcamp.com',
    username: 'member',
    password: 'Member123!',
    fullName: 'Member User',
    role: 'Member (assigned per project)'
  },
  {
    email: 'demo@projectcamp.com',
    username: 'demo',
    password: 'Demo123!',
    fullName: 'Demo User',
    role: 'For general testing'
  }
];

async function createTestUsers() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('👥 Creating test users...\n');
    
    const createdUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [{ email: userData.email }, { username: userData.username }]
        });

        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email}`);
          console.log(`   You can still login with:`);
          console.log(`   Email: ${userData.email}`);
          console.log(`   Password: ${userData.password}\n`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const newUser = await User.create({
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          fullName: userData.fullName,
          isEmailVerified: true, // Auto-verify for test users
          avatar: {
            url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`,
            localPath: ""
          }
        });

        createdUsers.push({
          email: userData.email,
          password: userData.password,
          role: userData.role
        });

        console.log(`✅ Created: ${userData.fullName}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Role: ${userData.role}\n`);

      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  User already exists: ${userData.email}\n`);
        } else {
          console.error(`❌ Error creating ${userData.email}:`, error.message);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST USERS SUMMARY');
    console.log('='.repeat(60) + '\n');

    if (createdUsers.length > 0) {
      console.log('✅ Successfully created users:\n');
      createdUsers.forEach(user => {
        console.log(`📧 ${user.email}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Role: ${user.role}\n`);
      });
    } else {
      console.log('ℹ️  No new users created (all already exist)\n');
      console.log('Existing test credentials:\n');
      testUsers.forEach(user => {
        console.log(`📧 ${user.email}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Role: ${user.role}\n`);
      });
    }

    console.log('='.repeat(60));
    console.log('\n🚀 NEXT STEPS:\n');
    console.log('1. Open your browser: http://localhost:5173');
    console.log('2. Click "Sign In"');
    console.log('3. Login with any of the credentials above');
    console.log('4. Create a project to assign roles');
    console.log('\n📚 For more information, see: USER_CREDENTIALS_GUIDE.md\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  MongoDB connection failed!');
      console.log('Make sure MongoDB is running:');
      console.log('  - macOS: brew services start mongodb-community');
      console.log('  - Ubuntu: sudo systemctl start mongod');
      console.log('  - Or use MongoDB Atlas (update MONGO_URI in .env)\n');
    }
  } finally {
    await mongoose.connection.close();
    console.log('👋 Done!\n');
    process.exit(0);
  }
}

// Run the script
createTestUsers();

