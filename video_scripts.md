# CoThink: H0 Hackathon Video Scripts

This document breaks down the video submission into 4 parts as requested, maintaining continuity and an engaging explainer style.

---

## Video 1: The Problem (0:00 - 0:10)
**Goal:** Explain the issue and who we are solving it for.
- **Visual Footage:** A fast montage of a frustrated person looking at a cluttered screen with too many browser tabs, rigid text documents, and messy scattered notes.
- **Voiceover:** "For creators, researchers, and builders, standard note-taking apps kill creativity. Human thought isn't linear—it's fluid and connected. So why do we force our ideas into rigid, top-down documents?"

## Video 2: What We Are Building (0:10 - 0:20)
**Goal:** Introduce CoThink as the ultimate solution.
- **Visual Footage:** Quick, clean transition to the CoThink logo, followed by a smooth pan across a beautifully organized spatial canvas with interconnected nodes.
- **Voiceover:** "That's why we built CoThink. It's an AI-powered spatial workspace designed to work the exact way your brain does. It lets you capture, visually organize, and seamlessly evolve your thoughts without constraints."

## Video 3: The Demo (0:20 - 0:40)
**Goal:** Show the working application, UI design, and core features.
- **Visual Footage:** High-quality screen recording of the CoThink app in action.
  - *Action 1:* Show creating a thought node and typing quick text.
  - *Action 2:* Show dragging and dropping nodes on the 2D canvas to create a visual layout.
  - *Action 3:* Show the AI Sidebar opening up, and the user chatting with the AI to expand on a specific thought.
- **Voiceover:** "Let's see it in action. You can instantly map out your ideas on an infinite 2D canvas. Need inspiration? Chat directly with our integrated AI assistant to brainstorm, expand, and structure your thoughts right alongside your notes."

## Video 4: AWS Architecture & Tech Stack (0:40 - 1:00)
**Goal:** Explain the backend, focusing heavily on Amazon Aurora PostgreSQL.
- **Visual Footage:** Show the architecture diagram from your README (User → Vercel Edge/Next.js → App Logic → Amazon Aurora PostgreSQL & Gemini AI). Animate or highlight the database section.
- **Voiceover:** "Under the hood, we leverage Vercel v0 for rapid frontend iteration, but the real power is our database. To handle complex spatial relationships at scale, we rely on **Amazon Aurora PostgreSQL**. It gives us enterprise-grade relational integrity, while its JSONB support gives us the flexibility to store unstructured AI metadata perfectly. CoThink—built on the Zero Stack."
