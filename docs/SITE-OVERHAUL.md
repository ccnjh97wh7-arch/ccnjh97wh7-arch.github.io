# Site Overhaul

## Editorial direction

- Use a white paper background, dark ink, restrained red accents, and visible rules.
- Treat every page like part of one independent publication.
- Keep navigation short and consistent.
- Remove widgets, counters, repeated directories, games, and novelty sections that do not serve the work.
- Put the work, its context, and its creator first.
- Ask for collaboration before asking for money, while being direct that both are needed.

## Publishing principles

1. The site is an archive of personal work, not an endless content feed.
2. New material should have a reason to be here and enough context to make sense.
3. Collaborators are credited clearly.
4. Editing should preserve Eric's voice while improving structure, clarity, and readability.
5. Donations support production time, hosting, tools, and preservation.

## Substack article migration

**Reminder: Export every article from Substack and bring it here for proofreading, formatting, and publication.**

For each article:

- Preserve the original draft before editing.
- Proofread spelling, grammar, names, dates, and links.
- Flag confusing passages for Eric instead of inventing missing facts.
- Add a headline, deck, publication date, byline, and short context note.
- Format gossip columns with strong section breaks, pull quotes, source links, related archive links, and a clear update or correction note when needed.
- Use local images with useful alt text and record image credits.
- Publish the finished article on this site, then update or redirect the Substack version when appropriate.

## Music jukebox artwork

Cover art is controlled per track in `music-playlist.json` with the optional `art` field:

```json
{
  "title": "Track title",
  "artist": "Artist name",
  "art": "images/music-covers/track-title.jpg",
  "src": "music/track-title.mp3"
}
```

Recommended convention:

- Store covers in `images/music-covers/`.
- Use square JPG, PNG, or WebP files at least 1200 x 1200 pixels.
- Give every featured track its own `art` value.
- Keep the existing record graphic only as the fallback for tracks without artwork.

## Next passes

- Build the local article and gossip-column templates.
- Inventory and migrate Substack posts.
- Extend the print system from the homepage to writing, music, photos, and archive pages.
- Simplify the shared navigation and footer.
- Remove dormant homepage widget markup and JavaScript after the visual migration is accepted.
- Review each remaining page and remove anything that does not support its main purpose.
