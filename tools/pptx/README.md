# PPTX generators (reference / archival)

Session tooling used to build the original PowerPoint proof-of-concept deck
before the web app existed. **Not part of the web game** and not needed to run
it — kept for reference in case a .pptx export is ever wanted again.

- `build_images.py` — downloads actor portraits (Wikipedia + `ddgs`) and
  cover-crops them to uniform squares.
- `build_slides.py` — writes Netflix-style slide XML with click-to-reveal
  entrance animations and packages a `.pptx`.
- `resolve.py` — ad-hoc Wikipedia portrait-URL resolver.

Caveat: these hard-code session paths under `/tmp` (e.g. `/tmp/newdeck`,
`/tmp/actors`) and expect an extracted `.pptx` skeleton. Adjust the paths before
re-running. For the web app's assets, use `scripts/fetch_assets.py` instead.
