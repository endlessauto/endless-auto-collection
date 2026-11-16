#!/usr/bin/env python3
"""YouTube keyword research from public data. No API key, no paid tool.

Usage:
  python3 scripts/yt_keyword_research.py expand "sema 2026" "spicy ramen vegas"
  python3 scripts/yt_keyword_research.py measure "sema 2026 vlog" "spicy ramen las vegas"
  python3 scripts/yt_keyword_research.py measure --file candidates.txt

expand:  YouTube autocomplete for each seed, then seed + a..z. Shows what people actually type.
measure: for each keyword, the top 10 results (competition) and the 20 newest uploads (freshness).

These are PROXIES, not Ahrefs KD or monthly search volume. Verify the shortlist in vidIQ,
TubeBuddy or Ahrefs before committing. Results vary by location and time. Shorts are excluded.
"""
import json, re, statistics as st, string, sys, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def suggest(q):
    u = "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=" + urllib.parse.quote(q)
    for _ in range(3):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=15).read().decode())[1]
        except Exception:
            time.sleep(1.5)
    return []


def results(q, sp=None):
    u = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(q) + ("&sp=" + sp if sp else "")
    for _ in range(3):
        try:
            h = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}), timeout=25).read().decode("utf8", "ignore")
            return json.loads(re.search(r"var ytInitialData = (\{.*?\});</script>", h, re.S).group(1))
        except Exception:
            time.sleep(2)
    return {}


def views(s):
    m = re.search(r"([\d.,]+)\s*([kmb])?\s*views?", (s or "").lower())
    if not m:
        return None
    return int(float(m.group(1).replace(",", "")) * {"k": 1e3, "m": 1e6, "b": 1e9, None: 1}[m.group(2)])


def age_days(s):
    m = re.search(r"(\d+)\s*(mo|y|w|d|h|m|s)\b", s or "")
    if not m:
        return None
    return int(m.group(1)) * {"s": 0, "m": 0, "h": 1 / 24, "d": 1, "w": 7, "mo": 30, "y": 365}[m.group(2)]


def videos(d):
    out = []

    def walk(o):
        if isinstance(o, dict):
            if "videoRenderer" in o:
                v = o["videoRenderer"]
                try:
                    vc = v.get("viewCountText", {})
                    out.append({
                        "title": "".join(r["text"] for r in v["title"]["runs"]),
                        "ch": v.get("ownerText", {}).get("runs", [{}])[0].get("text", ""),
                        "views": views(vc.get("simpleText") or "".join(r["text"] for r in vc.get("runs", []))),
                        "pub": v.get("publishedTimeText", {}).get("simpleText", ""),
                    })
                except Exception:
                    pass
            for x in o.values():
                walk(x)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    walk(d)
    return out


def expand(seeds):
    for s in seeds:
        found = {}
        for i, x in enumerate(suggest(s)):
            found[x] = i + 1
        for L in string.ascii_lowercase:
            for i, x in enumerate(suggest(s + " " + L)):
                found.setdefault(x, i + 1)
            time.sleep(0.15)
        print(f"\n## {s}  ({len(found)} suggestions)")
        print(" | ".join(found))


def measure(kws):
    print(f"{'keyword':36}{'medViews':>10}{'>=100k':>7}{'exactTitles':>12}{'newest20in7d':>13}{'newest20spanDays':>17}")
    for k in kws:
        rel = [v for v in videos(results(k)) if v["views"] is not None][:10]
        time.sleep(1.2)
        new = videos(results(k, "CAI%3D"))[:20]
        time.sleep(1.2)
        w = re.findall(r"[a-z0-9]+", k.lower())
        mv = int(st.median([v["views"] for v in rel])) if rel else 0
        big = sum(v["views"] >= 100000 for v in rel)
        exact = sum(all(x in v["title"].lower() for x in w) for v in rel)
        ages = [a for a in (age_days(v["pub"]) for v in new) if a is not None]
        d7 = sum(a <= 7 for a in ages)
        span = int(max(ages)) if ages else "n/a"
        print(f"{k:36}{mv:>10,}{big:>7}{exact:>12}{d7:>13}{span:>17}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("expand", "measure"):
        print(__doc__)
        sys.exit(1)
    items = a[1:]
    if items[:1] == ["--file"]:
        items = [l.strip() for l in open(items[1]) if l.strip()]
    (expand if a[0] == "expand" else measure)(items)
