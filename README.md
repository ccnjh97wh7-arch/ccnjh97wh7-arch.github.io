# ccnjh97wh7-arch.github.io
Website of Eric C. Stone

## Adding photos
- Drop new image files into the images folder.
- Run: python3 scripts/build-photo-list.py
- The gallery will then pick up the new files automatically.

## Pulp Time now showing
- The file pulptime-now-showing.json powers the "Now Showing" line on the homepage.
- It is updated automatically by .github/workflows/update-pulptime-now-showing.yml.
- To update manually, run: python3 scripts/update-pulptime-now-showing.py

## Cards inventory IDs
- The file cards.json is the inventory source for cards.html.
- To check/generate consistent card IDs (dry run): python3 scripts/build-cards-ids.py
- To apply ID updates to cards.json: python3 scripts/build-cards-ids.py --write
- To rebuild IDs for every card entry: python3 scripts/build-cards-ids.py --write --rewrite-existing

## Merch page
- The page merch.html is currently a Life of Jaffar mugs-first page.
- Fulfillment direction is Printful print-on-demand for lower-volume sales.
- Replace each "Product link coming soon" placeholder with live product URLs as mug listings go live.
