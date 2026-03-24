# CCPhoto Platform Vision: AI-Powered Physical World Applications

## The Idea

Claude Code can see through your phone camera, understand what it sees, write software on the fly, and deploy custom UI back to your phone — all in a single conversation. No app store, no deployment pipeline, no code written by the user.

CCPhoto is the infrastructure. The next layer is **applications that emerge from conversations about the physical world.**

## What Makes This Unique

No existing system combines all five capabilities:

| Capability | What It Does | CCPhoto Component |
|-----------|-------------|-------------------|
| **Vision** | AI sees the physical world in real-time | Phone camera (photo + livestream) |
| **Voice** | Hands-free bidirectional communication | SpeechRecognition + TTS |
| **Push Events** | Physical world triggers the AI | MCP Channels |
| **Generative UI** | AI deploys custom interfaces to your pocket | 12-component JSON renderer |
| **Full-Stack Developer** | AI writes code, queries APIs, builds systems | Claude Code |

The key insight: **Claude Code is not just a chatbot — it's a developer.** It can create databases, write APIs, build MCP tools, generate UI, and wire everything together. Combined with phone-as-eyes, this becomes an AI that builds custom software for whatever physical situation you're in.

## Example Scenario: Workshop Inventory

User: *"I need to track inventory in my workshop"*

What happens in a single CC session:

```
1. Claude shows QR code → user scans with phone (one time)

2. User points camera at first shelf
   → Claude sees: resistors, capacitors, Arduino boards, wire spools
   → Claude WRITES a SQLite schema:
     CREATE TABLE inventory (
       id INTEGER PRIMARY KEY,
       name TEXT, category TEXT, quantity INTEGER,
       location TEXT, photo_path TEXT, last_seen TEXT
     )

3. Claude creates MCP tools on the fly:
   - add_item(name, category, quantity, location)
   - search_inventory(query)
   - update_quantity(id, delta)
   - low_stock_report()

4. Claude sends Generative UI to phone:
   - Card: "Workshop Inventory"
   - Metric: "0 items cataloged"
   - Checklist: scanning progress
   - Button: "Scan Next Shelf"

5. User keeps scanning shelves
   → Each photo: Claude identifies items, adds to database
   → Phone UI updates: "47 items cataloged across 6 categories"
   → Voice: "I see 20 470-ohm resistors on shelf 3. Added."

6. User asks: "Do I have any ATmega328P chips?"
   → Claude queries the database
   → Voice: "Yes, 3 units on shelf 2, row B"
   → Phone shows: item card with photo, location, quantity

7. Claude writes an alert script:
   → Checks inventory weekly
   → Notifies when items drop below threshold
```

**Total time: ~15 minutes. Result: a working inventory system with voice, camera, and custom UI.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                      │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Inventory │  │Inspector │  │  Repair  │  │  Custom  │ │
│  │  System  │  │  Audit   │  │  Guide   │  │   App    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │              │              │              │       │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐ │
│  │              CLAUDE CODE (the builder)                │ │
│  │  - Writes schemas, APIs, MCP tools on the fly        │ │
│  │  - Generates UI specs per context                    │ │
│  │  - Queries databases, calls external APIs            │ │
│  │  - Persists state between sessions                   │ │
│  └────┬─────────────────────────────────────────────────┘ │
│       │                                                    │
├───────┼────────────────────────────────────────────────────┤
│       │           INFRASTRUCTURE (CCPhoto)                 │
│       │                                                    │
│  ┌────┴─────────────────────────────────────────────────┐ │
│  │  Phone Camera + Mic + Generative UI + MCP Channels   │ │
│  │  ┌─────┐ ┌──────┐ ┌───────┐ ┌────────┐ ┌────────┐  │ │
│  │  │Photo│ │Live  │ │Voice  │ │  Push  │ │  12    │  │ │
│  │  │     │ │Video │ │In/Out │ │Events  │ │Compnts │  │ │
│  │  └─────┘ └──────┘ └───────┘ └────────┘ └────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Application Ideas (Prioritized)

### Tier 1: Build First (highest value, proven demand)

**1. Smart Inventory Manager**
- Scan items with camera → auto-catalog with AI vision
- SQLite database created on the fly by Claude
- Search by voice: "Where are my M3 screws?"
- Low-stock alerts via scheduled checks
- Export to CSV/spreadsheet
- Target: makers, small workshops, classrooms, warehouses

**2. Field Inspection / Audit Tool**
- Walk through a site photographing items
- Claude generates inspection checklists per item type
- Pass/fail logging with timestamped photos
- Auto-generated PDF report at the end
- Target: maintenance techs, building inspectors, safety auditors

**3. Interactive Repair/Assembly Guide**
- Photo of broken item → Claude diagnoses
- Step-by-step UI with tools list, parts needed, timers
- Livestream for real-time coaching
- Claude can look up parts catalogs and suggest purchases
- Target: DIY homeowners, bike mechanics, electronics hobbyists

### Tier 2: Build Next (high value, needs more infra)

**4. Visual Learning Tutor**
- Student photographs homework, lab setup, or textbook page
- Claude creates interactive lesson UI (explanations, quizzes, step-by-step)
- Tracks progress across sessions
- Teacher dashboard (could be a separate CC session viewing the data)
- Target: students, homeschoolers, tutoring centers

**5. Recipe / Cooking Assistant**
- Photo of ingredients → recipe suggestions with nutritional info
- Step-by-step cooking UI with timers for each stage
- Livestream watches technique, coaches in real-time
- Voice: "Is this done yet?" → Claude looks and answers
- Target: home cooks, meal preppers

**6. Accessibility Scene Narrator**
- Continuous description of the environment for visually impaired users
- Voice-only interface — no screen interaction needed
- "What's in front of me?" "Read that sign" "Is anyone nearby?"
- Could integrate with navigation apps
- Target: visually impaired users (huge impact, ~300M globally)

### Tier 3: Future (needs ecosystem maturity)

**7. Multi-Camera Monitoring Dashboard**
- Multiple phones as cameras around a space
- Claude monitors all feeds, alerts on events
- Custom dashboards per camera with relevant metrics
- Target: small businesses, home security, print farms

**8. AI-Guided Manufacturing**
- Camera over workbench, Claude watches assembly
- Real-time quality checks against reference specs
- Defect logging with categorization
- Yield metrics and trend analysis
- Target: small-batch manufacturers, makerspaces

## What Needs to Be Built (on top of CCPhoto)

CCPhoto provides: camera, voice, channels, generative UI, MCP tools.

The application layer needs:

### 1. Persistent State
Currently everything is ephemeral (per-session). Applications need:
- **SQLite database** that persists between sessions (Claude can create/query)
- **Session history** — remember what was scanned, said, and built
- **User preferences** — stored in `~/.ccphoto/apps/`

**Implementation**: Claude Code already has filesystem access. It can create SQLite databases and query them via shell commands or a lightweight MCP tool. No new infrastructure needed — just prompt engineering to make Claude use persistent storage.

### 2. App Templates / Catalogs
Pre-built prompt templates that bootstrap common applications:
- "Start inventory mode" → loads inventory prompt + schema + UI catalog
- "Start inspection mode" → loads inspection prompt + checklist templates
- Templates stored as markdown files in `~/.ccphoto/templates/`

**Implementation**: A set of markdown files that Claude reads at session start. Each template defines the schema, MCP tools to create, and UI patterns to use.

### 3. Export / Reporting
Applications need to produce output:
- **PDF reports** (inspection findings, inventory lists)
- **CSV export** (data tables)
- **Photo galleries** (annotated, organized by category)
- **Share links** (optional: upload report to a temporary URL)

**Implementation**: Claude Code can generate PDFs via markdown→PDF tools, write CSV files, and organize photos on disk.

### 4. Scheduled Tasks
Some applications need recurring work:
- Weekly inventory check: "Did anything change since last scan?"
- Print monitoring: "Alert me if the print fails" (runs continuously)
- Daily standup: "Photograph the board and summarize progress"

**Implementation**: Claude Code can create cron jobs or use the `/schedule` skill for recurring tasks.

### 5. Multi-Session Memory
Currently Claude Code conversations are independent. Applications benefit from:
- Remembering the inventory database across sessions
- Recalling what was inspected last time
- Building on previous interactions ("Last week you said the belt was worn...")

**Implementation**: Use CLAUDE.md or memory files to store application state pointers. Claude reads these at session start to resume context.

## Technical Approach

### What We DON'T Build
- No new npm packages or MCP servers
- No React app or web dashboard
- No backend services or cloud infrastructure
- No mobile app

### What We DO Build
- **Prompt templates** (markdown files) that guide Claude to create applications
- **SQLite schemas** that Claude generates and queries
- **UI spec patterns** (JSON templates) for common layouts
- **Export scripts** that Claude writes and runs

### The Magic
The "application" is not code we ship — it's a **conversation pattern** that Claude follows. The user says "start inventory mode" and Claude:
1. Reads the template
2. Creates the database if it doesn't exist
3. Connects to CCPhoto for camera/voice
4. Generates the UI
5. Runs the application loop

The application IS the conversation. Claude is both the developer and the runtime.

## Team & Process

### Who's Needed
- **1 prompt engineer** — designs the application templates and conversation flows
- **1 tester** (Stepan!) — tests with real hardware, real workshops, real use cases
- That's it. Claude Code builds everything else.

### Process
1. **Pick an application** (start with inventory — it's the most universal)
2. **Write the template** (a markdown file describing the schema, tools, UI patterns)
3. **Test it** — start a CC session, load the template, scan real items
4. **Iterate on the prompts** — refine based on what Claude gets wrong
5. **Package it** — add the template to `~/.ccphoto/templates/` for easy reuse
6. **Share it** — publish the template as a gist or in the CCPhoto repo

### Session Structure (for building)
```
Session 1: Design the inventory template
  - Write the markdown prompt
  - Define the SQLite schema
  - Define the UI patterns for scanning, searching, reporting

Session 2: Test with real items
  - Start CC with CCPhoto
  - Load the template
  - Scan Stepan's workshop
  - Fix issues in the template

Session 3: Add export + persistence
  - CSV export of inventory
  - Persist between sessions
  - Add "low stock" alerts

Session 4: Polish + share
  - Clean up the template
  - Write usage documentation
  - Share as a reusable template
```

## Success Metrics

**For the inventory app (first application):**
- [ ] Can catalog 50+ items in under 15 minutes
- [ ] Correctly identifies >80% of components from photos
- [ ] Voice search works: "Where are my Arduino Nanos?"
- [ ] Data persists between CC sessions
- [ ] CSV export produces a usable spreadsheet
- [ ] Generative UI shows item cards with photos, quantities, locations
- [ ] Works on phone hotspot (no corporate WiFi needed)

**For the platform:**
- [ ] A new application template can be created in <1 hour
- [ ] Templates are shareable (just a markdown file)
- [ ] Claude can bootstrap a new app type from a natural language description
- [ ] 3+ application templates published and tested

## Getting Started

In the next CC session:

```bash
# CCPhoto is already installed and published
npx ccphoto --setup  # if not already registered

# Start Claude Code
claude

# Then say:
"Let's build a workshop inventory system. I want to scan items
with my phone camera and have you catalog everything in a database.
Use CCPhoto for the camera and generative UI."
```

Claude will do the rest.

---

*This document was created on 2026-03-24 as a vision/roadmap for building applications on top of CCPhoto infrastructure.*
