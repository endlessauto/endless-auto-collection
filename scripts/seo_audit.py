#!/usr/bin/env python3
"""Local SEO audit of the static site: link graph, orphans, sitemap diff, on-page basics.

Usage: python3 scripts/seo_audit.py [--json]
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "https://www.endlessautocollection.com"
SKIP = {"build-submit"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.meta = ""
        self.canonical = ""
        self.robots = ""
        self.h1 = []
        self.links = []
        self.ld = []
        self.words = 0
        self._tag = None
        self._buf = ""
        self._skip = 0
        self._cur_href = None
        self._cur_text = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self._skip += 1
            self._tag = tag
            self._buf = ""
            self._ld = tag == "script" and a.get("type") == "application/ld+json"
        elif tag == "title":
            self._tag = "title"
            self._buf = ""
        elif tag == "h1":
            self._tag = "h1"
            self._buf = ""
        elif tag == "meta":
            if a.get("name") == "description":
                self.meta = a.get("content", "")
            if a.get("name") == "robots":
                self.robots = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href", "")
        elif tag == "a" and a.get("href"):
            self._cur_href = a["href"]
            self._cur_text = ""

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip -= 1
            if tag == "script" and getattr(self, "_ld", False):
                try:
                    self.ld.append(json.loads(self._buf))
                except ValueError:
                    self.ld.append({"_invalid": True})
            self._tag = None
        elif tag == "title":
            self.title = self._buf.strip()
            self._tag = None
        elif tag == "h1":
            self.h1.append(" ".join(self._buf.split()))
            self._tag = None
        elif tag == "a" and self._cur_href is not None:
            self.links.append((self._cur_href, " ".join(self._cur_text.split())))
            self._cur_href = None

    def handle_data(self, data):
        if self._tag in ("title", "h1", "script", "style"):
            self._buf += data
        if self._cur_href is not None:
            self._cur_text += data
        if not self._skip:
            self.words += len(data.split())


def slug_of(href):
    href = href.split("#")[0].split("?")[0]
    if href.startswith(DOMAIN):
        href = href[len(DOMAIN):]
    if href.startswith(("http", "mailto:", "tel:", "//")) or not href:
        return None
    href = href.lstrip("./")
    href = re.sub(r"\.html$", "", href).strip("/")
    return href or "index"


def types(ld):
    out = []

    def walk(o):
        if isinstance(o, dict):
            t = o.get("@type")
            if t:
                out.extend(t if isinstance(t, list) else [t])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(ld)
    return sorted(set(out))


def main():
    pages = {}
    for f in sorted(ROOT.glob("*.html")):
        slug = f.stem
        if slug in SKIP:
            continue
        p = Page()
        p.feed(f.read_text(errors="ignore"))
        pages[slug] = p

    inbound = {s: [] for s in pages}
    outbound = {s: [] for s in pages}
    for s, p in pages.items():
        for href, text in p.links:
            t = slug_of(href)
            if t in pages and t != s:
                outbound[s].append((t, text))
                inbound[t].append((s, text))

    sm = (ROOT / "sitemap.xml").read_text()
    in_sitemap = {slug_of(u) for u in re.findall(r"<loc>([^<]+)</loc>", sm)}

    rows = []
    for s, p in pages.items():
        schema = sorted({t for d in p.ld for t in types(d)})
        rows.append({
            "page": s,
            "title_len": len(p.title),
            "meta_len": len(p.meta),
            "h1_count": len(p.h1),
            "canonical_ok": p.canonical.rstrip("/") == (DOMAIN + ("" if s == "index" else "/" + s)),
            "noindex": "noindex" in p.robots,
            "in_sitemap": s in in_sitemap,
            "words": p.words,
            "schema": schema,
            "invalid_ld": any(d.get("_invalid") for d in p.ld if isinstance(d, dict)),
            "links_in": len({x for x, _ in inbound[s]}),
            "links_out": len({x for x, _ in outbound[s]}),
            "inbound_from": sorted({x for x, _ in inbound[s]}),
            "outbound_to": sorted({x for x, _ in outbound[s]}),
        })

    result = {
        "pages": rows,
        "orphans": [r["page"] for r in rows if r["links_in"] == 0 and r["page"] != "index"],
        "not_in_sitemap": [r["page"] for r in rows if not r["in_sitemap"] and not r["noindex"]],
        "sitemap_missing_file": sorted(x for x in in_sitemap if x and x not in pages and x != "index"),
    }

    if "--json" in sys.argv:
        print(json.dumps(result, indent=2))
        return

    print(f"{'page':38} {'title':>5} {'meta':>4} {'h1':>2} {'canon':>5} {'map':>3} {'words':>5} {'in':>3} {'out':>3}  schema")
    for r in rows:
        print(f"{r['page']:38} {r['title_len']:>5} {r['meta_len']:>4} {r['h1_count']:>2} "
              f"{'ok' if r['canonical_ok'] else 'BAD':>5} {'y' if r['in_sitemap'] else 'N':>3} "
              f"{r['words']:>5} {r['links_in']:>3} {r['links_out']:>3}  {','.join(r['schema'])}")
    print("\nOrphans (0 inbound):", result["orphans"] or "none")
    print("Not in sitemap:", result["not_in_sitemap"] or "none")
    print("In sitemap, no file:", result["sitemap_missing_file"] or "none")


if __name__ == "__main__":
    main()
