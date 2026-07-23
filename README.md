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
