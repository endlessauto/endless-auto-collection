#!/usr/bin/env python3
import html
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

CHANNEL_ID = "UC2pgjt2fppriMxyiEiMNCvQ"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
CATALOG = Path(__file__).resolve().parent.parent / "docs/marketing/youtube-catalog.md"


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
        }


def table(rows):
    out = ["| Posted | Title | Views | ID |", "|--------|-------|-------|----|"]
    for vid, r in sorted(rows.items(), key=lambda kv: kv[1]["date"], reverse=True):
        out.append(f"| {r['date']} | {r['title']} | {r['views']} | {vid} |")
    return "\n".join(out)


def main():
    rows = read_catalog()
    added = 0
    for vid, r in read_feed():
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
    print(f"{added} new, {len(rows)} total")


if __name__ == "__main__":
    sys.exit(main())
