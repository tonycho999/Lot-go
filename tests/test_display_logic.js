const Game = require('../js/game.js');

console.log("Testing Game Logic - Display vs Reality...");

// Setup Mode 0 (2/4 cards, Max 198)
Game.state.gold = 1000;
Game.setupGame(0);
Game.startGame([1, 2]);

// State 0: 0 Revealed.
// Display should be 198 (getCurrentPrizeValue)
// Predicted win (if perfect) should be 198
let display = Game.getCurrentPrizeValue();
if (display !== 198) throw new Error(`Initial display wrong. Got ${display}`);

// Step 1: Reveal Dud
// Find a dud
const dudIndex = Game.state.cards.findIndex(c => !c.isTarget);
Game.revealCard(dudIndex);

// State 1: 1 Revealed (Dud).
// Math says: Need 2 more targets. Total 3 cards will be used.
// Reward(3) = 50.
// BUT Display (getCurrentPrizeValue) should depend on revealedCount=1.
// Reward(1) -> 1 <= 2 -> 198.
display = Game.getCurrentPrizeValue();
console.log(`After 1 Dud -> Display: ${display}`);
if (display !== 198) throw new Error(`Display dropped too early! Got ${display}, expected 198`);

// Step 2: Reveal Target
const targetIndex = Game.state.cards.findIndex(c => c.isTarget);
Game.revealCard(targetIndex);

// State 2: 2 Revealed (1 Dud, 1 Target).
// RevealedCount = 2.
// Reward(2) -> 198.
display = Game.getCurrentPrizeValue();
console.log(`After 1 Dud + 1 Target -> Display: ${display}`);
if (display !== 198) throw new Error(`Display dropped at 2 cards! Got ${display}, expected 198`);

// Step 3: Reveal Last Target (Win)
const lastTargetIndex = Game.state.cards.findIndex(c => c.isTarget && !c.revealed);
const result = Game.revealCard(lastTargetIndex);

// State 3: 3 Revealed.
// RevealedCount = 3.
// Prize Formula: 198 * ((4-3)/(4-2))^2 = 198 * 0.25 = 49.5 -> 49.
console.log(`Won! Prize: ${result.prize}`);

if (result.prize !== 49) throw new Error(`Final prize wrong. Got ${result.prize}, expected 49`);
if (display === 49) console.log("Note: Display was 198 right before this click.");

console.log("Logic Verification Passed.");
