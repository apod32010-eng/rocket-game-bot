module.exports = {
  // Game settings
  MIN_BET: 10,
  MAX_BET: 10000,
  
  // Rocket crash probability
  CRASH_PROBABILITY: 0.55, // 55% chance to crash (lose)
  WIN_PROBABILITY: 0.45,   // 45% chance to win
  
  // Rocket multiplier settings
  MIN_MULTIPLIER: 1.1,
  MAX_MULTIPLIER: 50,
  
  // Gift wheel prizes
  GIFT_WHEEL: [
    { name: '🎁 جائزة صغيرة', amount: 50, probability: 0.3 },
    { name: '🎉 جائزة متوسطة', amount: 200, probability: 0.25 },
    { name: '🏆 جائزة كبيرة', amount: 500, probability: 0.2 },
    { name: '💎 جائزة ذهبية', amount: 1000, probability: 0.15 },
    { name: '👑 جائزة ملكية', amount: 5000, probability: 0.1 }
  ],
  
  // Game timing
  ROCKET_ASCENT_TIME: 15000, // 15 seconds for rocket to fully ascend
  EXPLOSION_TIME: 500, // Time when rocket explodes
  
  // Starting balance
  STARTING_BALANCE: 1000
};
