# Tetris (HTML)

Classic Tetris built with pure HTML, CSS, and JavaScript — no frameworks, no build step.

## Play

Open `index.html` in any modern browser, or run a quick local server:

```bash
npx serve .
# or
python3 -m http.server
```

## Features

- All 7 tetrominoes with a 7-bag randomizer
- Ghost piece showing the landing position
- Next-piece preview
- Scoring (100/300/500/800 × level), levels up every 10 lines
- Soft drop (+1/cell) and hard drop (+2/cell)
- Speed increases with level
- Best score saved in `localStorage`
- Pause (P) and restart (R)

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move left / right |
| ↓ | Soft drop |
| ↑ or X | Rotate |
| Space | Hard drop |
| P | Pause / resume |
| R | Restart |
| Enter | Start |

## Files

- `index.html` — page structure
- `style.css` — styling
- `game.js` — game logic and rendering
