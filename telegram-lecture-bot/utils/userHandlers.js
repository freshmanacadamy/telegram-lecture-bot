const { dbHelpers } = require('../database');
const keyboards = require('../utils/keyboards');
const config = require('../config');

// Track user states for conversation flow
const userStates = new Map();

module.exports = function(bot) {
  // Start command
  bot.onText(/\/start/, async (msg) => {
    if (config.botStopped && !config.ADMIN_IDS.includes(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, 
        "🔧 Bot is currently under maintenance. Please try again later.",
        keyboards.backHomeButtons()
      );
    }

    const user = await dbHelpers.getUser(msg.from.id);
    if (!user) {
      await dbHelpers.createUser(msg.from);
    }

    const welcomeMsg = `🎓 Welcome to Jimma University Lecture Registration Bot!

I help connect senior students who want to teach with freshmen who want to learn.

Choose an option below:`;

    if (config.ADMIN_IDS.includes(msg.from.id)) {
      bot.sendMessage(msg.chat.id, `👨‍💼 ADMIN PANEL\n\n${welcomeMsg}`, keyboards.adminMenu());
    } else {
      bot.sendMessage(msg.chat.id, welcomeMsg, keyboards.mainMenu());
    }
  });

  // Handle callback queries
  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    // Home button - always works
    if (data === 'home') {
      if (config.ADMIN_IDS.includes(userId)) {
        await bot.editMessageText(`👨‍💼 ADMIN PANEL\n\nWelcome back!`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: keyboards.adminMenu().reply_markup
        });
      } else {
        await bot.editMessageText(`🎓 Welcome back!\n\nChoose an option:`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: keyboards.mainMenu().reply_markup
        });
      }
      return;
    }

    // Back button
    if (data === 'back') {
      await bot.editMessageText(`Returning to previous menu...`, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        reply_markup: keyboards.mainMenu().reply_markup
      });
      return;
    }

    // Check if bot is stopped for non-admins
    if (config.botStopped && !config.ADMIN_IDS.includes(userId)) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Bot is currently stopped for maintenance"
      });
      return;
    }

    // Handle user callbacks
    switch(data) {
      case 'browse_lectures':
        await handleBrowseLectures(bot, msg);
        break;
      case 'propose_lecture':
        await handleProposeLecture(bot, msg, userId);
        break;
      case 'my_registrations':
        await handleMyRegistrations(bot, msg, userId);
        break;
      case 'help':
        await handleHelp(bot, msg);
        break;
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  });

  // Handle photo messages for verification
  bot.on('photo', async (msg) => {
    const userId = msg.from.id;
    const userState = userStates.get(userId);

    if (userState && userState.waitingForPhoto) {
      // Notify admin about new verification request
      const photo = msg.photo[msg.photo.length - 1];
      
      for (const adminId of config.ADMIN_IDS) {
        await bot.sendPhoto(adminId, photo.file_id, {
          caption: `🆕 Verification Request\n\nFrom: ${msg.from.first_name}\nUsername: @${msg.from.username}\nID: ${userId}`,
          reply_markup: keyboards.lectureApprovalButtons(`verify_${userId}`).reply_markup
        });
      }

      await bot.sendMessage(msg.chat.id, 
        "✅ Your student ID photo has been sent for verification. You'll be notified once approved.",
        keyboards.mainMenu()
      );

      userStates.delete(userId);
    }
  });
};

// Handler functions
async function handleBrowseLectures(bot, msg) {
  // Implementation for browsing lectures
  await bot.editMessageText(`🔍 Browse available lectures...\n\nFeature coming soon!`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.backHomeButtons().reply_markup
  });
}

async function handleProposeLecture(bot, msg, userId) {
  const user = await dbHelpers.getUser(userId);
  
  if (!user || !user.is_verified) {
    await bot.editMessageText(`📋 To propose a lecture, we need to verify your student status first.\n\nPlease send a clear photo of your Student ID card.`, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: keyboards.backHomeButtons().reply_markup
    });
    
    userStates.set(userId, { waitingForPhoto: true });
    return;
  }

  await bot.editMessageText(`🎯 Lecture Proposal Form\n\nLet's get some details about your lecture...`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.backHomeButtons().reply_markup
  });
}

async function handleMyRegistrations(bot, msg, userId) {
  await bot.editMessageText(`📋 Your registered lectures will appear here.\n\nNo registrations yet.`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.backHomeButtons().reply_markup
  });
}

async function handleHelp(bot, msg) {
  const helpText = `ℹ️ **How to use this bot:**

**For Students:**
• Browse available lectures by senior students
• Register for lectures you're interested in
• Get notifications about new lectures

**For Lecturers (Senior Students):**
• Propose lectures on subjects you're good at
• Get your student status verified
• Connect with interested freshmen

**Need help?** Contact your department administrator.`;

  await bot.editMessageText(helpText, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    parse_mode: 'Markdown',
    reply_markup: keyboards.backHomeButtons().reply_markup
  });
         }
