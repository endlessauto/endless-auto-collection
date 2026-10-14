#!/usr/bin/env python3
import html
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

CHANNEL_ID = "UC2pgjt2fppriMxyiEiMNCvQ"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "docs/marketing/youtube-catalog.md"
SITE_PAGES = [ROOT / "index.html", ROOT / "about.html"]
SITE_VIDEO_COUNT = 3
PLAY_ICON = '<span class="absolute inset-0 flex items-center justify-center"><span class="w-14 h-14 rounded-full bg-black/60 backdrop-blur border border-white/30 flex items-center justify-center"><svg class="w-6 h-6 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></span>'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def is_short(video_id):
    opener = urllib.request.build_opener(NoRedirect)
    try:
        return opener.open(f"https://www.youtube.com/shorts/{video_id}").status == 200
    except urllib.error.HTTPError:
        return False


def read_catalog():
    rows = {}
    kind = None
    if not CATALOG.exists():
        return rows
    for line in CATALOG.read_text().splitlines():
        if line.startswith("## "):
            kind = "short" if "Shorts" in line else "long"
        m = re.match(r"\| (\d{4}-\d\d-\d\d) \| (.*) \| (\d+) \| (\S+) \|$", line)
        if m and kind:
            date, title, views, vid = m.groups()
            rows[vid] = {"date": date, "title": title, "views": int(views), "kind": kind}
    return rows


def read_feed():
    xml = urllib.request.urlopen(FEED).read().decode()
    for e in re.findall(r"<entry>(.*?)</entry>", xml, re.S):
        g = lambda p: re.search(p, e, re.S).group(1)
        yield g(r"<yt:videoId>(.*?)<"), {
            "date": g(r"<published>(.*?)T"),
            "title": html.unescape(g(r"<title>(.*?)</title>")).replace("|", r"\|"),
            "views": int(g(r'views="(\d+)')),
            "published": g(r"<published>(.*?)</published>"),
            "description": html.unescape(g(r"<media:description>(.*?)</media:description>")),
        }


def summary(description):
    first = re.split(r"\n\s*(?:---|\n)", description.strip())[0]
    first = " ".join(first.split())
    if len(first) <= 200:
        return first
    cut = first[:200]
    end = max(cut.rfind(". "), cut.rfind(".") if cut.endswith(".") else -1)
    return cut[: end + 1] if end > 60 else cut.rsplit(" ", 1)[0] + "…"


def duration_iso(video_id):
    try:
        page = urllib.request.urlopen(f"https://www.youtube.com/watch?v={video_id}").read().decode()
        secs = int(re.search(r'"lengthSeconds":"(\d+)"', page).group(1))
    except (urllib.error.URLError, AttributeError):
        return None
    h, rem = divmod(secs, 3600)
    m, sec = divmod(rem, 60)
    return "PT" + (f"{h}H" if h else "") + (f"{m}M" if m else "") + (f"{sec}S" if sec or not (h or m) else "")


def card(video_id, title):
    t = html.escape(title, quote=True)
    return (
        '      <div class="card rounded-3xl overflow-hidden">\n'
        f'        <button type="button" class="yt-lite relative block w-full aspect-video bg-black" data-yt="{video_id}" aria-label="Play: {t}">\n'
        f'          <img src="https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" alt="{t}" loading="lazy" class="absolute inset-0 w-full h-full object-cover">\n'
        f"          {PLAY_ICON}\n"
        "        </button>\n"
        f'        <h3 class="text-base font-semibold p-4">{html.escape(title)}</h3>\n'
        "      </div>\n"
    )


def schema_entry(video_id, title, feed_entry):
    entry = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title,
        "description": summary(feed_entry["description"]),
        "thumbnailUrl": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "uploadDate": feed_entry["published"],
    }
    duration = duration_iso(video_id)
    if duration:
        entry["duration"] = duration
    entry["embedUrl"] = f"https://www.youtube-nocookie.com/embed/{video_id}"
    entry["contentUrl"] = f"https://www.youtube.com/watch?v={video_id}"
    return entry


def replace_between(text, name, body):
    pattern = re.compile(rf"(<!-- yt:{name}:start -->\n).*?(<!-- yt:{name}:end -->)", re.S)
    if not pattern.search(text):
        raise SystemExit(f"missing yt:{name} markers")
    return pattern.sub(lambda m: m.group(1) + body + m.group(2), text)


def update_site(longs, feed):
    latest = sorted(longs.items(), key=lambda kv: kv[1]["date"], reverse=True)[:SITE_VIDEO_COUNT]
    missing = [v for v, _ in latest if v not in feed]
    if missing:
        raise SystemExit(f"latest long-form not in channel feed, can't build site data: {missing}")
    cards, schema = "", []
    for vid, r in latest:
        title = r["title"].replace(r"\|", "|")
        cards += card(vid, title)
        schema.append(schema_entry(vid, title, feed[vid]))
    ld = json.dumps(schema, ensure_ascii=False).replace("</", "<\\/")
    for page in SITE_PAGES:
        text = page.read_text()
        text = replace_between(text, "cards", cards)
        text = replace_between(text, "schema", f'<script type="application/ld+json">{ld}</script>\n')
        page.write_text(text)
    return [v for v, _ in latest]


def table(rows):
    out = ["| Posted | Title | Views | ID |", "|--------|-------|-------|----|"]
    for vid, r in sorted(rows.items(), key=lambda kv: kv[1]["date"], reverse=True):
        out.append(f"| {r['date']} | {r['title']} | {r['views']} | {vid} |")
    return "\n".join(out)


def main():
    rows = read_catalog()
    added = 0
    feed = {}
    for vid, r in read_feed():
        feed[vid] = r
        if vid in rows:
            rows[vid]["views"] = r["views"]
        else:
            r["kind"] = "short" if is_short(vid) else "long"
            rows[vid] = r
            added += 1
    last = max(r["date"] for r in rows.values())
    longs = {v: r for v, r in rows.items() if r["kind"] == "long"}
    shorts = {v: r for v, r in rows.items() if r["kind"] == "short"}
    CATALOG.write_text(
        "# YouTube catalog — @EndlessAutoworks\n\n"
        "Channel: https://www.youtube.com/@EndlessAutoworks\n"
        f"Latest upload: {last}. Refreshed by `scripts/refresh_youtube_catalog.py` (public view counts from the channel RSS feed; older rows are kept when they leave the feed).\n\n"
        f"## Long-form\n\n{table(longs)}\n\n## Shorts\n\n{table(shorts)}\n"
    )
    shown = update_site(longs, feed)
    print(f"{added} new, {len(rows)} total; site shows {', '.join(shown)}")


if __name__ == "__main__":
    sys.exit(main())
