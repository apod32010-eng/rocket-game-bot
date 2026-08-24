const { Markup } = require('telegraf');
const db = require('./database');
const gameLogic = require('./gameLogic');
const config = require('./config');

// Start command
function handleStart(ctx) {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;

  db.getUser(userId, (err, user) => {
    if (err) {
      return ctx.reply('❌ خطأ في النظام');
    }

    if (!user) {
      db.createUser(userId, username, (err) => {
        if (err) {
          return ctx.reply('❌ خطأ في إنشاء حسابك');
        }
        sendMainMenu(ctx);
      });
    } else {
      sendMainMenu(ctx);
    }
  });
}

// Main menu
function sendMainMenu(ctx) {
  const userId = ctx.from.id;

  db.getUser(userId, (err, user) => {
    if (err) return ctx.reply('❌ خطأ في النظام');

    const messageText = `
🎮 *لعبة الصاروخ - Rocket Crash*

👤 المستخدم: ${ctx.from.first_name}
💰 رصيدك: ${user.balance} 💵
🏆 الفوز: ${user.total_wins}
❌ الخسارة: ${user.total_losses}

اختر إحدى الخيارات:
    `;

    ctx.reply(messageText, Markup.keyboard([
      ['🚀 العب اللعبة', '🎡 عجلة الهدايا'],
      ['📊 إحصائيتي', '🏅 لوحة المتصدرين'],
      ['📖 القواعد', '⚙️ الإعدادات']
    ]).resize());
  });
}

// Play game handler
function handlePlayGame(ctx) {
  ctx.session = ctx.session || {};
  ctx.reply(
    'أدخل مبلغ الرهان (من 10 إلى 10000):',
    Markup.removeKeyboard()
  );
  ctx.session.waiting_for_bet = true;
}

// Handle bet input
function handleBetInput(ctx) {
  const betAmount = parseInt(ctx.message.text);

  if (isNaN(betAmount)) {
    return ctx.reply('❌ أدخل رقم صحيح!');
  }

  if (betAmount < config.MIN_BET || betAmount > config.MAX_BET) {
    return ctx.reply(`❌ يجب أن يكون الرهان بين ${config.MIN_BET} و ${config.MAX_BET}`);
  }

  ctx.session.bet_amount = betAmount;
  ctx.session.game_start_time = Date.now();
  ctx.session.waiting_for_bet = false;

  showGameInterface(ctx, betAmount);
}

// Game interface
function showGameInterface(ctx, betAmount) {
  const messageText = `
🚀 *لعبة الصاروخ*

💵 الرهان: ${betAmount}
📈 المضاعف: 1.0x

اختر الإجراء:
  `;

  ctx.reply(messageText, Markup.inlineKeyboard([
    [Markup.button.callback('💰 سحب الأرباح', 'withdraw')],
    [Markup.button.callback('❌ إيقاف', 'cancel_game')]
  ]));

  // Simulate rocket ascending
  startRocketAnimation(ctx, betAmount);
}

// Rocket animation and game loop
function startRocketAnimation(ctx, betAmount) {
  const userId = ctx.from.id;
  let gameActive = true;
  let currentTime = 0;
  const updateInterval = 500; // Update every 500ms

  ctx.session.game_active = true;

  const gameInterval = setInterval(() => {
    if (!gameActive || !ctx.session.game_active) {
      clearInterval(gameInterval);
      return;
    }

    currentTime += updateInterval;
    const multiplier = gameLogic.calculateMultiplier(currentTime);

    ctx.session.current_multiplier = multiplier;
    ctx.session.current_time = currentTime;

    // Check if rocket crashes
    if (currentTime >= config.ROCKET_ASCENT_TIME) {
      clearInterval(gameInterval);
      gameActive = false;

      // Rocket crashes
      db.getUser(userId, (err, user) => {
        ctx.reply(
          `
❌ *انفجر الصاروخ!*

📈 المضاعف: ${multiplier}x
💵 الرهان: ${betAmount}
❌ خسرت: ${betAmount}
💰 رصيدك الجديد: ${user.balance - betAmount}

هل تريد لعبة جديدة؟
          `,
          Markup.keyboard([['🚀 العب مجدداً', '🏠 العودة']]).resize()
        );
      });

      // Update stats
      db.updateWinLoss(userId, 'loss', () => {});
      db.saveGameResult(userId, betAmount, 'loss', multiplier, 0, () => {});
      db.updateBalance(userId, -betAmount, () => {});
    }
  }, updateInterval);
}

// Withdraw handler
function handleWithdraw(ctx) {
  const userId = ctx.from.id;
  const betAmount = ctx.session.bet_amount;
  const multiplier = ctx.session.current_multiplier || 1.1;

  ctx.session.game_active = false;

  const winnings = Math.floor(betAmount * multiplier);

  db.getUser(userId, (err, user) => {
    if (err) return ctx.answerCbQuery('❌ خطأ في النظام');

    db.updateBalance(userId, winnings, () => {});
    db.updateWinLoss(userId, 'win', () => {});
    db.saveGameResult(userId, betAmount, 'win', multiplier, winnings, () => {});

    ctx.editMessageText(
      `
🎉 *فزت!*

📈 المضاعف: ${multiplier}x
💵 الرهان: ${betAmount}
💰 الربح: ${winnings}
💵 رصيدك الجديد: ${user.balance + winnings}

مبروك! 🏆
      `,
      Markup.keyboard([['🚀 العب مجدداً', '🏠 العودة']]).resize()
    );
  });
}

// Statistics handler
function handleStats(ctx) {
  const userId = ctx.from.id;

  db.getUser(userId, (err, user) => {
    if (err) return ctx.reply('❌ خطأ في النظام');

    const totalGames = user.total_wins + user.total_losses;
    const winRate = totalGames > 0 ? ((user.total_wins / totalGames) * 100).toFixed(2) : 0;

    const stats = `
📊 *إحصائياتك*

💰 الرصيد: ${user.balance}
🎮 إجمالي المباريات: ${totalGames}
✅ الفوز: ${user.total_wins}
❌ الخسارة: ${user.total_losses}
📈 نسبة الفوز: ${winRate}%
📅 انضممت: ${new Date(user.created_at).toLocaleDateString('ar-SA')}
    `;

    ctx.reply(stats, Markup.removeKeyboard());
  });
}

// Leaderboard handler
function handleLeaderboard(ctx) {
  db.getLeaderboard(10, (err, users) => {
    if (err) return ctx.reply('❌ خطأ في النظام');

    let leaderboardText = '🏅 *لوحة المتصدرين*\n\n';
    users.forEach((user, index) => {
      leaderboardText += `${index + 1}. ${user.username || 'مستخدم'} - 💰 ${user.balance}\n`;
    });

    ctx.reply(leaderboardText, Markup.removeKeyboard());
  });
}

// Gift wheel handler
function handleGiftWheel(ctx) {
  const userId = ctx.from.id;

  gameLogic.playGiftWheel(userId, (result) => {
    if (!result.success) {
      return ctx.reply(result.message);
    }

    ctx.reply(
      result.message + `\n\n💰 رصيدك الجديد: ${result.newBalance}`,
      Markup.keyboard([['🚀 العب اللعبة', '🎡 عجلة الهدايا'], ['🏠 العودة']]).resize()
    );
  });
}

// Rules handler
function handleRules(ctx) {
  const rules = `
📖 *قواعد اللعبة*

1️⃣ ضع رهانك (10-10000)
2️⃣ الصاروخ يبدأ بالارتفاع
3️⃣ المضاعف يزداد مع الوقت
4️⃣ يمكنك السحب في أي وقت
5️⃣ إذا انفجر الصاروخ قبل السحب → تخسر الرهان
6️⃣ إذا سحبت في الوقت المناسب → تربح المضاعف

📊 الإحصائيات:
• نسبة الخسارة: 55%
• نسبة الفوز: 45%

🎁 عجلة الهدايا:
اختبر حظك وربح جوائز!
    `;

  ctx.reply(rules, Markup.removeKeyboard());
}

// Handle text messages
function handleMessage(ctx) {
  const text = ctx.message.text;

  if (ctx.session?.waiting_for_bet) {
    handleBetInput(ctx);
    return;
  }

  switch (text) {
    case '🚀 العب اللعبة':
      handlePlayGame(ctx);
      break;
    case '🎡 عجلة الهدايا':
      handleGiftWheel(ctx);
      break;
    case '📊 إحصائيتي':
      handleStats(ctx);
      break;
    case '🏅 لوحة المتصدرين':
      handleLeaderboard(ctx);
      break;
    case '📖 القواعد':
      handleRules(ctx);
      break;
    case '🏠 العودة':
    case '🚀 العب مجدداً':
      sendMainMenu(ctx);
      break;
    default:
      ctx.reply('❌ أمر غير معروف. استخدم القائمة أعلاه.');
  }
}

module.exports = {
  handleStart,
  sendMainMenu,
  handlePlayGame,
  handleBetInput,
  showGameInterface,
  handleWithdraw,
  handleStats,
  handleLeaderboard,
  handleGiftWheel,
  handleRules,
  handleMessage
};
