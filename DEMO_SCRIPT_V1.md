# RallyCoach Demo Script — V1 Draft (Under 3 Minutes)

## TARGET: Google Gemini 3 Hackathon Judges
### Scoring weights: Technical Execution (40%) | Innovation/Wow (30%) | Impact (20%) | Presentation (10%)

---

## [0:00–0:15] THE HOOK — The Problem (15 seconds)

**[SCREEN: Dramatic slow-motion of a player shanking a badminton clear into the net]**

**NARRATOR:**
"Badminton is the second most-played sport on Earth — 300 million players worldwide. Yet 99% of them have never had a single coaching session. They record shaky phone videos, squint at their form, and *hope* they're improving."

**[SCREEN: Quick montage — phone recording, confused player reviewing footage, YouTube tutorial]**

"What if you didn't need a coach standing behind you? What if your webcam *was* the coach — and it could react in under 500 milliseconds?"

---

## [0:15–0:30] THE REVEAL — Introducing RallyCoach (15 seconds)

**[SCREEN: RallyCoach landing page loads — dark premium UI with the tagline]**

**NARRATOR:**
"This is **RallyCoach** — a full-stack AI coaching platform that turns any browser into a personal badminton coach. No sensors. No wearables. No expensive equipment. Just you, your racket, and **Google Gemini 3**."

**[SCREEN: Quick flash of the architecture diagram showing the pipeline]**

"Webcam to MediaPipe to Gemini 3 Flash — coaching in under half a second."

---

## [0:30–1:15] CORE DEMO — Real-Time Practice Mode (45 seconds)

**[SCREEN: Click "Practice Mode" — webcam activates, skeleton overlay appears]**

**NARRATOR:**
"Here's where it gets real. MediaPipe runs entirely in your browser as WebAssembly — extracting 33 body landmarks at 30 frames per second with zero server load."

**[SCREEN: Player moves — skeleton turns GREEN, then RED as elbow drops]**

"See that? The skeleton just turned red. Our local rules engine evaluated five biomechanical rules — elbow angle, knee bend, stance width, body rotation — and caught a dropped elbow *instantly*."

**[SCREEN: Zoom into the coaching cue overlay showing: "Elbow higher on backswing" with commentary and reasoning]**

"But here's what makes RallyCoach different from any pose app. Every one to two seconds, **Gemini 3 Flash** receives the live pose metrics and returns structured coaching — not just *what* to fix, but *why*."

**[SCREEN: Highlight the AI Insights sidebar — show commentary, reasoning, and latency badge showing "340ms"]**

"Look at this: 'Your elbow is dropping to 128 degrees — you're losing 30% of your smash power.' And the reasoning: 'elbow angle 128 degrees is below the 150 degree threshold for overhead shots, reducing kinetic chain efficiency.' That's not autocorrect — that's coaching. And it arrived in 340 milliseconds."

**[SCREEN: Quick flash of the Gemini 3 structured JSON response with `thinkingBudget: 200`]**

"We use Gemini 3's **thinking tokens** with a budget of just 200 tokens for speed, and **ResponseSchema validation** — every response is guaranteed structured JSON. No regex. No prayer."

---

## [1:15–1:45] DEEP ANALYSIS — Gemini 3 Pro (30 seconds)

**[SCREEN: Switch to Analytics page — upload a video]**

**NARRATOR:**
"Real-time coaching is just the start. Upload any badminton video, and **Gemini 3 Pro** takes over with an extended thinking budget of 1,000 tokens."

**[SCREEN: Analysis results appear — issues ranked by severity, drills with instructions, 5-day training plan]**

"It identifies your top issues ranked by severity, generates targeted drills with step-by-step instructions, and builds a personalized 5-day training plan — all from your actual pose data. No generic tips. No cookie-cutter advice."

**[SCREEN: Show the AI-generated drill illustration from Gemini 3 Pro Image]**

"And **Gemini 3 Pro Image** generates visual drill instructions — showing you exactly how to position your body. Three models, three purposes, one coaching platform."

---

## [1:45–2:10] STRATEGY + RACKET FINDER (25 seconds)

**[SCREEN: Strategy Board — 3D court with shot trajectories]**

**NARRATOR:**
"Our 3D strategy board maps shots onto a BWF-regulation court using Three.js. It classifies every shot type — clears, drops, smashes, drives — scores recommendations by movement pressure and open-court exploitation, and visualizes where to attack."

**[SCREEN: Quick switch to Racket Finder — player profile entered, AI recommendations appear with match scores]**

"Even equipment selection is AI-powered. Tell Gemini 3 Flash your skill level and weaknesses, and it scores 15-plus rackets from Yonex, Li-Ning, and Victor — each with a match score and reasoning. 'The Astrox 99 Pro's head-heavy balance compensates for your weak rear-court clears.' That's not a product listing — it's personalized advice."

---

## [2:10–2:35] TECHNICAL DEPTH — Why Gemini 3 (25 seconds)

**[SCREEN: Architecture diagram — Client (MediaPipe WASM) → Next.js API → Gemini 3 (Flash/Pro/Image) → Supabase]**

**NARRATOR:**
"The architecture is deliberately hybrid. MediaPipe handles instant local evaluation — green or red in zero milliseconds. Gemini 3 adds the *intelligence* — contextual coaching that understands biomechanics."

"Three Gemini 3 breakthroughs made this possible:
- **Thinking tokens** — tunable reasoning depth. 200 tokens for real-time speed, 1,000 for deep analysis.
- **Structured output** with ResponseSchema — every response is typed JSON, enforced at the model level.
- **Sub-500ms Flash latency** — fast enough for active movement correction, not just post-game review."

**[SCREEN: Quick code snippet showing `thinkingConfig`, `responseSchema`, and latency measurement]**

"If Gemini goes down, the app doesn't. Cached responses fill the gap. The local rules engine never stops. Graceful degradation is built in."

---

## [2:35–2:55] IMPACT + CLOSING (20 seconds)

**[SCREEN: Split screen — player practicing alone vs. player with RallyCoach overlay, improving in real-time]**

**NARRATOR:**
"300 million players. Zero coaching access for most of them. RallyCoach makes expert-level coaching universally accessible — no hardware, no subscription, no barrier."

"This isn't a chatbot that gives tips after the fact. It's an AI coach that watches you move, explains what's wrong, tells you why, and does it all in under 500 milliseconds."

**[SCREEN: RallyCoach logo + tagline: "Your AI Coach. Powered by Gemini 3."]**

"**RallyCoach.** Your AI coach. Powered by Gemini 3."

---

## [2:55–3:00] END CARD (5 seconds)

**[SCREEN: Tech stack logos — Gemini 3, MediaPipe, Next.js, Three.js, Supabase. GitHub link.]**

---

## Key Phrases Designed for Judges:

### Technical Execution (40%)
- "Three Gemini 3 models, each tuned for its task"
- "ResponseSchema validation — guaranteed structured JSON"
- "Thinking tokens with configurable budget"
- "MediaPipe WASM — zero server load"
- "Sub-500ms full round-trip"
- "Hybrid AI architecture with graceful degradation"

### Innovation / Wow Factor (30%)
- "Transparent reasoning — see WHY each correction matters"
- "Not autocorrect — coaching"
- "340 milliseconds" (specific number = credibility)
- "The AI coach that explains its thinking"
- "Three models, three purposes, one platform"

### Potential Impact (20%)
- "300 million players, zero coaching access"
- "No hardware, no sensors, no wearables"
- "Universally accessible"
- "Expert-level coaching from a webcam"

### Presentation (10%)
- Clean architecture diagram
- Live demo (not slides)
- Specific latency numbers displayed
- Code snippets showing Gemini 3 integration
