#!/usr/bin/env python3
"""Generate slide2/3/4 (.xml + .rels) for the Guess-the-Tamil-Movie deck.
Uniform 3x2 grid of equal square tiles; 6 click-triggered Appear reveals."""
import os

DECK = "/tmp/newdeck"
MEDIA = f"{DECK}/ppt/media"
SLIDES = f"{DECK}/ppt/slides"
RELS = f"{SLIDES}/_rels"

T = 2100000                       # square tile side (EMU)
COLS = [1193400, 3522000, 5850600]
ROWS = [400000, 2728600]
POS = [(COLS[0],ROWS[0]),(COLS[1],ROWS[0]),(COLS[2],ROWS[0]),
       (COLS[0],ROWS[1]),(COLS[1],ROWS[1]),(COLS[2],ROWS[1])]

# slideN -> (film media prefix, [(display name, media basename) in reveal order])
# Order: clues 1-2 = broad-filmography, NOT iconic-for-this-film; narrows to the star by clue 6.
SLIDES_DEF = {
 2: ("ghilli", [("Tanikella Bharani","ghilli2"),("Dhamu","ghilli4"),("Prakash Raj","ghilli3"),
                ("Ashish Vidyarthi","ghilli1"),("Trisha","ghilli5"),("Vijay","ghilli6")]),
 3: ("chandramukhi", [("Nassar","chandramukhi1"),("Vadivelu","chandramukhi3"),("Prabhu","chandramukhi4"),
                      ("Sonu Sood","chandramukhi2"),("Jyothika","chandramukhi5"),("Rajinikanth","chandramukhi6")]),
 4: ("nanban", [("Sathyaraj","nanban1"),("S J Suryah","nanban2"),("Srikanth","nanban3"),
                ("Jiiva","nanban4"),("Ileana DCruz","nanban5"),("Vijay","nanban6")]),
}

from PIL import Image
def poster_size(prefix):
    w,h = Image.open(f"{MEDIA}/{prefix}_poster.jpg").size
    H = 4400000
    return int(H*w/h), H

def pic(spid, name, rid, x, y):
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{spid}" name="{name}"/>'
            f'<p:cNvPicPr preferRelativeResize="0"/><p:nvPr/></p:nvPicPr>'
            f'<p:blipFill><a:blip r:embed="{rid}"><a:alphaModFix/></a:blip>'
            f'<a:stretch><a:fillRect/></a:stretch></p:blipFill>'
            f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{T}" cy="{T}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            f'<a:noFill/><a:ln><a:noFill/></a:ln></p:spPr></p:pic>')

def effect(k, spid):
    a,b,c,d = 3+4*k, 4+4*k, 5+4*k, 6+4*k
    return (f'<p:par><p:cTn id="{a}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="{b}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="{c}" presetID="1" presetClass="entr" presetSubtype="0" fill="hold" nodeType="clickEffect">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:set><p:cBhvr><p:cTn id="{d}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'
            f'<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:to><p:strVal val="visible"/></p:to></p:set>'
            f'</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>')

def poster_pic(spid, name, rid):
    pw, ph = poster_size(prefix_global)
    x = (9144000 - pw)//2; y = (5143500 - ph)//2
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{spid}" name="{name}"/>'
            f'<p:cNvPicPr preferRelativeResize="0"/><p:nvPr/></p:nvPicPr>'
            f'<p:blipFill><a:blip r:embed="{rid}"><a:alphaModFix/></a:blip>'
            f'<a:stretch><a:fillRect/></a:stretch></p:blipFill>'
            f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{pw}" cy="{ph}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            f'<a:noFill/><a:ln><a:noFill/></a:ln></p:spPr></p:pic>')

def build_slide(n, prefix, items):
    global prefix_global; prefix_global = prefix
    spids = list(range(10, 16))            # 6 picture shape ids
    pics = "".join(pic(spids[i], items[i][0], f"rId{i+2}", *POS[i]) for i in range(6))
    pics += poster_pic(16, f"{prefix} poster", "rId8")   # revealed last, on top
    effects = "".join(effect(k, spids[k]) for k in range(6))
    effects += effect(6, 16)               # 7th click reveals poster
    bg = ('<p:sp><p:nvSpPr><p:cNvPr id="2" name="bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
          '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="5143500"/></a:xfrm>'
          '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="08080A"/></a:solidFill>'
          '<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>')
    bar = ('<p:sp><p:nvSpPr><p:cNvPr id="3" name="bar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
           '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="38100"/></a:xfrm>'
           '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E50914"/></a:solidFill>'
           '<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>')
    timing = ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
              '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
              + effects +
              '</p:childTnLst></p:cTn>'
              '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
              '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
              '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')
    xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
           '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
           'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
           '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
           '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
           + bg + bar + pics +
           '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>'
           + timing + '</p:sld>')
    open(f"{SLIDES}/slide{n}.xml","w",encoding="utf-8").write(xml)

    # rels: layout + 6 images
    ext = ".jpg"
    rel_imgs = "".join(
        f'<Relationship Id="rId{i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{items[i][1]}{ext}"/>'
        for i in range(6))
    rel_imgs += (f'<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
                 f'Target="../media/{prefix}_poster{ext}"/>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
            + rel_imgs + '</Relationships>')
    open(f"{RELS}/slide{n}.xml.rels","w",encoding="utf-8").write(rels)
    print(f"wrote slide{n} ({prefix}): 6 pics, 6 reveals")

for n,(prefix,items) in SLIDES_DEF.items():
    build_slide(n, prefix, items)
print("done")
