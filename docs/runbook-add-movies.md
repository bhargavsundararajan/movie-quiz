# Runbook — discovering movies & constructing clues

How to grow / edit `data/movies.json` while keeping the quality bar. The golden
rule: **selection & clue-ordering are editorial (your judgment); cast membership
is verified against Wikipedia (never memory).**

## The clue formula (non-negotiable)

Each movie has exactly **6 clues** (actor names) in reveal order:

| Clue | Who | Why |
|------|-----|-----|
| 1–2  | Broad character artists — prolific across many films, **not** iconic for *this* film | maximum ambiguity; many films stay plausible |
| 3–4  | Actors **famous for this film** (memorable supporting role, villain, second lead) | narrows it down |
| 5–6  | The leads; **clue 6 = the hero** | makes it obvious by the end |

Also: no duplicate actor within a film; every clue name must be a real member of
that film's verified cast; the film should be identifiable by clue 5–6.

## Selection rules

- **Famous enough** that an average Tamil-cinema audience can identify it.
- **Category balance** (target mix, tune in `movies.json` `meta.category_targets`):
  `superstar 30 · midtier 20 · female_led 15 · character_driven 22 · troll_washout 13`
  (`troll_washout` = infamous memed flops). Aim for variety, not only A-tier hits.
- **Exclusions:** don't reuse the 16 films in the original `Games.pptx`
  (Sivaji, Ponniyin Selvan I, Vikram, Mankatha, Master, Super Deluxe, Mozhi,
  M. Kumaran S/O Mahalakshmi, Love Today, Maara, Maamannan, Naduvula Konjam
  Pakkatha Kaanom, Michael Madana Kama Rajan, Nala Damayanthi, Saamy, Villu).
  The playtest set `movies.demo.json` intentionally *does* use them.
- Each film needs **≥6 recognizable cast members** — deep cuts with tiny/unknown
  casts make bad photo clues; drop or replace them.

## Procedure

1. **Draft the candidate list** (titles + year + category + intended hero). This
   is editorial — use your Tamil-cinema knowledge. Do NOT write casts from memory.
2. **Verify casts against Wikipedia** (this is where correctness comes from).
   For each film, resolve its page (`Title` → `Title (film)` → `Title (YYYY
   film)`) and pull the billed cast from the Cast section wikitext:
   ```
   https://en.wikipedia.org/w/api.php?action=parse&page=<page>&prop=wikitext&format=json
   ```
   (or `index.php?action=raw`). Use a descriptive User-Agent, ~1.5s between
   requests, and back off on HTTP 429. Also capture reception (blockbuster / hit /
   average / flop / critically-acclaimed) to sanity-check the category.
   - At scale, **fan this out to ~4 parallel subagents** (25 films each) that each
     write a JSON chunk; then aggregate. This keeps the main context lean.
3. **Author the 6 clues** from each *verified* cast, applying the formula above.
   Reuse the approved examples as a style anchor:
   - Ghilli: `["Tanikella Bharani","Dhamu","Prakash Raj","Ashish Vidyarthi","Trisha","Vijay"]`
   - Chandramukhi: `["Nassar","Vadivelu","Prabhu","Sonu Sood","Jyothika","Rajinikanth"]`
4. **Add fields:** `id` (`slug-of-title-year`), `title`, `year`, `category`,
   `hero`, `answers` (lowercase title + spelling/transliteration variants used for
   fuzzy matching), `clues` (6), `poster_query` (`"<Title> <year> Tamil movie poster"`).
5. **Validate:** `python3 scripts/validate.py` — must report **0 issues**
   (100 films, 6 unique clues each, `clue[6] == hero` for non-ensemble, category
   counts hit targets, unique ids).
6. **Handle thin-cast / miscategorized films:** replace films with <6 recognizable
   cast; move a film whose real reception contradicts its category. Keep totals at
   target.
7. **Re-extract unique actors** for the asset pipeline (see the assets runbook),
   then fetch any new actors' photos + the new posters.

## Answers / aliases (`answers[]`)

Fuzzy matching (`src/fuzzy.js`) is case- and diacritic-insensitive and tolerates
~1 typo, and accepts a guess that *contains* the full answer ("the ghilli"). It
rejects mere fragments ("cha" ✗ "chandramukhi"). So `answers[]` should include:
common transliterations (`baasha`/`basha`), abbreviations people actually say
(`vtv`, `ps1`), and "with/without article/suffix" only if commonly used. Keep the
list tight — over-broad aliases make unrelated guesses pass.
