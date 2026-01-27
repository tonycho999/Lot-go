const Game = require('../js/game.js');

console.log("Testing Game Logic...");

// 1. Setup Mode 0 (2/4 cards, cost 50, max 200)
Game.state.gold = 1000;
Game.setupGame(0);
if (Game.state.currentModeIndex !== 0) throw new Error("Setup failed");

// 2. Start Game
const myNumbers = [1, 2];
Game.startGame(myNumbers);
if (Game.state.gold !== 950) throw new Error("Cost not deducted");
if (Game.state.cards.length !== 4) throw new Error("Wrong card count");

// 3. Find where the targets are
const targetIndices = Game.state.cards
    .map((c, i) => c.isTarget ? i : -1)
    .filter(i => i !== -1);

if (targetIndices.length !== 2) throw new Error("Wrong number of targets generated");

// 4. Perfect Game Simulation
// Reset for simulation
Game.setupGame(0);
Game.startGame(myNumbers);
const perfectIndices = Game.state.cards
    .map((c, i) => c.isTarget ? i : -1)
    .filter(i => i !== -1);

let result1 = Game.revealCard(perfectIndices[0]);
let result2 = Game.revealCard(perfectIndices[1]);

if (!result2.gameOver || !result2.win) throw new Error("Perfect game didn't win");
if (result2.prize !== 198) throw new Error(`Perfect game prize wrong. Expected 198, got ${result2.prize}`);


// 5. Imperfect Game Simulation
Game.setupGame(0);
Game.startGame(myNumbers);
// Find a dud
const dudIndex = Game.state.cards.findIndex(c => !c.isTarget);
const targetIndices2 = Game.state.cards
    .map((c, i) => c.isTarget ? i : -1)
    .filter(i => i !== -1);

Game.revealCard(dudIndex); // 1st click (waste)
Game.revealCard(targetIndices2[0]); // 2nd click (found 1)
let finalRes = Game.revealCard(targetIndices2[1]); // 3rd click (found 2, total 3 opened)

// Formula: 198 * ((4-3)/(4-2))^2 = 198 * (1/2)^2 = 198 * 0.25 = 49.5 -> 49
if (finalRes.prize !== 49) throw new Error(`Imperfect game prize wrong. Expected 49, got ${finalRes.prize}`);

console.log("Game Logic Tests Passed.");
