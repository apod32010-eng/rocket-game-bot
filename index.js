require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const handlers = require('./handlers');
const db = require('./database');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Middleware
bot.use(session());

// Handlers
bot.start(ctx => handlers.handleStart(ctx));

// Text messages
bot.on('text', ctx => handlers.handleMessage(ctx));

// Callback queries
bot.action('withdraw', ctx => {
  handlers.handleWithdraw(ctx);
  ctx.answerCbQuery('✅');
});

bot.action('cancel_game', ctx => {
  ctx.session.game_active = false;
  ctx.editMessageText('❌ تم إيقاف اللعبة');
  setTimeout(() => handlers.sendMainMenu(ctx), 1000);
  ctx.answerCbQuery('✅');
});

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ حدث خطأ في البوت. يرجى المحاولة لاحقاً.');
});

// Start bot
bot.launch().then(() => {
  console.log('🚀 Bot started successfully!');
  console.log('✨ Features:');
  console.log('  🚀 Rocket Crash Game');
  console.log('  🎰 Slot Machine');
  console.log('  🎁 Daily Rewards (500 points)');
  console.log('  🎡 Gift Wheel');
  console.log('  💰 Balance System');
  console.log('Waiting for commands...');
}).catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
