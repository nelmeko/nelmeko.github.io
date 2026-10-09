#!/usr/bin/env python3
"""Copy the content of the "nely online" artifact into this Jekyll site.

Usage:  python3 _sync/sync.py <export-dir>

<export-dir> holds the artifact database exported as <collection>/<doc id>.json
(one folder per collection: site, posts, board, shelf, projects, apps,
interests, links, works). The script rewrites _data/*.yml and _posts/*.md to
match, keeps the explanatory comments at the top of each _data file, and
prints any image ids that still need to be downloaded into assets/.

Not synced (they only exist on one side): the visitor counter
(artifact only), the "now" page (artifact only), and _data/about.yml
(GitHub only).
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
TZ = ZoneInfo("America/Los_Angeles")


# ---------- reading the export ----------

def load(export, collection):
    d = export / collection
    if not d.is_dir():
        return []
    return [{"id": f.stem, **json.loads(f.read_text())} for f in sorted(d.glob("*.json"))]


def load_doc(export, collection, doc_id):
    f = export / collection / f"{doc_id}.json"
    return json.loads(f.read_text()) if f.exists() else {}


# ---------- writing YAML (just enough for these files) ----------

def scalar(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(round(v, 2) if isinstance(v, float) else v)
    return json.dumps("" if v is None else str(v), ensure_ascii=False)


def block(key, text, indent):
    pad = " " * indent
    if "\n" not in text:
        return f"{pad}{key}: {scalar(text)}"
    lines = [f"{pad}  {ln}" if ln.strip() else "" for ln in text.split("\n")]
    return f"{pad}{key}: |-\n" + "\n".join(lines)


def item_yaml(fields, multiline=()):
    out = []
    for i, (k, v) in enumerate(fields):
        line = block(k, v, 2) if k in multiline and isinstance(v, str) else f"  {k}: {scalar(v)}"
        out.append(("- " + line[2:]) if i == 0 else line)
    return "\n".join(out)


def header(path):
    if not path.exists():
        return ""
    keep = []
    for ln in path.read_text().splitlines():
        if ln.startswith("#") or (not ln.strip() and keep):
            keep.append(ln)
        else:
            break
    while keep and not keep[-1].strip():
        keep.pop()
    return "\n".join(keep) + "\n\n" if keep else ""


def write_data(name, body):
    path = ROOT / "_data" / f"{name}.yml"
    new = header(path) + body.rstrip() + "\n"
    if not path.exists() or path.read_text() != new:
        path.write_text(new)
        print(f"updated _data/{name}.yml")


def write_list(name, items, multiline=()):
    write_data(name, "\n".join(item_yaml(i, multiline) for i in items) if items else "[]")


def pick(doc, *keys):
    return [(k, doc[k]) for k in keys if doc.get(k) not in (None, "")]


# ---------- assets ----------

needed = set()


def asset(asset_id):
    """Map an artifact asset id to its path in assets/, noting missing files."""
    if not asset_id:
        return ""
    found = list((ROOT / "assets").glob(asset_id + ".*"))
    if found:
        return f"assets/{found[0].name}"
    needed.add(asset_id)
    return f"assets/{asset_id}.jpg"  # fixed up once the file is downloaded


# ---------- posts ----------

def la_date(iso):
    d = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(TZ)
    return d.strftime("%Y-%m-%d %H:%M:%S %z")


def sync_posts(posts):
    folder = ROOT / "_posts"
    existing = {}
    for f in folder.glob("*.md"):
        m = re.search(r"^artifact_id:\s*\"?([^\"\n]+)\"?\s*$", f.read_text(), re.M)
        if m:
            existing[m.group(1)] = f
    nums = [int(n) for n in re.findall(r"log-(\d+)\.md", " ".join(f.name for f in folder.glob("*.md")))]
    next_num = max(nums, default=0) + 1
    for p in sorted(posts, key=lambda p: p.get("created", "")):
        f = existing.pop(p["id"], None)
        if f is None:
            day = la_date(p["created"])[:10]
            f = folder / f"{day}-log-{next_num:03d}.md"
            next_num += 1
        body = (p.get("body") or "").rstrip()
        text = (f"---\ntitle: {scalar(p.get('title') or 'untitled')}\n"
                f"date: {la_date(p['created'])}\nartifact_id: {p['id']}\n---\n\n"
                f"{{% raw %}}\n{body}\n{{% endraw %}}\n")
        if not f.exists() or f.read_text() != text:
            f.write_text(text)
            print(f"updated _posts/{f.name}")
    for f in existing.values():  # deleted in the artifact
        f.unlink()
        print(f"removed _posts/{f.name}")


# ---------- main ----------

def main(export):
    profile = load_doc(export, "site", "profile")
    write_data("profile", "\n".join([
        f"handle: {scalar(profile.get('handle', 'nely'))}",
        f"tagline: {scalar(profile.get('tagline', ''))}",
        block("about", profile.get("about", ""), 0)]))

    status = load_doc(export, "site", "status")
    write_data("status", f"text: {scalar(status.get('text', ''))}\nupdated: {scalar(status.get('updated', ''))}")

    li = load_doc(export, "site", "listening")
    write_data("listening", "\n".join(f"{k}: {scalar(li.get(k, ''))}" for k in ("song", "artist", "link")))

    write_data("hidden", block("body", load_doc(export, "site", "hidden").get("body", ""), 0))

    links = sorted(load(export, "links"), key=lambda x: x.get("order", 0))
    write_list("links", [pick(l, "label", "url") for l in links])

    interests = sorted(load(export, "interests"), key=lambda x: x.get("order", 0))
    write_list("interests", [pick(i, "label", "kind", "note") for i in interests], ("note",))

    apps = sorted(load(export, "apps"), key=lambda x: x.get("created", ""), reverse=True)
    write_list("apps", [pick(a, "name", "status", "desc", "tech", "url") for a in apps], ("desc",))

    projects = sorted(load(export, "projects"), key=lambda x: x.get("created", ""), reverse=True)
    write_list("projects", [pick({**p, "cover": asset(p.get("cover"))},
                                 "title", "type", "status", "desc", "started", "ended", "link", "cover")
                            for p in projects], ("desc",))

    shelf = sorted(load(export, "shelf"), key=lambda x: x.get("created", ""), reverse=True)
    write_list("shelf", [pick({**s, "cover": asset(s.get("cover"))},
                              "category", "title", "creator", "year", "rating", "review", "link", "cover")
                         for s in shelf], ("review",))

    works = sorted(load(export, "works"), key=lambda x: x.get("created", ""), reverse=True)
    write_list("works", [pick({**w, (("audio" if w.get("kind") == "music" else "image")): asset(w.get("assetId"))},
                              "title", "kind", "image", "audio", "link", "note")
                         for w in works], ("note",))

    board = sorted(load(export, "board"), key=lambda x: x.get("z", 0))
    write_list("board", [
        ([("image", asset(b.get("assetId")))] if b.get("type") == "image" else [("text", b.get("text", ""))])
        + [(k, b.get(k, 0)) for k in ("x", "y", "w", "rot")] for b in board], ("text",))

    sync_posts(load(export, "posts"))

    if needed:
        print("MISSING ASSETS (download these into assets/, then run again):")
        for a in sorted(needed):
            print("  " + a)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
