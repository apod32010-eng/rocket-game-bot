const config = require('./config');
const db = require('./database');

// Calculate rocket multiplier based on time
function calculateMultiplier(elapsedTime) {
  const maxTime = config.ROCKET_ASCENT_TIME;
  const progress = Math.min(elapsedTime / maxTime, 1);
  
  // Exponential growth
  const multiplier = config.MIN_MULTIPLIER + 
    (config.MAX_MULTIPLIER - config.MIN_MULTIPLIER) * Math.pow(progress, 1.5);
  
  return parseFloat(multiplier.toFixed(2));
}

// Determine if rocket crashes at current time
function checkCrash() {
  return Math.random() < config.CRASH_PROBABILITY;
}

// Get random gift from wheel
function spinGiftWheel() {
  const random = Math.random();
  let cumulativeProbability = 0;
  
  for (const gift of config.GIFT_WHEEL) {
    cumulativeProbability += gift.probability;
    if (random <= cumulativeProbability) {
      return gift;
    }
  }
  
  return config.GIFT_WHEEL[config.GIFT_WHEEL.length - 1];
}

// Play game round
function playGame(userId, betAmount, withdrawTime, callback) {
  // Validate bet
  if (betAmount < config.MIN_BET || betAmount > config.MAX_BET) {
    return callback({
      success: false,
      message: `رهان غير صحيح! يجب أن يكون بين ${config.MIN_BET} و ${config.MAX_BET}`
    });
  }

  // Check user balance
  db.getUser(userId, (err, user) => {
    if (err) {
      return callback({ success: false, message: 'خطأ في قاعدة البيانات' });
    }

    if (!user) {
      return callback({ success: false, message: 'لم يتم العثور على المستخدم' });
    }

    if (user.balance < betAmount) {
      return callback({ success: false, message: 'رصيدك غير كافي!' });
    }

    // Deduct bet
    db.updateBalance(userId, -betAmount, (err) => {
      if (err) {
        return callback({ success: false, message: 'خطأ في خصم الرهان' });
      }

      // Determine game outcome
      const isCrash = checkCrash();
      const multiplier = calculateMultiplier(withdrawTime);
      
      let result, winnings, message;

      if (isCrash) {
        result = 'loss';
        winnings = 0;
        message = `😢 انفجر الصاروخ!\nالمضاعف كان: ${multiplier}x\nخسرت: ${betAmount}`;
      } else {
        result = 'win';
        winnings = Math.floor(betAmount * multiplier);
        db.updateBalance(userId, winnings, () => {});
        message = `🎉 فزت!\nالمضاعف: ${multiplier}x\nالربح: ${winnings}`;
      }

      // Update stats
      db.updateWinLoss(userId, result, () => {});
      db.saveGameResult(userId, betAmount, result, multiplier, winnings, () => {});

      callback({
        success: true,
        result,
        multiplier,
        winnings,
        message,
        newBalance: user.balance - betAmount + winnings
      });
    });
  });
}

// Play gift wheel
function playGiftWheel(userId, callback) {
  db.getUser(userId, (err, user) => {
    if (err) {
      return callback({ success: false, message: 'خطأ في قاعدة البيانات' });
    }

    if (!user) {
      return callback({ success: false, message: 'لم يتم العثور على المستخدم' });
    }

    const prize = spinGiftWheel();
    
    db.updateBalance(userId, prize.amount, (err) => {
      if (err) {
        return callback({ success: false, message: 'خطأ في تحديث الرصيد' });
      }

      db.saveGiftSpin(userId, prize.name, prize.amount, () => {});

      callback({
        success: true,
        prize: prize.name,
        amount: prize.amount,
        message: `🎡 عجلة الهدايا!\n${prize.name}\n+${prize.amount} نقطة`,
        newBalance: user.balance + prize.amount
      });
    });
  });
}

module.exports = {
  calculateMultiplier,
  checkCrash,
  spinGiftWheel,
  playGame,
  playGiftWheel
};
