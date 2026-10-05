# Revision Aid

A retrieval-practice app for **students**: pick a topic, answer each question
from memory, reveal, and say whether you got it. Cards you miss come back
sooner (Leitner boxes, 1–5; box 5 = mastered).

## Hosting

**GitHub Pages**, from the `main` branch root. Plain static HTML/CSS/JS, no
framework and no build step — matches the org convention.

Because students view it, the site is **public**. So:

- **No student data, ever.** No sign-in, no names, no analytics. Progress is
  stored only in the student's own browser (`localStorage`, key
  `revisionAidProgress`) and never leaves the device.
- Content is question/answer pairs only. Nothing in `decks/` should be
  anything you would not put on a public web page.

## Content

- `decks/index.json` — the catalog: `{ id, title, subject, year, count }`.
- `decks/{id}.json` — `{ title, cards: [{ q, a }] }`.
- Adding a topic = add the deck file and one catalog entry (keep `count` in sync).
- Progress is keyed by card **position**, so reordering or deleting cards in
  an existing deck shifts students' saved progress. Append new cards at the end.

## Run locally

`fetch` needs a server (not `file://`):

    python -m http.server 8020

then open http://127.0.0.1:8020
