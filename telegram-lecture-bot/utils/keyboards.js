const config = require('../config');

// Main menu keyboards
module.exports = {
  // User main menu
  mainMenu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: "📚 Browse Lectures", callback_data: "browse_lectures" }],
        [{ text: "💡 Propose Lecture", callback_data: "propose_lecture" }],
        [{ text: "📋 My Registrations", callback_data: "my_registrations" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
        [
          { text: "🔄 Back", callback_data: "back" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    }
  }),

  // Admin main menu
  adminMenu: (isBotStopped = false) => ({
    reply_markup: {
      inline_keyboard: [
        [{
          text: isBotStopped ? "🟥 BOT STOPPED" : "🟢 BOT ACTIVE",
          callback_data: "bot_status"
        }],
        [
          { text: "📋 Pending Reviews", callback_data: "admin_pending" },
          { text: "👥 User Management", callback_data: "admin_users" }
        ],
        [
          { text: "📊 Export Data", callback_data: "admin_export" },
          { text: "⚙️ Bot Controls", callback_data: "admin_controls" }
        ],
        [
          { text: "🔄 Back", callback_data: "back" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    }
  }),

  // Emergency controls
  emergencyControls: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: "🟥 EMERGENCY STOP", callback_data: "emergency_stop_confirm" }],
        [{ text: "🟨 MAINTENANCE MODE", callback_data: "maintenance_mode" }],
        [{ text: "🟢 RESTART BOT", callback_data: "restart_bot" }],
        [
          { text: "🔄 Back", callback_data: "admin_controls" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    }
  }),

  // Export options
  exportMenu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Export Registrations", callback_data: "export_registrations" }],
        [{ text: "👥 Export Users", callback_data: "export_users" }],
        [{ text: "🎓 Export Lecturers", callback_data: "export_lecturers" }],
        [{ text: "📚 Export Lectures", callback_data: "export_lectures" }],
        [
          { text: "🔄 Back", callback_data: "admin_export" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    }
  }),

  // Lecture approval buttons
  lectureApprovalButtons: (lectureId) => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${lectureId}` },
          { text: "❌ Reject", callback_data: `reject_${lectureId}` }
        ],
        [
          { text: "📸 View Details", callback_data: `details_${lectureId}` },
          { text: "👤 Contact Lecturer", callback_data: `contact_${lectureId}` }
        ]
      ]
    }
  }),

  // Back and Home buttons only
  backHomeButtons: () => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Back", callback_data: "back" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    }
  }),

  // Confirm emergency stop
  confirmEmergencyStop: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: "🟥 CONFIRM SHUTDOWN", callback_data: "confirm_emergency_stop" }],
        [{ text: "🟪 Cancel", callback_data: "admin_controls" }]
      ]
    }
  })
};
