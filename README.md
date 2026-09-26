# NEON BREAK

A production-ready Breakout arcade game in a single HTML file. Neon HUD, deterministic canvas physics, combo scoring, and 60 FPS gameplay on desktop, tablet, and phone.

Open `index.html` in a browser, or host the folder as a static site.

## Controls

### Desktop

- Move paddle: mouse, `A` / `D`, or arrow keys
- Launch ball: click or `Space`
- Pause / resume: `Space` (after launch), `P`, or `Esc`

### Mobile and tablet

- Move paddle: drag
- Launch ball: tap
- Pause: on-screen pause control

## Features

- Classic Breakout paddle, ball, and brick grid
- Hit-position bounce angles (left / center / right)
- Lives (3), score, combo multiplier, and local best score
- Level progression with faster ball and denser layouts
- Multi-hit bricks on later stages (all bricks remain breakable)
- Pooled particles, ball trail, screen shake, dynamic gradient
- Web Audio tones (no audio files): brick, paddle, wall, game over
- Full-viewport canvas with DPR scaling, visualViewport, and iPhone safe-area insets
- Portrait and landscape, keyboard, mouse, and touch
- Compact HUD on short landscape phones
- `prefers-reduced-motion` reduces particles and trails
- Best score and mute persist in localStorage (private-mode safe)

## Tech

- Vanilla JavaScript
- HTML5 Canvas
- Web Audio API
- No libraries, frameworks, or CDNs

## GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `README.md`, and `.nojekyll` to the repository root.
3. Open **Settings → Pages**.
4. Set source to **Deploy from a branch**.
5. Choose `main` (or `master`) and folder `/ (root)`.
6. Save. The game is live at `https://<user>.github.io/<repo>/`.

If the site is served from a project subfolder, keep `index.html` at that folder root so Pages can pick it up as the homepage.

## Play tips

- Strike the ball with the paddle edges for sharp angles.
- Chain brick hits for combo multipliers before the ball returns.
- Speed climbs per hit and per level, but velocity is clamped for stability.
