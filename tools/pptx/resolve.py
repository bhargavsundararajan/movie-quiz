import sys, json, urllib.request, urllib.parse

UA = "DeckBuilder/1.0 (personal quiz)"

def get(title):
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e:
        return (title, "ERR", str(e)[:40], "NONE")
    img = (d.get("originalimage", {}) or {}).get("source") or (d.get("thumbnail", {}) or {}).get("source") or "NONE"
    return (title, d.get("type", ""), (d.get("description") or "")[:45], img.split("?")[0])

titles = [
    # Nanban re-fetch
    "Sathyaraj", "S. J. Suryah", "Srikanth (Tamil actor)", "Jiiva", "Ileana D'Cruz",
    # Ghilli replacement candidates for the 2 missing comedians
    "Mayilsamy", "Manivannan (actor)", "Vijayakumar (actor)", "Nadhiya", "Ramesh Khanna (actor)",
]
for t in titles:
    r = get(t)
    print("\t".join(r))
