# Kurio Studio

Kurio Studio is a lightweight creative file toolkit for creators, designers, developers, and editors. It helps users convert, compress, resize, format, preview, and organize creative assets in one simple workspace.

Most core file tools run directly in the browser, keeping the workflow fast and reducing unnecessary server uploads. AI-powered helpers are available through a protected server-side API route with rate limits during public beta.

## Status

**Public Beta**

Kurio Studio is currently in public testing. Core tools are usable, while some advanced features are still being improved for reliability.

## Features

### Ready Tools

* **PDF to PNG Converter**
  Convert PDF pages into high-quality PNG images.

* **Image to PDF Converter**
  Combine one or multiple images into a PDF document.

* **PDF Merge**
  Combine multiple PDF documents into one ordered file.

* **PDF Resize**
  Resize PDF pages to A4, Letter, Legal, or custom dimensions.

* **PDF Compressor**
  Reduce PDF file size while keeping the document readable.

* **Document to Markdown**
  Extract text-based PDF, DOCX, TXT, or Markdown files into clean Markdown.

* **Image Compressor**
  Reduce image size while keeping usable visual quality.

* **Image Resizer**
  Resize images for design assets, social posts, and web usage.

* **JSON Formatter**
  Format, minify, clean, and inspect JSON files.

* **Lottie Preview**
  Preview Lottie JSON animations and inspect basic structure.

* **AI Helper**
  Use Gemini-powered helpers for workflow recommendations, file naming, and caption writing.

* **Smart Quick Drop**
  Drag and drop files anywhere on the home page for automatic tool routing.

* **Workspace Export**
  Export local workspace history to JSON for record-keeping and workflow audits.

* **Output Comparison**
  Compare original versus compressed files side-by-side to visually inspect quality.

* **Preset Social Canvas**
  Ready-to-use canvas presets for social media (Instagram, TikTok, LinkedIn, etc.) in the Image Resizer.

### Coming Soon

* Remove Background
* Lottie to MP4
* Advanced workspace history
* Account-based quota and usage tracking

## Tech Stack

* **Frontend:** Vite + React + TypeScript
* **Styling:** Tailwind CSS / custom CSS
* **Backend:** Express for local development
* **Deployment API:** Vercel Serverless Functions
* **AI:** Google Gemini API via protected server-side route
* **File Processing:** Browser APIs, Canvas, PDF/image utilities
* **Deployment:** Vercel

## Privacy-Focused File Processing

Kurio Studio is designed to keep common file operations lightweight and privacy-friendly.

Core tools such as PDF conversion, image compression, image resizing, JSON formatting, and Lottie preview are processed directly in the browser whenever possible.

AI Helper requests are handled through a backend proxy. API keys are never exposed to browser code.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run the production server locally if supported by the project scripts:

```bash
npm run start
```

## Environment Variables

Create a local `.env` file for development:

```env
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash
AI_DAILY_LIMIT=10
AI_MINUTE_LIMIT=3
AI_MAX_PROMPT_CHARS=2000
AI_RATE_LIMIT_ENABLED=true
```

Never expose Gemini keys using `VITE_` variables.

Do not create:

```env
VITE_GEMINI_API_KEY=your_key
```

Any variable prefixed with `VITE_` can be exposed to the browser.

## Vercel Deployment

Kurio Studio can be deployed to Vercel without migrating to Next.js.

The frontend remains Vite + React, while API routes are mirrored as Vercel Serverless Functions under `/api`.

Vercel settings:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Required Vercel Environment Variables:

```env
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash
AI_DAILY_LIMIT=10
AI_MINUTE_LIMIT=3
AI_MAX_PROMPT_CHARS=2000
AI_RATE_LIMIT_ENABLED=true
```

## Public Launch Guardrails

Before scaling this project publicly, the following should be improved:

* Add persistent account-based quota.
* Move rate limiting from in-memory storage to Redis, Supabase, or another persistent store.
* Add user authentication.
* Add database-backed usage logs.
* Add abuse prevention for AI endpoints.
* Add clearer privacy and terms pages.
* Add subscription or credit logic before monetization.

## Security Notes

* Do not commit `.env` files.
* Do not expose server-side API keys to browser code.
* Keep AI routes protected by rate limits.
* Validate uploaded file types before processing.
* Keep advanced paid or sensitive logic on the backend when needed.

## Project Direction

Kurio Studio aims to become a simple, fast, and useful creative utility platform for everyday file tasks.

The goal is not to replace professional design software, but to remove small workflow friction for creators who often need quick tools for PDFs, images, JSON, Lottie files, and AI-assisted creative work.

## License

This project is proprietary.

The source code is publicly visible or privately maintained for portfolio, review, and beta testing purposes only. Reuse, redistribution, modification, sublicensing, selling, or commercial use is not permitted without explicit written permission from the author.

Copyright (c) 2026 Cleo Firman Ferdinand. All rights reserved.
