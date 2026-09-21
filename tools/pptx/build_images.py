import os, urllib.request, urllib.parse, sys, time
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
RAW = "/tmp/actors/raw"; os.makedirs(RAW, exist_ok=True)

W = "https://upload.wikimedia.org/wikipedia/commons/"
# (film, idx, name, wiki_url or None). idx = reveal order 1..6
WIKI = [
 ("ghilli",1,"Ashish Vidyarthi", W+"d/db/Aashish_Vidyarthi.jpg"),
 ("ghilli",2,"Tanikella Bharani", W+"1/15/Tanikella_Bharani.jpg"),
 ("ghilli",3,"Prakash Raj", W+"1/14/Prakash_Raj_at_KLF_18_kozhikode.jpg"),
 # ghilli 4 = Dhamu via ddgs
 ("ghilli",5,"Trisha", W+"3/3a/Trisha_Krishnan_at_PS1_pre_release_event_%283%29_%28cropped%29.jpg"),
 ("ghilli",6,"Vijay", W+"0/06/C._Joseph_Vijay_%28cropped%29.jpg"),
 ("chandramukhi",1,"Nassar", W+"f/f4/Nassar_at_Oru_Kadhai_Sollattumaa_Audio_Launch_%28cropped%29.jpg"),
 ("chandramukhi",2,"Sonu Sood", W+"d/d5/Sonu_sood_colors_indian_telly_awards.jpg"),
 ("chandramukhi",3,"Vadivelu", W+"f/fc/Vadivelu_1_at_Trailer_%26_HD_Songs_Launch_of_Kaththi_Sandai_%28cropped%29.jpg"),
 ("chandramukhi",4,"Prabhu", W+"2/2a/Prabhu_at_Wagah_Audio_Launch.jpg"),
 ("chandramukhi",5,"Jyothika", W+"7/77/Jyothika_Filmfare_2014.jpg"),
 ("chandramukhi",6,"Rajinikanth", W+"d/d2/Rajinikanth_in_2019.jpg"),
 ("nanban",1,"Sathyaraj", W+"8/8b/Sathiyaraj.JPG"),
 ("nanban",2,"S J Suryah", W+"2/29/SJ_Surya_at_Iraivi_Press_Meet_%28cropped%29.jpg"),
 ("nanban",3,"Srikanth", W+"1/13/Srikanth_at_the_Curtain_Raiser_of_Chepauk_Super_Gillies.jpg"),
 ("nanban",4,"Jiiva", W+"4/43/Jiiva_latest_photoshoot.jpg"),
 ("nanban",5,"Ileana DCruz", W+"8/89/Ileana_D%27Cruz_grace_the_trailer_launch_of_Raid_%2816%29.jpg"),
 ("nanban",6,"Vijay", W+"0/06/C._Joseph_Vijay_%28cropped%29.jpg"),
]

def dl(url, path, tries=6):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer":"https://en.wikipedia.org/"})
            data = urllib.request.urlopen(req, timeout=40).read()
            open(path, "wb").write(data)
            return len(data)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5*(i+1)); continue
            raise
    raise RuntimeError("429 after retries")

manifest = []
for film, idx, name, url in WIKI:
    p = f"{RAW}/{film}{idx}.img"
    if os.path.exists(p) and os.path.getsize(p) > 2000:
        print(f"SKIP {film}{idx} {name}: exists"); manifest.append((film,idx,name,p,url)); continue
    try:
        n = dl(url, p); print(f"OK  {film}{idx} {name}: {n} bytes")
        manifest.append((film, idx, name, p, url))
        time.sleep(2)
    except Exception as e:
        print(f"ERR {film}{idx} {name}: {e}")

# Dhamu via ddgs — pick a non-film portrait
if os.path.exists(f"{RAW}/ghilli4.img") and os.path.getsize(f"{RAW}/ghilli4.img")>2000:
    manifest.append(("ghilli",4,"Dhamu",f"{RAW}/ghilli4.img","ddgs-cached"))
    import json; json.dump(manifest, open("/tmp/actors/manifest.json","w"))
    print("SKIP ghilli4 Dhamu: exists"); print("TOTAL", len(manifest)); sys.exit()
from ddgs import DDGS
with DDGS() as d:
    res = d.images("Dhamu Tamil actor comedian portrait", max_results=15)
bad = ("ghilli","movie","scene","comedy scenes","full movie","song")
pick = None
for r in res:
    t = (r.get("title") or "").lower()
    u = r.get("image","")
    if any(b in t for b in bad): continue
    if "ytimg" in u or "youtube" in u: continue
    try:
        if int(r.get("width") or 0) < 350: continue
    except (TypeError, ValueError):
        pass
    pick = r; break
pick = pick or res[0]
p = f"{RAW}/ghilli4.img"
dl(pick["image"], p)
print(f"OK  ghilli4 Dhamu (ddgs): {pick.get('width')}x{pick.get('height')} {pick.get('title','')[:40]}")
print("     src:", pick["image"])
manifest.append(("ghilli",4,"Dhamu",p,pick["image"]))

import json
json.dump(manifest, open("/tmp/actors/manifest.json","w"))
print("TOTAL", len(manifest))
