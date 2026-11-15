# MOONBOUND

> **One Moon. Nine Phases. One Mission: Make It Home.**  
> Built for the **NASA International Space Apps Challenge**.

MOONBOUND is a 2D top-down lunar exploration and colony game for ages 7–12. Its core lesson is a real mission-planning trade-off: **real NASA solar flares** (from the DONKI space weather database) hit your base, and you must choose between protecting the crew from radiation, keeping work going, or spending building materials on shielding. No choice is free.

## 🛰️ NASA data used (for judges)

| What | Real source | How the game uses it |
|---|---|---|
| Solar storms | [NASA DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) flare records: live (last 30 days) when reachable, otherwise 5 archived X-class flares from May & Oct 2024 ([NASA SVS](https://svs.gsfc.nasa.gov/14589), [Solar Cycle 25 blog](https://science.nasa.gov/blogs/solar-cycle-25/2024/10/03/sun-releases-strong-solar-flare-6)) | Each storm is one real flare: date, class, sunspot region and source link shown in game. Labelled **Live** or **Real past event**, never faked as live. |
| Everyday Moon radiation | 1,369 µSv/day measured by Chang'e-4 LND ([Zhang et al. 2020, Science Advances](https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html)) | Crew radiation meter rises at this rate. |
| Radiation limits | [NASA-STD-3001 / OCHMO radiation brief](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf): 600 mSv career, 250 mSv per solar event, storm shelter guidance | 600 mSv ends the mission ("bring the crew home"); storm doses are tuned under 250 mSv. |
| Real storm reading | [NASA/JPL: Curiosity RAD, May 20 2024](https://www.nasa.gov/?p=670127): 8,100 µGy ≈ 30 chest X-rays | Shown in the storm report. |

Simplifications are listed in-game (title screen → "NASA data used in this game"): storm doses and shielding percentages are game estimates, and every flare causes a radiation storm so players can practise.

### The trade-off loop
1. A real flare arrives with a 40-second warning.
2. Choose: **hide in the shelter** (lowest dose, but nobody can move, mine or build and the greenhouse switches off), **pile Moon dirt on the habitat** (half dose, costs 6 Regolith), or **keep working** (+5 Research Data, full dose). No plan = full dose.
3. A storm report compares your choice with what NASA actually does.

Colony alerts work the same way (every fix costs power, food, oxygen or radiation dose), and every astronaut specialist has a downside as well as a perk.

---

## 🚀 Quick Local Launch

### Prerequisites
- Node.js LTS (v20 or v22)
- npm (v9+)

### Installation & Run
```bash
npm install        # install dependencies
npm run dev        # dev server + multiplayer on http://localhost:3000
npm test           # 28 rule tests (economy, simulation, storms, saves, server validation)
npm run build      # production frontend into ./dist
npm start          # serve ./dist + multiplayer (production mode, works on Windows too)
```

Optional: set `NASA_API_KEY` (free at https://api.nasa.gov/) in `.env` so the server's `/api/space-weather` proxy isn't limited by `DEMO_KEY` rate limits. Without internet the game still runs using the archived real events.

---

## 🎮 Game Controls

| Action | Keyboard | Mouse / trackpad |
|---|---|---|
| Walk (or drive the rover) | **W A S D** or **arrow keys** | Click reachable ground (a marker shows where you are going) |
| Use / collect / open / set up | **E** | Click the object: you walk into range and use it |
| Scan nearby rocks | **F** | Scan button |
| Build | **B**, then click the ground or press **E** to place | Build button |
| Backpack | **I** | Backpack button |
| Get in / out of the rover | **R** | Rover button, or click the rover |
| Emotes | **Q** | |
| Lab and base problems | **U** | Lab button |
| Science Log | **K** | |
| Hint | **H** | Hint button |
| Mute | **M** | Speaker button |
| Close, cancel placement, then pause | **Esc** | Menu button |

Keyboard movement always overrides a click-to-move path. No right-click, mouse wheel or dragging is needed.
The card at the top left always shows the current step, the key to press, and progress. A marker in the world points at the target.

---

## 🌕 The Nine Missions

The trip to the Moon (missions 1 to 5) is played on short, hands-on console screens. From the landing on, you walk the lunar south pole.

| Letter | Phase | Mission | What you do | Done when |
|---|---|---|---|---|
| **M** | **Mission Prep** | Get ready to fly | Pick an astronaut, use a crane to load 3 kits into the cargo bay, then fly through clouds and birds. Dodge obstacles, collect fuel and coins, and drop boosters on cue. | All 3 kits packed and rocket reaches space. |
| **O** | **Orbit** | Reach for the Moon | Hold W to open the solar wings, then press Space to fire the engine inside the green arc. | Burn fired within the correct window. |
| **O** | **Outbound** | Cross to the Moon | Navigate an asteroid field while collecting fuel and coins. When the Sun flares, shelter in the lane behind the water tanks. | Flight completed and crew sheltered. |
| **N** | **Navigation** | Choose where to land | Fly a scanner drone using arrow keys or the mouse to survey three sites. Compare the options and select a south pole site. | South pole landing site locked in. |
| **B** | **Bootdown** | Land gently | Use Space to brake and ← → to steer onto the lit landing pad at under 3 m/s with limited fuel. Press E to step outside. | Safe touchdown on the pad and astronaut steps out. |
| **O** | **Outpost** | Build your base | Walk off the lander, open the crate, and build a habitat, a solar panel in at least 60% sunlight, and a battery. Press E to connect the oxygen generator. | Habitat built, sunny panel and battery installed, and oxygen connected. |
| **U** | **Uncover** | Find frozen water | Drive the rover, scan 3 different rocks, scan the shadowed crater, and collect 3 ice samples. | 3 distinct rock scans, crater scanned, and 3 ice samples collected. |
| **N** | **Network** | Connect the base | Build and set up a water recycler by ordering its parts, a lab by choosing the iron-rich rock, and a radio tower by aiming its dish at Earth. | Water recycler, lab, and radio tower all set up. |
| **D** | **Development** | Make it home | Grow and harvest greenhouse crops, brush dust off a solar panel, and keep oxygen, water, and power healthy for 20 seconds. | Crops harvested, panel cleaned, and resources maintained for 20 seconds. |

### Base jobs (repeatable, earn coins)

Once you're on the Moon, a **Base jobs** list under the mission card shows chores that pay SpaceDollars (✦). Click one and your astronaut walks there.

| Job | What you do | Pays |
|---|---|---|
| 🧽 Clean a panel | Rub the Moon dust off a solar panel with your mouse (or hold Space) | 8 ✦, full sunlight again |
| 🌱 Moon garden | Pick ripe crops, sow seeds, water each pot; or water young plants to grow them faster | 12 ✦ (4 ✦ for watering) + food |
| ⚡ Fix power line | Turn wire tiles to connect the solar panel to the battery | 15 ✦ + battery charge |

Dust builds up and power runs low at night, so the jobs come back. Spend coins in the Shop on astronauts, pets and emotes. No loot boxes, no timers that punish you for leaving.

Each mission ends with a celebration, a badge, SpaceDollars (paid once), new blueprints, and a visible change to the base. The last mission ends the campaign with a finale; after that you can keep exploring.

---

## 💎 SpaceDollars & Economy

The in-game currency is **SpaceDollars** (`S✦`), with an initial starting balance of **S✦150**.
- **Earning:** Complete phase objectives, scan geological formations, solve Mission Knowledge challenges, and discover cold traps.
- **Spending:** Construct essential survival buildings (which require both resources and SpaceDollars) or unlock cosmetics in the Armory.
- **Fair Economy:** Cosmetics require **SpaceDollars only**—never crafting materials.

---

## 🧑‍🚀 Astronaut Specialists & Pets

### 6 Playable Astronauts
1. **Engineer (Orange):** Builds structures 15% faster with a 10% material discount.
2. **Scientist (Blue):** +50% research telemetry points and unlocks hidden scientific data.
3. **Explorer (Green):** 40% larger scanner radar radius and 10% faster terrain movement.
4. **Medic (White/Red):** Reduces crew oxygen and water drain by 20%.
5. **Botanist (Purple):** Boosts greenhouse crop harvest yield by 35% with 25% water savings.
6. **Technician (Yellow):** Repairs damaged and dusted systems twice as fast.

### 6 Space Pets
1. **Space Dog (Astro):** Barks and points toward mineral deposits.
2. **Space Cat (Nova):** Occasionally discovers small rare caches.
3. **Space Monkey (Newton):** Helps collect nearby surface samples.
4. **Tardigrade (Moss):** Research bonus during extreme thermal conditions.
5. **Space Tortoise (Shelldon):** Identifies hidden exploration points.
6. **ROCKY:** Sentient lunar rock companion with expressive eyes and bonus mineral finds!

---

## 🔬 Science and sources

Science shows up in three layers: a short line in play (mission steps and hints), a one-line discovery note the first time you scan something new (it never pauses the game), and the Science Log (K) with the full entry and its source.

- Solar storms use real NASA DONKI flare/CME records: live when the API is reachable, otherwise an archived set of real events. The game says which one it is using.
- Radiation numbers are anchored to published values (Chang'e-4 surface dose, NASA-STD-3001 limits); storm doses are simplified estimates.
- Links are labelled for what they are. General pages are marked "general reference" (for example [NASA Science: Moon](https://science.nasa.gov/moon/)); the [Lunar Orbital Data Explorer](https://ode.rsl.wustl.edu/moon/) hosts LRO data; the [Planetary Data System](https://pds.nasa.gov/) link is the archive home; [LCROSS](https://science.nasa.gov/mission/lcross/) is the mission page.
- Landing-site comparisons use qualitative low/medium/high bars rather than invented percentages.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **2D Engine:** Custom HTML5 Canvas 60fps simulation with damped camera kinematics.
- **3D Graphics:** Three.js with PBR `RoomEnvironment`, `ACESFilmicToneMapping`, and procedural models.
- **Audio:** Custom procedural Web Audio API synthesizer (no external audio files/404s).
- **Storage:** Persistent IndexedDB with JSON backup import/export.
- **Backend & Multiplayer:** Node.js, Express, Socket.IO.
- **Testing:** Node.js built-in test runner (`node:test`, `node:assert/strict`), run with `npm test`.

---

## 🌐 Multiplayer Architecture & Deployment

### Local Multiplayer Testing
Two browser tabs or separate computers on the same local network can connect to `http://localhost:3000` with the same room code (e.g. `artemis-base-1`) to explore the Moon and build together.

Rooms hold up to 4 crew. The server checks every building placement (known building, on the grid, inside the map, no overlaps, rate-limited) and tells the player when it refuses one. Materials and SpaceDollars are still charged on each player's own client; a shared server-side economy is not built yet.

### Production Deployment
- `npm run build`, then `npm start` serves `./dist` plus multiplayer from one Node process (Render, Cloud Run, Railway, etc.).
- GitHub Pages can host the `dist` folder for single-player only. It cannot run the multiplayer server, and the client currently connects to its own origin.

---

### Link to Project
- [https://moonbound-delta.vercel.app/](url)

---

## 📜 Asset Credits & License
- Procedural code-authored 2D sprites, Three.js 3D models, and Web Audio synthesizers created specifically for MOONBOUND.
- Scientific facts and mission details derived from NASA public domain research.
- Released under the Apache 2.0 License.

---

## Known limitations
- Storm doses and shielding percentages are simplified game estimates (anchored to NASA limits), not physics simulations.
- The colony simulation advances 0.5 sim-seconds per real second, so one lunar day lasts about 16 real minutes.
- Mission Records "benchmark" times are game targets, not NASA records.
