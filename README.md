# Thinking Engine

An AI-powered spatial workspace for capturing, organizing, and evolving your thoughts. Built for the **H0: Hack the Zero Stack with Vercel v0 and AWS Databases** hackathon.

## 🚀 Built With The Zero Stack
- **Frontend & Prototyping:** [Vercel v0](https://v0.dev) for generating the beautiful, responsive Next.js and Tailwind CSS UI in minutes.
- **Backend & Deployment:** [Vercel](https://vercel.com) for edge-ready Next.js Serverless deployments.
- **Database:** [Amazon Aurora PostgreSQL](https://aws.amazon.com/rds/aurora/) via Drizzle ORM for highly scalable, production-grade relational storage.

## 🏗 Architecture
```mermaid
graph TD
    User([User]) -->|Interacts with UI| Vercel[Vercel Edge Network / Next.js]
    Vercel -->|Server Actions / API Routes| Logic[Application Logic]
    Logic -->|Drizzle ORM| DB[(Amazon Aurora PostgreSQL)]
    Logic -->|Generate Content| AI[Google Gemini AI]
```

## 🧠 Why PostgreSQL?
We chose **Amazon Aurora PostgreSQL** over NoSQL alternatives for several critical reasons:
1. **Relational Integrity:** The app relies on complex relationships between users, folders, canvases, and spatial thoughts. PostgreSQL enforces strict foreign keys, ensuring data integrity as the user's "second brain" scales.
2. **JSONB Flexibility:** While thoughts are highly relational, they also contain unstructured metadata (tags, dynamic UI state, AI expansions). Postgres's `JSONB` support gives us the flexibility of a document store without sacrificing ACID compliance.
3. **Future Proofing (Vector Search):** With `pgvector`, we can seamlessly integrate vector embeddings directly alongside our relational data in Aurora, setting the stage for semantic search capabilities in future iterations.

## ✨ Features
- **Spatial Canvases:** Map out your thoughts visually on an infinite 2D canvas, drag-and-drop them to form connections.
- **AI Sidebar:** Chat with an AI assistant directly alongside your notes to brainstorm, expand, and structure your ideas.
- **Quick Capture:** Instantly jot down text or voice notes.
- **Folders & Organization:** Keep your thoughts neatly organized or pinned for quick access.

## 🛠 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/manish9701/cothink.git
   cd cothink
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy `.env.template` (or create `.env.local`) and configure your AWS Aurora PostgreSQL connection string and AI API keys:
   ```env
   DATABASE_URL="postgres://user:password@your-aurora-cluster.endpoint.aws.com/cothink"
   ```

4. **Run database migrations:**
   ```bash
   npm run db:push
   # or
   npx drizzle-kit push:pg
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.**

## 🌍 Vercel & AWS Architecture
This app utilizes the seamless integration of **Vercel** and **AWS Databases**. By leveraging Vercel v0, we went from idea to functional UI components in minutes. Because we connected the backend to **Amazon Aurora PostgreSQL**, the prototype is not just a demo—it's a production-ready application built to handle massive scale on day one.
