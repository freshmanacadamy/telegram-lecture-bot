const { dbHelpers } = require('../database');
const keyboards = require('../utils/keyboards');
const exportUtils = require('../utils/exportUtils');
const config = require('../config');

module.exports = function(bot) {
  // Admin callback queries
  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    if (!config.ADMIN_IDS.includes(userId)) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: "Unauthorized" });
      return;
    }

    // Admin-specific callbacks
    switch(data) {
      case 'admin_pending':
        await handleAdminPending(bot, msg);
        break;
      case 'admin_controls':
        await handleAdminControls(bot, msg);
        break;
      case 'admin_export':
        await handleAdminExport(bot, msg);
        break;
      case 'emergency_stop_confirm':
        await handleEmergencyStopConfirm(bot, msg);
        break;
      case 'confirm_emergency_stop':
        await handleConfirmEmergencyStop(bot, msg, userId);
        break;
      case 'restart_bot':
        await handleRestartBot(bot, msg, userId);
        break;
      case 'export_registrations':
        await handleExportRegistrations(bot, msg, userId);
        break;
    }

    // Handle lecture approval/rejection
    if (data.startsWith('approve_')) {
      const lectureId = data.split('_')[1];
      await handleApproveLecture(bot, msg, userId, lectureId);
    }

    if (data.startsWith('reject_')) {
      const lectureId = data.split('_')[1];
      await handleRejectLecture(bot, msg, userId, lectureId);
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  });

  // Admin commands
  bot.onText(/\/admin/, (msg) => {
    if (config.ADMIN_IDS.includes(msg.from.id)) {
      bot.sendMessage(msg.chat.id, "👨‍💼 ADMIN PANEL", keyboards.adminMenu());
    }
  });
};

// Admin handler functions
async function handleAdminPending(bot, msg) {
  const pendingLectures = await dbHelpers.getPendingLectures();
  
  if (pendingLectures.length === 0) {
    await bot.editMessageText("✅ No pending lectures for review.", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: keyboards.adminMenu().reply_markup
    });
    return;
  }

  let response = `📋 Pending Lectures (${pendingLectures.length}):\n\n`;
  
  pendingLectures.forEach((lecture, index) => {
    response += `${index + 1}. **${lecture.title}**\n`;
    response += `   👤 By: ${lecture.first_name}\n`;
    response += `   📚 Subject: ${lecture.subject}\n\n`;
  });

  await bot.editMessageText(response, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    parse_mode: 'Markdown',
    reply_markup: keyboards.backHomeButtons().reply_markup
  });
}

async function handleAdminControls(bot, msg) {
  const statusText = config.botStopped ? "🟥 STOPPED" : "🟢 RUNNING";
  
  await bot.editMessageText(`⚙️ BOT CONTROLS\n\nCurrent Status: ${statusText}\n\nEmergency controls:`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.emergencyControls().reply_markup
  });
}

async function handleAdminExport(bot, msg) {
  await bot.editMessageText(`📊 DATA EXPORT\n\nExport bot data in various formats:`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.exportMenu().reply_markup
  });
}

async function handleEmergencyStopConfirm(bot, msg) {
  await bot.editMessageText(`🛑 CONFIRM EMERGENCY SHUTDOWN\n\nThis will:\n• Stop the bot for all users\n• Show maintenance message\n• Only allow admin access\n\nAre you sure?`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.confirmEmergencyStop().reply_markup
  });
}

async function handleConfirmEmergencyStop(bot, msg, adminId) {
  config.botStopped = true;
  
  // Log the action
  const db = require('../database').db;
  db.run("INSERT INTO admin_actions (admin_id, action) VALUES (?, ?)", [adminId, 'emergency_stop']);
  
  await bot.editMessageText(`✅ BOT STOPPED SUCCESSFULLY\n\nAll user functions have been disabled. Only admins can access the bot now.`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.adminMenu(true).reply_markup
  });
}

async function handleRestartBot(bot, msg, adminId) {
  config.botStopped = false;
  
  // Log the action
  const db = require('../database').db;
  db.run("INSERT INTO admin_actions (admin_id, action) VALUES (?, ?)", [adminId, 'restart_bot']);
  
  await bot.editMessageText(`✅ BOT RESTARTED SUCCESSFULLY\n\nAll functions are now active for users.`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.adminMenu(false).reply_markup
  });
}

async function handleExportRegistrations(bot, msg, adminId) {
  try {
    // Create Excel file
    const workbook = await exportUtils.exportRegistrationsToExcel();
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Send file
    await bot.sendDocument(msg.chat.id, Buffer.from(buffer), {
      caption: '📊 Registrations Export',
      filename: `registrations_${new Date().toISOString().split('T')[0]}.xlsx`
    });

  } catch (error) {
    await bot.sendMessage(msg.chat.id, `❌ Error generating export: ${error.message}`);
  }
}

async function handleApproveLecture(bot, msg, adminId, lectureId) {
  try {
    await dbHelpers.approveLecture(lectureId, adminId);
    await bot.editMessageText(`✅ Lecture approved successfully!`, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: keyboards.backHomeButtons().reply_markup
    });
  } catch (error) {
    await bot.editMessageText(`❌ Error approving lecture: ${error.message}`, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: keyboards.backHomeButtons().reply_markup
    });
  }
}

async function handleRejectLecture(bot, msg, adminId, lectureId) {
  // Implementation for rejecting lectures
  await bot.editMessageText(`❌ Lecture rejected.`, {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: keyboards.backHomeButtons().reply_markup
  });
                        }
