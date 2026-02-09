# RallyCoach — Final Demo Script (Under 3 Minutes)

## Optimized for Google Gemini 3 Hackathon Judging
### Technical Execution 40% | Innovation/Wow 30% | Impact 20% | Presentation 10%

---

## [0:00–0:10] THE HOOK — Make Them Feel It (10 seconds)

**[SCREEN: Close-up of a player hitting a shuttle — it crashes into the net. Player shakes their head.]**

**NARRATOR (personal, direct voice):**
"I've played badminton for years. I've watched dozens of YouTube tutorials. But I still couldn't figure out why my smash kept dying at the net."

**[SCREEN: Quick cuts — phone recording, slow-mo replay, confused look at footage]**

"What if you didn't need a $60-an-hour coach? What if your webcam could coach you — in real time — and *explain* what's wrong?"

---

## [0:10–0:20] THE REVEAL (10 seconds)

**[SCREEN: RallyCoach landing page — dark, premium UI. Smooth scroll to feature showcase.]**

**NARRATOR:**
"This is **RallyCoach** — an AI coaching platform powered by **Google Gemini 3**. No sensors. No wearables. Just a browser and a webcam."

**[SCREEN: Flash the architecture pipeline — Webcam → MediaPipe WASM → Gemini 3 Flash → Coaching Cue <500ms]**

---

## [0:20–1:05] THE LIVE DEMO — Show, Don't Tell (45 seconds)

**[SCREEN: Click into Practice Mode. Webcam activates. Green skeleton overlay appears on the player's body.]**

**NARRATOR:**
"Watch this. MediaPipe runs entirely in my browser — 33 body landmarks tracked in real time. No server. No lag. That green skeleton means my form is good right now."

**[SCREEN: Player starts an overhead swing — as the elbow drops, the skeleton SNAPS to red. Freeze-frame. Zoom in on the elbow joint with a subtle highlight effect.]**

"There. Frame-by-frame, the skeleton just turned red. My elbow dropped. But here's where Gemini 3 changes everything."

**[SCREEN: Camera pulls back to show the full UI. Highlight the coaching cue overlay at the bottom and the AI Insights sidebar on the right.]**

"Look at the bottom of the screen. Gemini 3 Flash just sent this back in 340 milliseconds:"

**[SCREEN: Zoom into the coaching cue: "Elbow higher on backswing"]**

"The cue: *Elbow higher on backswing.*"

**[SCREEN: Zoom into the commentary panel]**

"The commentary: *Your elbow is dropping to 128 degrees — you're losing 30% of your smash power.*"

**[SCREEN: Zoom into the reasoning field]**

"And here's what no other coaching app gives you — the **reasoning**: *elbow_angle=128° is below the 150° threshold for overhead shots, reducing kinetic chain efficiency.*"

"Other apps say 'fix your elbow.' Gemini 3 explains *why* — and does it while you're still moving."

**[SCREEN: Player adjusts. Next swing — skeleton stays GREEN. The coaching cue updates to "Great form! Keep it up!" Latency badge shows "287ms".]**

"I adjusted. Next rep — green. The AI saw the fix in 287 milliseconds. That's not post-game analysis. That's a coach watching me swing."

---

## [1:05–1:15] THE TECHNICAL HOOK — Why Gemini 3 (10 seconds)

**[SCREEN: Quick split — left shows a code snippet of the Gemini call with `thinkingConfig: { thinkingBudget: 200 }` and `responseSchema`, right shows the structured JSON response.]**

**NARRATOR:**
"Under the hood: Gemini 3's **thinking tokens** — budgeted at just 200 tokens for speed. **ResponseSchema** validation — every response is typed, structured JSON. No regex hacks. No prompt-and-pray. And if Gemini goes down? Our local rules engine keeps coaching. The app never stops."

---

## [1:15–1:55] DEEP ANALYSIS — Gemini 3 Pro (40 seconds)

**[SCREEN: Switch to the Analytics page. Upload a video file.]**

**NARRATOR:**
"Real-time coaching handles the moment. But what about the big picture? Upload any badminton video, and **Gemini 3 Pro** takes over — with an extended thinking budget of 1,000 tokens for deep reasoning."

**[SCREEN: Analysis results load — show the top issues panel with severity badges (HIGH, MEDIUM)]**

"It identifies your top issues, ranked by severity. Here — 'Overhead elbow position: HIGH severity.' 'Knee bend during recovery: MEDIUM.'"

**[SCREEN: Scroll to drills section with step-by-step instructions]**

"Then it generates targeted drills — not generic tips, specific instructions based on YOUR pose data: 'Pause at the contact point. Check that your elbow is above 150 degrees. Repeat 20 times.'"

**[SCREEN: Show the 5-day training plan]**

"And it builds a **personalized 5-day training plan** — Day 1: Footwork Basics. Day 3: Combined Practice. Day 5: Match Play."

**[SCREEN: Show the AI-generated drill illustration from Gemini 3 Pro Image]**

"**Gemini 3 Pro Image** even generates visual drill instructions — showing you exactly how to position your body. Three Gemini 3 models. Three purposes. One coaching platform."

---

## [1:55–2:15] STRATEGY + THE FULL PICTURE (20 seconds)

**[SCREEN: 3D Strategy Board — interactive Three.js court with shot trajectories rendering in real time]**

**NARRATOR:**
"Our 3D strategy board maps every shot type onto a BWF-regulation court — clears, drops, smashes, drives. It scores where to attack based on movement pressure and open-court exploitation."

**[SCREEN: Quick flash — Dashboard with Recharts progress graphs showing form scores trending upward over multiple sessions]**

"And the dashboard tracks your progress over time. Session after session, you can see your form score climbing — from 62% in week one to 89% by week four. That's not a demo. That's real improvement."

---

## [2:15–2:35] ARCHITECTURE — How It All Connects (20 seconds)

**[SCREEN: Clean architecture diagram animating layer by layer:]**
**Browser (MediaPipe WASM) → Next.js 14 API Routes → Gemini 3 (Flash / Pro / Pro Image) → Supabase (Auth, DB, Storage)**

**NARRATOR:**
"The architecture is deliberately hybrid. MediaPipe handles instant local detection — green or red in zero milliseconds. Gemini 3 adds contextual intelligence — nuanced coaching grounded in biomechanics."

**[SCREEN: Table showing the three models with their thinking budgets and latencies]**

"Flash for live coaching at 200 thinking tokens. Pro for deep analysis at 1,000. Pro Image for visual drill instructions. Each model tuned for its job."

---

## [2:35–2:55] IMPACT + THE CLOSE (20 seconds)

**[SCREEN: Split screen — left: player practicing alone with no feedback. Right: same player with RallyCoach, skeleton overlay, coaching cues, AI commentary flowing in real time.]**

**NARRATOR:**
"300 million people play badminton. Most will never afford a coach. RallyCoach doesn't replace the coach — it puts one in every browser, for free."

"This isn't a chatbot that gives tips after the fact. It's an AI that watches you move, catches what you miss, explains why it matters, and does it all before your next swing."

**[SCREEN: Fade to RallyCoach logo on dark background. Tagline appears letter by letter:]**

**"Every athlete deserves a coach who never sleeps."**
**Powered by Google Gemini 3.**

---

## [2:55–3:00] END CARD (5 seconds)

**[SCREEN: Tech stack logos arranged cleanly — Google Gemini 3, MediaPipe, Next.js 14, Three.js, Supabase, FastAPI. GitHub repo link below.]**

---

# PRODUCTION NOTES

## Visual Direction for Recording

### Key Moments to Nail:
1. **0:30 — The Red Skeleton Snap**: This is your "wow" frame. Use screen recording with a slight zoom-in when the skeleton turns red. Add a subtle pulse/glow effect in post-production if possible.

2. **0:40 — The Three-Layer Zoom**: Cue → Commentary → Reasoning. Each gets 3 seconds of focused attention. Use smooth pan-down animation between them.

3. **0:55 — The Fix**: Player adjusts and skeleton goes green. This is the payoff. Let the "287ms" latency badge be visible.

4. **1:10 — Code Snippet**: Show REAL code, not pseudo-code. The `thinkingConfig` and `responseSchema` lines from `gemini.ts` are visually distinctive and technically impressive.

5. **1:40 — Drill Illustration**: The AI-generated image is a "holy shit, it can do that too?" moment. Give it 3 full seconds on screen.

6. **2:00 — Progress Chart**: The upward trend line tells the story of improvement without words. Let it breathe for 2 seconds.

## Pacing Guidelines:
- **NEVER spend more than 8 seconds talking without a screen change**
- **Every sentence should either SHOW something or PROVE something**
- **Cut any sentence that starts with "We also..." or "Additionally..."**
- **The first 15 seconds determine whether judges keep watching — make them visceral**

## Voice/Tone:
- Conversational, not corporate
- Confident, not boastful ("This is how it works" not "We brilliantly engineered...")
- Specific numbers always ("340 milliseconds" not "very fast")
- Personal connection at the start, technical authority in the middle, emotional impact at the end

## What NOT to Say:
- "Full-stack" (overused hackathon buzzword)
- "End-to-end" (means nothing to judges)
- "Leveraging" (corporate speak)
- "Game-changer" (prove it, don't say it)
- "Unprecedented" (let judges decide)
