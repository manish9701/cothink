# Thinking Engine (Cothink) - H0 Hackathon Video Script

**Target Duration:** ~2-3 Minutes
**Theme:** "Hack the Zero Stack with Vercel v0 and AWS Databases"

---

## 🎬 Intro (0:00 - 0:20)
**Visuals:** 
- Start with a quick, engaging hook. Show a screen recording of the Thinking Engine in action—a user dragging and dropping ideas onto an infinite 2D canvas while the AI sidebar generates related concepts.
- Title overlay: **"Thinking Engine: Your AI-Powered Spatial Workspace."**

**Audio (Voiceover):** 
"Have you ever felt constrained by linear note-taking apps? For the H0 Hackathon, we built the **Thinking Engine**—a spatial workspace where you don't just capture thoughts, you evolve them visually. By combining Vercel v0 for an ultra-fast UI and AWS Databases for scalable storage, we created a second brain that truly works the way you think."

---

## 🏗️ The Problem & Solution (0:20 - 0:50)
**Visuals:** 
- Show a split screen. On the left, a traditional boring list of notes. On the right, the Thinking Engine spatial canvas organizing those notes dynamically. 
- Highlight the **Vercel v0** workflow. Show a brief snippet of typing a prompt into v0 and generating the Next.js/Tailwind components.

**Audio:** 
"When we have complex ideas, we need to see the connections. We used **Vercel v0** to rapidly prototype and generate our Next.js UI in minutes, moving from idea to interactive prototype instantly. The result is a beautiful, responsive frontend that lets users interact with their data on an infinite 2D canvas, completely friction-free."

---

## 🗄️ Architecture & AWS Databases (0:50 - 1:30)
**Visuals:** 
- Transition to the architecture diagram (you can use the newly created Mermaid diagram here). 
- Zoom in on the **AWS Cloud Database** section.
- Briefly show the `schema.ts` file highlighting the Drizzle ORM setup with Postgres.

**Audio:** 
"But a beautiful frontend needs a robust, production-ready backend. That's why we bypassed local toy databases and went straight to **Amazon Aurora PostgreSQL**. 
Because our app relies on complex relationships between users, folders, canvases, and spatial coordinates, Aurora enforces strict relational integrity. At the same time, we leverage Postgres's `JSONB` support to store dynamic, unstructured metadata. Connecting it all is **Drizzle ORM** running entirely on **Vercel Serverless Functions** for instant edge performance."

---

## 🧠 AI Integration (1:30 - 2:00)
**Visuals:** 
- Demo the AI sidebar. Show a user asking the AI to 'expand on this idea', and watch the AI generate a new node on the canvas in real-time.
- Show the Vercel AI SDK streaming response in the UI.

**Audio:** 
"To make the workspace truly intelligent, we integrated **Google Gemini AI** using the **Vercel AI SDK**. As you map out your ideas, the AI acts as a collaborative partner, generating new nodes, linking concepts, and streaming responses directly into your components seamlessly."

---

## 🚀 Conclusion (2:00 - 2:15)
**Visuals:** 
- Fast montage of the app's best features: Quick capture, dragging nodes, folders.
- Final slide: "Thinking Engine - Built on the Zero Stack. Try it out on GitHub!"

**Audio:** 
"The Thinking Engine proves that with the Zero Stack—Vercel v0, Next.js, and Amazon Aurora—you can build scalable, production-grade applications at hackathon speeds. Thank you for watching!"
