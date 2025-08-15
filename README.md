Lichess → n8n → Stockfish → Telegram (Move Preview Bot)
Get an instant best-move preview for your ongoing Lichess games.
This project polls your Lichess account, sends the current FEN to an n8n workflow, fetches a Stockfish move, applies that move to the FEN, renders a board image of the resulting position, and delivers it to you on Telegram.

<p align="center"> <img src="docs/workflow.png" alt="n8n workflow screenshot" width="720"> </p>
How it works
yaml
Copy
Edit
Lichess Account → (Node script) → n8n Webhook
     │                                  
     │                         Code1: extract FEN
     │                         Code: build Stockfish URL
     │                         HTTP: call Stockfish
     │                         Code2: parse `bestmove`
     │
     └──────────────→ Merge (waits for both FEN + bestmove)
                               │
                               ├─ Code3: applyMoveToFEN(FEN, UCI)
                               ├─ HTTP: fen2image (PNG)
                               └─ Telegram: sendPhoto
Key features
Sends to n8n only when the FEN changes and it’s your turn.

Uses a Merge node to wait for both the FEN and the best move before proceeding.

Applies the move locally (handles castling, promotion, en passant, halfmove/fullmove, castling rights).

Renders the post-move board image and sends it to Telegram.

Repo structure (suggested)
pgsql
Copy
Edit
.
├─ src/
│  └─ lichess-watcher.mjs        # Node script (polls Lichess & posts to webhook)
├─ n8n/
│  └─ workflow.json              # Sanitized n8n workflow (no secrets)
├─ docs/
│  └─ workflow.png               # Screenshot of your n8n flow
├─ .env.example                  # Template for secrets (do not commit .env)
├─ .gitignore
└─ README.md
Prerequisites
Node.js 18+

n8n (Docker or local)

A Telegram bot (BotFather) and your chat ID

Environment variables
Create an .env at the project root (copy from .env.example):

env
Copy
Edit
# Lichess
LICHESS_API_URL=https://lichess.org/api/account/playing
TOKEN=your_lichess_api_token_here

# n8n public webhook (must match Webhook node path)
WEBHOOK_URL=https://your-n8n-host/webhook/chess-moves
Never commit .env. Keep it local.

Install & run (Node script)
bash
Copy
Edit
npm i node-fetch dotenv
node src/lichess-watcher.mjs
The script:

Polls LICHESS_API_URL every 5s

Sends to WEBHOOK_URL only when:

A game’s FEN changes, and

isMyTurn === true

Payload example (POST to n8n):

json
Copy
Edit
{
  "status": "ACTIVE_GAME",
  "gameId": "xxxxxxx",
  "lastMove": "e2e4",
  "currentFen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "gameUrl": "https://lichess.org/xxxxxxx",
  "opponent": { "username": "foo", "rating": 2000 },
  "variant": "standard",
  "speed": "blitz",
  "color": "white",
  "isMyTurn": true,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
n8n workflow
Import n8n/workflow.json into n8n, then:

Webhook

Path: chess-moves (matches WEBHOOK_URL)

Method: POST

Code1 (extract FEN)
Pulls currentFen from {{$json.body.currentFen}} into fen.

Code (build Stockfish URL)
URL: https://stockfish.online/api/s/v2.php?fen=<encoded FEN>&depth=13
(Spaces are encoded as %20.)

HTTP Request (Stockfish)
Calls the URL from the previous Code node.

Code2 (parse bestmove)
Extracts UCI move from Stockfish text: bestmove e2e4 ponder ... → e2e4.

Merge (mode: combine / by position)
Ensures the FEN (from Code1) and bestmove (from Code2) arrive together before proceeding.

Code3 (applyMoveToFEN)
Runs your applyMoveToFEN(initialFEN, moveUCI) and returns newFen (with spaces %20 encoded).

HTTP Request1 (fen2image)
URL: https://fen2image.chessvision.ai/{{ $json.newFen }}
In options, set Download: true and Binary Property: data.

Telegram (sendPhoto)

Credentials: your Telegram bot token (use n8n Credentials, not hard-coded).

Binary Data: true

Binary Property: data

chatId: your chat id (store in n8n as a secret or env var).

⚠️ Make sure HTTP Request1 actually downloads the image; otherwise the Telegram node won’t receive binary data.

Secrets & safety
Do not commit:

.env (contains tokens/URLs)

Any exported Credentials from n8n

Personal chat IDs or webhook URLs

Use n8n Credentials for tokens (Telegram, future APIs).

Consider setting up n8n Basic Auth or an API key on the Webhook node in production.

.gitignore (include at minimum):

bash
Copy
Edit
.env
.n8n/
*.n8n.backup
node_modules/
Provide a public workflow.json that contains no secrets (like the one in this repo).

Customization
Engine depth: change depth=13 to your preferred depth.

Polling frequency: edit setInterval(getCurrentGame, 5000) in the Node script.

Move filter: the Node script already sends only when game.isMyTurn and FEN changed. You can add a per-game Set to ignore duplicate positions or specific openings.

Troubleshooting
“Missing originalFen or bestmove in input”
One branch reached the Merge before the other. Ensure both connections feed the Merge and the Merge mode is Combine → By Position.

Telegram node sends nothing
In HTTP Request1, enable Download and set Binary Property to data. In Telegram node, set Binary Data to true and Binary Property to data.

Stockfish 4xx/5xx
Verify FEN is properly encoded (%20 for spaces). Public APIs can rate-limit; consider hosting your own Stockfish or using a different endpoint.

Webhook receives events faster than the flow
n8n queues executions by default. If you expect bursts, consider self-hosting with queue mode (Redis) or increase worker concurrency.

Limitations
applyMoveToFEN applies moves and covers castling, en passant, and promotion, but it does not validate move legality (e.g., king in check).

Reliance on public APIs (Stockfish endpoint, fen2image) may introduce rate limits/availability issues.

License
MIT — see LICENSE.

Credits
Lichess API

Stockfish

n8n

ChessVision FEN → Image