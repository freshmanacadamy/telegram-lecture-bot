const { dbHelpers } = require('../database');
const keyboards = require('../utils/keyboards');
const config = require('../config');

// Track lecture proposal state
const lectureProposalState = new Map();

module.exports = function(bot) {
    // Handle lecture proposal conversation
    bot.on('message', async (msg) => {
        if (msg.text && msg.text.startsWith('/')) return;
        
        const userId = msg.from.id;
        const userState = lectureProposalState.get(userId);
        
        if (userState && userState.proposingLecture) {
            await handleLectureProposalFlow(bot, msg, userId, userState);
        }
    });

    // Handle lecture-related callback queries
    bot.on('callback_query', async (callbackQuery) => {
        const msg = callbackQuery.message;
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id;

        if (data === 'start_proposal') {
            await startLectureProposal(bot, msg, userId);
        }
        else if (data === 'browse_lectures') {
            await showAvailableLectures(bot, msg);
        }
        else if (data.startsWith('register_')) {
            const lectureId = data.split('_')[1];
            await registerForLecture(bot, msg, userId, lectureId);
        }
        else if (data.startsWith('lecture_details_')) {
            const lectureId = data.split('_')[2];
            await showLectureDetails(bot, msg, lectureId);
        }

        await bot.answerCallbackQuery(callbackQuery.id);
    });
};

// Lecture proposal flow
async function startLectureProposal(bot, msg, userId) {
    const user = await dbHelpers.getUser(userId);
    
    if (!user || !user.is_verified) {
        await bot.editMessageText(`❌ You need to be verified as a senior student before proposing lectures.\n\nPlease complete verification first.`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboards.backHomeButtons().reply_markup
        });
        return;
    }

    // Initialize proposal state
    lectureProposalState.set(userId, {
        proposingLecture: true,
        step: 'title',
        data: {}
    });

    await bot.sendMessage(msg.chat.id, 
        `🎯 Let's create your lecture proposal!\n\n**Step 1 of 5:** What is the title of your lecture?\n\nExample: "Introduction to Python Programming"`,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
}

async function handleLectureProposalFlow(bot, msg, userId, userState) {
    const text = msg.text;

    switch (userState.step) {
        case 'title':
            userState.data.title = text;
            userState.step = 'description';
            await bot.sendMessage(msg.chat.id,
                `📝 **Step 2 of 5:** Please provide a detailed description of your lecture.\n\nWhat will students learn? What topics will you cover?`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'description':
            userState.data.description = text;
            userState.step = 'subject';
            await bot.sendMessage(msg.chat.id,
                `📚 **Step 3 of 5:** What subject category does this lecture belong to?\n\nExamples: "Programming", "Mathematics", "Economics", "Physics"`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'subject':
            userState.data.subject = text;
            userState.step = 'prerequisites';
            await bot.sendMessage(msg.chat.id,
                `🎓 **Step 4 of 5:** What prerequisites should students have?\n\nExamples: "Basic math knowledge", "No experience needed", "Understanding of variables"`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'prerequisites':
            userState.data.prerequisites = text;
            userState.step = 'duration';
            await bot.sendMessage(msg.chat.id,
                `⏰ **Step 5 of 5:** How long will the lecture take?\n\nExamples: "2 hours", "1.5 hours with break", "3 sessions of 1 hour each"`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'duration':
            userState.data.duration = text;
            await completeLectureProposal(bot, msg, userId, userState.data);
            lectureProposalState.delete(userId);
            break;
    }

    // Update state
    lectureProposalState.set(userId, userState);
}

async function completeLectureProposal(bot, msg, userId, lectureData) {
    try {
        // Add lecturer ID and proposed times
        lectureData.lecturer_id = userId;
        lectureData.proposed_times = "To be scheduled with attendees";

        // Save to database
        const lectureId = await dbHelpers.createLecture(lectureData);

        // Notify admins
        for (const adminId of config.ADMIN_IDS) {
            await bot.sendMessage(adminId,
                `🆕 NEW LECTURE PROPOSAL\n\n` +
                `📚 **Title:** ${lectureData.title}\n` +
                `👤 **Lecturer:** ${msg.from.first_name} (@${msg.from.username})\n` +
                `📖 **Subject:** ${lectureData.subject}\n` +
                `⏰ **Duration:** ${lectureData.duration}\n\n` +
                `📝 **Description:** ${lectureData.description}\n\n` +
                `🎓 **Prerequisites:** ${lectureData.prerequisites}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.lectureApprovalButtons(lectureId).reply_markup
                }
            );
        }

        await bot.sendMessage(msg.chat.id,
            `✅ **Lecture Proposal Submitted!**\n\n` +
            `**Title:** ${lectureData.title}\n` +
            `**Subject:** ${lectureData.subject}\n` +
            `**Duration:** ${lectureData.duration}\n\n` +
            `Your lecture is now under admin review. You'll be notified once it's approved and visible to students.`,
            {
                parse_mode: 'Markdown',
                reply_markup: keyboards.mainMenu().reply_markup
            }
        );

    } catch (error) {
        await bot.sendMessage(msg.chat.id,
            `❌ Error submitting lecture proposal: ${error.message}\n\nPlease try again.`,
            { reply_markup: keyboards.mainMenu().reply_markup }
        );
    }
}

// Browse available lectures
async function showAvailableLectures(bot, msg) {
    try {
        // Get approved lectures from database
        const db = require('../database').db;
        const lectures = await new Promise((resolve, reject) => {
            db.all(`SELECT l.*, u.first_name, u.username 
                    FROM lectures l 
                    JOIN users u ON l.lecturer_id = u.telegram_id 
                    WHERE l.admin_approved = 1 AND l.status = 'active' 
                    ORDER BY l.created_at DESC`, 
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });

        if (lectures.length === 0) {
            await bot.editMessageText(`📚 No available lectures at the moment.\n\nCheck back later or propose a lecture yourself!`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reply_markup: keyboards.backHomeButtons().reply_markup
            });
            return;
        }

        let message = `📚 Available Lectures (${lectures.length}):\n\n`;
        
        lectures.forEach((lecture, index) => {
            message += `**${index + 1}. ${lecture.title}**\n`;
            message += `   👤 By: ${lecture.first_name}\n`;
            message += `   📖 Subject: ${lecture.subject}\n`;
            message += `   ⏰ Duration: ${lecture.duration}\n`;
            message += `   🎓 Prerequisites: ${lecture.prerequisites}\n`;
            message += `   🔗 [View Details](/lecture_${lecture.id})\n\n`;
        });

        // Create inline keyboard with lecture options
        const lectureKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    ...lectures.slice(0, 5).map(lecture => [
                        { 
                            text: `📖 ${lecture.title.substring(0, 20)}...`, 
                            callback_data: `lecture_details_${lecture.id}` 
                        }
                    ]),
                    [
                        { text: "🔄 Back", callback_data: "back" },
                        { text: "🏠 Home", callback_data: "home" }
                    ]
                ]
            }
        };

        await bot.editMessageText(message, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: lectureKeyboard.reply_markup
        });

    } catch (error) {
        await bot.editMessageText(`❌ Error loading lectures: ${error.message}`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboards.backHomeButtons().reply_markup
        });
    }
}

// Show lecture details
async function showLectureDetails(bot, msg, lectureId) {
    try {
        const db = require('../database').db;
        const lecture = await new Promise((resolve, reject) => {
            db.get(`SELECT l.*, u.first_name, u.username 
                    FROM lectures l 
                    JOIN users u ON l.lecturer_id = u.telegram_id 
                    WHERE l.id = ?`, [lectureId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!lecture) {
            await bot.editMessageText("❌ Lecture not found.", {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reply_markup: keyboards.backHomeButtons().reply_markup
            });
            return;
        }

        const message = `📚 **${lecture.title}**\n\n` +
                       `👤 **Lecturer:** ${lecture.first_name}\n` +
                       `📖 **Subject:** ${lecture.subject}\n` +
                       `⏰ **Duration:** ${lecture.duration}\n` +
                       `🎓 **Prerequisites:** ${lecture.prerequisites}\n\n` +
                       `📝 **Description:**\n${lecture.description}\n\n` +
                       `🕒 **Proposed Times:** ${lecture.proposed_times}`;

        const detailKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Register for this Lecture", callback_data: `register_${lecture.id}` }],
                    [{ text: "👤 Contact Lecturer", url: `https://t.me/${lecture.username}` }],
                    [
                        { text: "🔄 Back to List", callback_data: "browse_lectures" },
                        { text: "🏠 Home", callback_data: "home" }
                    ]
                ]
            }
        };

        await bot.editMessageText(message, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: detailKeyboard.reply_markup
        });

    } catch (error) {
        await bot.editMessageText(`❌ Error loading lecture details: ${error.message}`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboards.backHomeButtons().reply_markup
        });
    }
}

// Register for a lecture
async function registerForLecture(bot, msg, userId, lectureId) {
    try {
        // Check if already registered
        const db = require('../database').db;
        const existingRegistration = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM registrations WHERE lecture_id = ? AND student_id = ?", 
                [lectureId, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingRegistration) {
            await bot.answerCallbackQuery(msg.id, { text: "You're already registered for this lecture!" });
            return;
        }

        // Register the student
        await dbHelpers.registerForLecture(lectureId, userId);

        // Get lecture details for notification
        const lecture = await new Promise((resolve, reject) => {
            db.get("SELECT l.title, u.telegram_id as lecturer_id FROM lectures l JOIN users u ON l.lecturer_id = u.telegram_id WHERE l.id = ?", 
                [lectureId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Notify lecturer
        if (lecture && lecture.lecturer_id) {
            await bot.sendMessage(lecture.lecturer_id,
                `🎉 New registration for your lecture!\n\n` +
                `**Lecture:** ${lecture.title}\n` +
                `**Student:** ${msg.from.first_name} (@${msg.from.username})\n` +
                `**Total registrations:** [Check your lectures]`,
                { parse_mode: 'Markdown' }
            );
        }

        await bot.editMessageText(`✅ Successfully registered for the lecture!\n\nThe lecturer has been notified and will contact you with scheduling details.`, {
            chat_id: msg.chat.chat_id || msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboards.backHomeButtons().reply_markup
        });

    } catch (error) {
        await bot.editMessageText(`❌ Error registering for lecture: ${error.message}`, {
            chat_id: msg.chat.chat_id || msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboards.backHomeButtons().reply_markup
        });
    }
          }
