import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const requiredEnvVars = [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'MONGO_URI'
];

const validateEnvironment = () => {
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate JWT secrets strength
  if (process.env.ACCESS_TOKEN_SECRET && process.env.ACCESS_TOKEN_SECRET.length < 32) {
    console.error('❌ ACCESS_TOKEN_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
    console.error('❌ REFRESH_TOKEN_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  // Validate MongoDB URI format
  if (process.env.MONGO_URI && !process.env.MONGO_URI.startsWith('mongodb://') && !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
    console.error('❌ MONGO_URI must be a valid MongoDB connection string');
    process.exit(1);
  }

  // Environment variables validated successfully
};

export { validateEnvironment };
