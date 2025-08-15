import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Use env values
const LICHESS_API_URL = process.env.LICHESS_API_URL;
const TOKEN = process.env.TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

let gameStates = new Map();

// Function to send data to n8n webhook
async function sendToWebhook(data) {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...data,
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log(`✅ Sent to webhook: ${response.status}`);
        } else {
            console.log(`❌ Webhook failed: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Webhook error: ${error.message}`);
    }
}

async function getCurrentGame() {
    try {
        const response = await fetch(LICHESS_API_URL, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Accept": "application/json"
            }
        });

        // Handle potential non-JSON response
        const rawData = await response.text();
        let data;
        try {
            data = JSON.parse(rawData);
        } catch (parseError) {
            console.error("❌ Failed to parse JSON:", parseError.message);
            console.log("Raw response:", rawData);
            return;
        }
        
        if (!data.nowPlaying || data.nowPlaying.length === 0) {
            console.log("⏳ No ongoing games found.");
            return; // Exit without calling sendToWebhook
        }


        data.nowPlaying.forEach(async (game) => {
            const gameId = game.gameId;
            const currentFen = game.fen;
            const lastMove = game.lastMove || "None (new game)";
            
            if (!gameStates.has(gameId)) {
                console.log(`\n🎮 New game detected: ${gameId}`);
                console.log(`   Opponent: ${game.opponent.username} (${game.opponent.rating})`);
                console.log(`   Variant: ${game.variant}, Speed: ${game.speed}`);
            }

            const previousState = gameStates.get(gameId);

            // Only send to webhook if FEN changed
            if ((!previousState || previousState.fen !== currentFen) && game.isMyTurn) {
                gameStates.set(gameId, { lastMove, fen: currentFen });
                console.log(`\n♟️ Game: ${gameId}`);
                console.log(`   Last Move: ${lastMove}`);
                console.log(`   FEN: ${currentFen}`);
                console.log(`   URL: https://lichess.org/${gameId}`);

                await sendToWebhook({
                    status: "ACTIVE_GAME",
                    gameId: gameId,
                    lastMove: lastMove,
                    currentFen: currentFen,
                    gameUrl: `https://lichess.org/${gameId}`,
                    opponent: {
                        username: game.opponent.username,
                        rating: game.opponent.rating
                    },
                    variant: game.variant,
                    speed: game.speed,
                    color: game.color,
                    isMyTurn: game.isMyTurn
                });
            } else {
                if(!game.isMyTurn){
                    console.log('not my turn chill');
                }
                else{
                      console.log(`⏸ No change in FEN for game ${gameId}, skipping webhook send.`);
                }
              
            }
        });

    } catch (error) {
        console.error("❌ API Error:", error.message);
    }
}


console.log("🚀 Starting Lichess game monitor. Press Ctrl+C to stop...");
console.log(`📡 Webhook: ${WEBHOOK_URL}`);
setInterval(getCurrentGame, 5000);

// Initial call to start immediately
getCurrentGame();
