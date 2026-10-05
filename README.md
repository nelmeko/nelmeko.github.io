# nely online — how to edit

Everything is edited right here on github.com. Every time you **commit**, GitHub rebuilds the site automatically. It's live about 1 minute later at <https://nelmeko.github.io>.

- **To edit a file:** click it, then click the ✏️ pencil in the top right. Make your change and click **Commit changes**.
- **To add a file:** open the folder, then **Add file → Create new file** (for text) or **Upload files** (for images).

---

## ✍️ Write a new log entry

1. Open the **`_posts`** folder and click **Add file → Create new file**.
2. Name it `YEAR-MONTH-DAY-short-name.md`, for example `2026-09-30-log-004.md`.
3. Paste this in and write your entry:

```
---
title: "log 004"
date: 2026-09-30 21:00:00 -0700
---

## a heading if you want one

First paragraph. Leave an empty line between paragraphs.

> a quote looks like this

**bold**, *italic*, and links like https://example.com just work.
```

4. Commit. It appears at the top of your log, and on the home page under "recent writing".

**One gotcha:** don't type `{{` or `{%` in an entry, since GitHub treats those as code. Everything else is fine.

- **Fix a typo:** open the entry's file and use the pencil.
- **Delete an entry:** open the file, then **⋯ → Delete file**.
- **Share one entry:** every entry also has its own link, like `nelmeko.github.io/log/log-004/`.

---

## 🏠 Everything else lives in `_data`

Each file starts with `#` notes explaining its fields.

| File | What it controls |
|---|---|
| `about.yml` | The about page: your text, an optional photo, quick facts |
| `profile.yml` | Your big name, tagline, about text, guestbook link |
| `status.yml` | The "building at 3am" line |
| `listening.yml` | The now-listening song |
| `links.yml` | The steam / github / youtube buttons |
| `interests.yml` | The "currently" list |
| `apps.yml` | works ▾ apps |
| `projects.yml` | works ▾ projects |
| `works.yml` | works ▾ art & music |
| `shelf.yml` | The shelf |
| `board.yml` | The moodboard |
| `hidden.yml` | The secret page behind "archives" |

**Example: add a link button.** In `links.yml`, copy a block and change it:

```yaml
- label: spotify
  url: https://open.spotify.com/user/yourname
```

### Rules for these `.yml` files
- **Indentation matters.** Use spaces, never tabs. Lines inside a block line up under each other.
- **List items** start with `- ` (a dash and a space).
- **Quotes:** if text contains a `:` or `#`, wrap it in quotes: `note: "watching: again"`.
- **Empty values:** leave a field empty with `""`.

### Adding images
1. Open the **`assets`** folder and click **Add file → Upload files**. Use simple names like `my-art.png`, with no spaces.
2. Point to it from a data file, for example `image: assets/my-art.png` in `board.yml`, or `cover: assets/my-art.png` in `shelf.yml`.

### Arranging the board
Typing x/y numbers by hand is fiddly, so there's a helper:
1. Go to `nelmeko.github.io/#board-arrange`.
2. Drag things around, and use the little corner square to resize.
3. Press **copy layout**.
4. Open `_data/board.yml` and replace everything below the `#` notes with what you copied. Commit.

---

## 🎨 Changing the look: `style.css`

The top of the file has a **SETTINGS** block with all the colors:

```css
--blue:#86b3ff;   /* highlights & links */
--dim:#a7b8e2;    /* softer text */
```

Change a hex code (pick one at htmlcolorcodes.com), commit, and refresh your site. Further down, each effect has a comment above it explaining what the numbers do: the VHS blobs, grain, scanlines, rolling band, flicker and the GIF at the top.

**Tip:** change one thing at a time. If something looks wrong, open the file's **History** (the clock icon) to see and undo the change.

---

## Other files (you'll rarely touch these)
- **`index.html`:** the page skeleton.
- **`site.js`:** how everything behaves.
- **`content.json`, `_config.yml`, `_layouts/`:** the glue that lets GitHub assemble the site. Leave these alone.

---

## If the site doesn't update
1. Click the **Actions** tab at the top of the repository.
2. A ✅ means it worked, so hard refresh your site (Ctrl+Shift+R, or Cmd+Shift+R on Mac).
3. A ❌ means the build failed, usually because of a spacing or quote mistake in a `.yml` file. Click the ❌ to see which file and line, then fix it or undo it from History. The old version of your site stays online until a build succeeds, so nothing breaks for visitors.
