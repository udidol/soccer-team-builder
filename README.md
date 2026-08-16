# Soccer Team Builder

<div align="center">  
<img style="height: 500px" alt="world-cup-fantasy-team-builder" src="https://github.com/user-attachments/assets/f4bc667e-cf20-484c-9381-383be4d87bca" />

</div>

A minimal, browser-based tool for building a soccer starting lineup from a curated player database. Pick players by position, share your lineup as an image, and come back later — selections are saved automatically on device (LocalStorage).

<!-- screenshot goes here -->

## Features

- Position-filtered autocomplete for each slot in a 4-3-3 formation
- Country flag display next to each player name
- Duplicate-player prevention across slots
- Selections persisted to `localStorage` across sessions
- Share button using the native Web Share API (falls back to clipboard)
- Clear all button with confirmation

## Tech stack

TypeScript · Vite · SCSS · [Choices.js](https://joshuajohnson.co.uk/Choices/) · html2canvas

## Getting started

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/your-username/soccer-team-builder.git
cd soccer-team-builder
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Player data

Players are loaded from `src/player-data.json`. Each entry has the shape:

```json
{ "firstName": "Lionel", "lastName": "Messi", "country": "Argentina", "positions": ["ST", "RW"] }
```

To use your own player set, replace that file with a JSON array following the same schema.

## Roadmap

- [ ] **Multiple formations** — switch between common formations (4-4-2, 4-2-3-1, 3-5-2, etc.) and have slots update accordingly
- [ ] **Flexible position mode** — a toggle that removes position filtering so any player can be placed in any slot
- [ ] **Custom player database** — upload a JSON file at runtime to replace the built-in player list without touching source code
- [ ] **Custom pitch backgrounds** — choose from preset pitch styles or upload your own background image
- [ ] **Autocomplete sort order** — control how players are ordered inside the dropdown (alphabetical by last name, by position, by country, etc.)

## License

MIT
