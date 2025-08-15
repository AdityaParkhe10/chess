# Lichess → n8n → Stockfish → Telegram (Move Preview Bot)

Get an instant best-move preview for your ongoing Lichess games. This project polls your Lichess account, sends the current FEN to an n8n workflow, fetches a Stockfish move, applies that move to the FEN, renders a board image of the resulting position, and delivers it to you on Telegram.

<p align="center"> 
  <img src="docs/workflow.png" alt="n8n workflow screenshot" width="720"> 
</p>

## How it works

```mermaid
graph LR
A[Lichess Account] --> B(Node script)
B --> C(n8n Webhook)
C --> D[Code1: extract FEN]
D --> E[Code: build Stockfish URL]
E --> F[HTTP: call Stockfish]
F --> G[Code2: parse bestmove]
D --> H[Merge]
G --> H
H --> I[Code3: applyMoveToFEN]
I --> J[HTTP: fen2image PNG]
J --> K[Telegram: sendPhoto]