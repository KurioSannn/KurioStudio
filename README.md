# Kurio Studio

Kurio Studio is an all-in-one creative utility platform designed for creators, designers, developers, and editors. It provides localized, sandboxed tools to convert, clean, optimize, and prepare assets without the need for bloated, ad-ridden external servers.

## Key Features

1. **Client-Side Scalability**: Operations like PDF rasterization, image resizing, and compression occur natively in the browser's context via HTML5 Canva nodes, keeping payloads private.
2. **Interactive Lottie Inspecting**: Visualizes frames, layers, name attributes, and details, featuring a native JSON Color Palette extractor.
3. **Smart AI Assistant Hub**: Uses server-side Gemini models to suggest filenames, write copywriting captions, and parse workflow recommendations.
4. **Persistent Workspace History**: Restores transactions from secure, browser-isolated client storage caches.

## Local Operations Setup

1. Assemble package installations:
   ```bash
   npm install
   ```

2. Boot local development environment:
   ```bash
   npm run dev
   ```

3. Compile production builds:
   ```bash
   npm run build
   ```

## Design Language

- Soft minimalist warm light design palette.
- Accessible contrasting panels and high performance lift cards.
- Bold display typography ("Outfit/Inter").
- Absolute file security guarantee.

## Public Launch Guardrails

- Keep core conversion tools client-side when possible to reduce hosting and AI costs.
- Protect `/api/gemini` with strict quota and prompt length limits before public release.
- Do not expose `GEMINI_API_KEY` to browser code or public repositories.
- Treat Gemini-powered helpers as limited or premium features.
- Add persistent user accounts, subscription checks, and database-backed quota before charging users.
