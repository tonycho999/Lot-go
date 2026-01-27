const Game = require('../js/game.js');

console.log("Testing Game Logic - Display vs Reality...");

// Setup Mode 0 (2/4 cards, Max 200)
Game.state.gold = 1000;
Game.setupGame(0);
Game.startGame([1, 2]);

// State 0: 0 Revealed.
// Display should be 200 (getCurrentPrizeValue)
// Predicted win (if perfect) should be 200
let display = Game.getCurrentPrizeValue();

// BUG FIX: The logic returns 800 because N=4, K=2, M=0 -> factor = 4/2 = 2. 2^2=4. 200*4 = 800.
// We must clamp the factor to 1.
console.log(`Initial Display: ${display}`);
if (display !== 200) console.log("Ah, math issue with 0 revealed.");
