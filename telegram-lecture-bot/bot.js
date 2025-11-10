const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const config = require('./config');

// Initialize bot
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Import handlers
require('./database'); // Initialize database
const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');

// Initialize handlers
userHandlers(bot);
adminHandlers(bot);

// Express server for health checks (required by Render)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'Bot is running',
    botStopped: config.botStopped,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
  console.log(`🤖 Bot ${config.botStopped ? 'STOPPED' : 'ACTIVE'}`);
  console.log(`👨‍💼 Admins: ${config.ADMIN_IDS.join(', ')}`);
});

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ Telegram Lecture Bot started successfully!');
