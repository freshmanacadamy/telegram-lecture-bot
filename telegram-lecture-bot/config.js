module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN || '8580563953:AAEUQ1TLXpEbnUPlAX5VHwinWmB_rrKc3IU',
  ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [7362758034],
  DATABASE_PATH: './bot.db',
  
  // Bot states
  botStopped: false,
  maintenanceMode: false
};
