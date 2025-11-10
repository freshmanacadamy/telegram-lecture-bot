const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const config = require('./config');

// Initialize bot
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Import database first to initialize tables
require('./database');

// Import handlers
const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');
const lectureHandlers = require('./handlers/lectureHandlers');

// Initialize all handlers
userHandlers(bot);
adminHandlers(bot);
lectureHandlers(bot);

// Express server for health checks (required by Render)
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Bot is running',
    botStopped: config.botStopped,
    users: 'Active',
    lectures: 'Managed',
    timestamp: new Date().toISOString(),
    platform: 'Jimma University Lecture Bot'
  });
});

// Bot status endpoint
app.get('/status', (req, res) => {
  res.json({
    bot: config.botStopped ? 'STOPPED' : 'RUNNING',
    admins: config.ADMIN_IDS.length,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║      JIMMA UNIVERSITY BOT SERVER     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Bot Status: ${config.botStopped ? '🟥 STOPPED' : '🟢 ACTIVE'}`);
  console.log(`👨‍💼 Admin IDs: ${config.ADMIN_IDS.join(', ')}`);
  console.log(`📊 Database: Initialized`);
  console.log(`🔗 Health Check: http://localhost:${PORT}`);
  console.log('════════════════════════════════════════');
});

// Enhanced error handling
bot.on('error', (error) => {
  console.error('🔴 Bot Error:', error);
});

bot.on('polling_error', (error) => {
  console.error('🔴 Polling Error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('🔴 Webhook Error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot gracefully...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  bot.stopPolling();
  process.exit(0);
});

console.log('✅ Telegram Lecture Bot started successfully!');
