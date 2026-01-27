const Game = require('../js/game.js');

console.log("Testing Game Logic V2 (Mode 2)...");

// 1. Setup Mode 2 (6/40 cards, cost 500, max 12736)
Game.state.gold = 10000;
Game.setupGame(2);
if (Game.state.currentModeIndex !== 2) throw new Error("Setup failed");

const myNumbers = [1, 2, 3, 4, 5, 6];
Game.startGame(myNumbers);

// Find targets
const targetIndices = Game.state.cards
    .map((c, i) => c.isTarget ? i : -1)
    .filter(i => i !== -1);

if (targetIndices.length !== 6) throw new Error("Wrong number of targets generated");
if (Game.state.cards.length !== 40) throw new Error("Wrong number of total cards");

// 2. Perfect Game
Game.setupGame(2);
Game.startGame(myNumbers);
const perfectIndices = Game.state.cards
    .map((c, i) => c.isTarget ? i : -1)
    .filter(i => i !== -1);

for (let i = 0; i < 5; i++) {
    Game.revealCard(perfectIndices[i]);
}
let result = Game.revealCard(perfectIndices[5]);

if (!result.win) throw new Error("Perfect game didn't win");
if (result.prize !== 12736) throw new Error(`Perfect game prize wrong. Expected 12736, got ${result.prize}`);

console.log("Mode 2 Tests Passed.");
