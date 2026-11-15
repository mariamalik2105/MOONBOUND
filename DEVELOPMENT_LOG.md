# MOONBOUND — Development Log

## Project: MOONBOUND
**Tagline:** One Moon. Nine Phases. One Mission: Make It Home.
**Event:** NASA International Space Apps Challenge
**Platform:** Browser (2D Lunar Exploration & Colony Management with Three.js 3D Character Inspector)

---

### Completed Milestones

### 2026-11-13: Playability and polish overhaul

- **Progression rewritten** (`src/game/progression.ts`, pure and unit tested): every objective has an exact success condition checked against real state; rewards are paid once; the last mission ends the campaign (`campaignComplete`) instead of repeating; scans count distinct rocks per mission; restart really resets the mission's steps; play time counts only active, unpaused seconds.
- **Saves**: version 2 with `progress` (tutorial, one-time rewards, deposits used, scans, astronaut and rover position). Version 1 saves migrate without losing completed missions.
- **Engine rewritten** (same `MoonboundEngine` class): frame-rate independent movement with equal diagonal speed, gentle acceleration, walk cycle, footprints, dust kicks, rover steering/braking, a companion that follows smoothly, A* click-to-move with a destination marker and a clear "Can't reach that spot", click-an-object-to-use-it, in-world prompts ("E · Collect ice"), mission target marker, base that visibly grows with each badge.
- **Input**: E interact, F scan, B build, I backpack, R rover, Q emotes, Esc closes the top overlay or cancels placement before pausing. Overlays release held keys; losing focus clears keys; typing fields are ignored; UI clicks never move the astronaut. Pause stops the engine and the colony clock in single player; in multiplayer, menus block input only.
- **Flight missions** are now hands-on console tasks (pack kits, timed burn, star tracker, landing-site choice, powered landing). **Base setup** tasks: recycler (order the parts), lab (compare two real rock types), antenna (aim at Earth).
- **HUD**: one mission card (title, current step, key, progress, hints after inactivity), a few gauges, a small action bar. Plain-language messages.
- **Visual direction**: dusty lunar grays, warm off-white equipment, restrained purple; accent colours only for interactive objects, warnings and targets.
- **Science**: honest source labels, no invented percentages, non-blocking discovery notes, Science Log.
- **Comfort**: volume, mute, reduce motion, high contrast, replay intro, controls card, visible focus.



#### Stage 1: Project Foundation & Architecture
- Configured TypeScript full-stack framework with Node.js Express, Socket.IO, Vite, Tailwind CSS, and Three.js.
- Set up unit testing framework with Node 22 built-in test runner (`node:test`) executed via `npx --yes tsx --test`.
- Authored decoupled pure simulation, economy, and save validation modules.
- Created procedural Web Audio sound synthesizer for lunar SFX, Quindar radio tones, retro-thruster burns, and ambient cosmic hum with zero external 404 dependencies.

#### Stage 2: 2D Top-Down Lunar Exploration Engine
- Developed custom 60fps HTML5 Canvas engine with 1/6th lunar gravity kinematics, smooth damped camera tracking (`1 - Math.exp(-k * dt)`), screen shake, and pooled particle bursts.
- Implemented multiple connected lunar exploration zones:
  - Landing Zone Alpha (Apollo/Artemis descent stage memorial)
  - Highlands Ridge (Titanium ore deposits and basalt boulders)
  - South Pole Permanently Shadowed Region (Cold Trap with cryogenic water ice)
  - Research Expansion Basin (Helium-3 volcanic vents)
- Added driveable Lunar Rover: press `R` or action dock button to mount for 2.2x speed, dynamic headlight cone, and rock-bumping suspension.
- Added following Pet companions (including Rocky, the sentient lunar rock with googly eyes).

#### Stage 3: Core Gameplay, Resources & Crafting
- Created resource catalog: Lunar Regolith, Metal Ore, Silicon, Water Ice, Titanium, Seeds, Geological Samples, Research Data, and Helium-3.
- Implemented Minecraft-inspired crafting and building system featuring all 14 authentic structures: Solar Panel, Battery, Habitat, Oxygen Generator, Water Storage, Water Recycler, Greenhouse, Research Lab, Rover Garage, Landing Pad, Radiation Shelter, Processing Facility, Communication Tower, and Medical Station.
- Built interactive construction placement system with ghost previews, 24px grid snapping, collision validation, and dust/damage maintenance mechanics.

#### Stage 4: Nine MOONBOUND Phases (M-O-O-N-B-O-U-N-D)
- M — Mission Preparation: Astronaut specialization, payload allocation, launch countdown.
- O — Orbit: Earth orbit insertion and interactive Translunar Injection (TLI) burn.
- O — Outbound Journey: Cislunar navigation with star tracker alignment and Van Allen radiation dosimeter.
- N — Navigation: South Pole landing site selection (Shackleton Rim vs Malapert Mountain).
- B — Braking & Landing: Powered descent initiation (PDI) with throttle retro-thruster landing checks and "Contact Light!" confirmation.
- O — Outpost: Deploying first habitat, solar arrays, batteries, and oxygen generator.
- U — Uncover: Surface exploration, rover driving, crater scanning, and finding water ice.
- N — Network: Constructing water recycler, research lab, and high-gain comms tower.
- D — Development: Crop harvesting, dust cleaning, and sustaining closed-loop ECLSS life support.

#### Stage 5: Economy, Avatars, Pets & 3D Armory
- SpaceDollars currency (`S✦`) starting balance of S✦150, earned through exploration, science challenges, and milestones.
- 6 Playable Astronaut Specialists: Engineer (orange), Scientist (blue), Explorer (green), Medic (white/red), Botanist (purple), Technician (yellow).
- 6 Space Pets: Space Dog, Space Cat, Space Monkey, Tardigrade, Space Tortoise, and Rocky.
- 10 Expressive Emotes: Wave, Moon Dance, Zero-G Spin, Salute, Moonwalk, Happy Bounce, Facepalm, Victory Dance, Rocky Hug, Confused Pose.
- Interactive Three.js 3D previewer with PBR studio lighting, `RoomEnvironment`, and turntable rotation for inspecting astronauts and pets.

#### Stage 6: Scientific Mission Knowledge & Space Codex
- Implemented Discover -> Understand -> Apply framework:
  - Scanning lunar geological features unlocks authentic NASA science briefings.
  - Interactive decision challenges require applying scientific logic to earn SpaceDollars and minerals.
- Space Codex library featuring authoritative NASA facts from Lunar Reconnaissance Orbiter, Apollo 11-17, Artemis, and LCROSS.

#### Stage 7: Persistent Saves & Export/Import
- Built IndexedDB persistence supporting multiple campaign slots (Slot 1, Slot 2, Slot 3).
- Added periodic autosave and manual save.
- Added JSON export and import validator with strict schema verification.

#### Stage 8: Cooperative Multiplayer
- Built Socket.IO server and client architecture.
- Real-time player synchronization, shared colony buildings, remote player nameplates, and emote broadcasts.

---

#### Stage 9: Judge-review fixes (Nov 2026)
- `npm install` failed on a clean copy (esbuild ^0.25 conflicted with Vite 8's peer range); removed the unused pin.
- Added real NASA space weather: `src/game/spaceWeather.ts` (live DONKI feed with honest archived fallback, verified flare archive, radiation facts with sources).
- New core trade-off: solar storm warnings with three costed choices, crew radiation meter (Chang'e-4 background rate), NASA 600 mSv limit ends the mission, storm report comparing the player's choice with NASA practice.
- Removed "free" choices: low-battery fix no longer grants +18 kWh; every alert option now costs power, food, oxygen, water or dose. Alerts can recur.
- Specialists now have downsides (`tradeoff` field); Scientist research bonus is now actually applied.
- Plain-language objectives (TLI, star tracker explained); Radiation Shelter unlocks on landing.
- Bug fixes: building placement could throw inside a React state updater; shop allowed negative balances and duplicate purchases; co-op buildings vanished after one second (colony tick overwrote them).
- Server: room cap of 4, placement validation, rejections reported to the player, `/api/space-weather` DONKI proxy with caching, `npm start` production mode that works on Windows.
- New UI: `components/SolarStormPanels.tsx`, `components/NasaDataModal.tsx`; storm tint and shelter lockdown in the canvas engine.
- Existing UI updated: HUD shows crew dose / live storm status (replaced the static "Rad: Moderate" label); specialist cards in Phase M and the Armory show each perk and its cost; title screen pitch + "NASA Data Used" button; Build menu shows the real (specialist-adjusted) material needs and the Medic surcharge; Settings lists all keys and explains browser-stored saves.
- Honesty fixes in UI copy: Mission Records "NASA Benchmark" → "Target Time" (they were never NASA numbers); Co-op lobby no longer promises a shared inventory.
- Bug fix: "Return to Title Screen" did not save and the title showed no Resume button until a page reload. Exiting, manual saves and autosaves now save and enable Resume.

### Verification & Testing
- `npm test`: 28 tests passing (`src/game/rules.test.ts`, `src/game/spaceWeather.test.ts`, `tests/server.test.ts`).
- `vite build` succeeds. Storm alert, storm report, mission-over and NASA data screens checked in a headless browser at desktop and phone widths.
- Full browser playthrough with the real components: title → all nine-phase landing sequence (M, O, O, N, B) → Outpost → building a Habitat → a real X5.8 storm warning → sheltering (movement locked) → storm report → Research Lab. No console errors.
- Not yet verified: live DONKI fetch from a normal network (the build sandbox blocks outside requests; the archived fallback was verified), and two-browser co-op.
