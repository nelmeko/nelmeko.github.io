# nely online (nelmeko.github.io)

Jekyll site on GitHub Pages. `content.json` is built from `_data/*.yml` and `_posts/*.md`; `site.js` renders it.

## Where content is edited

The owner edits content in the **"nely online" artifact**: https://claude.ai/artifact/27FUJmiWt4diactbpdg3tR
(its database: `site/{profile,status,listening,hidden,about,now}`, plus collections `posts`, `board`, `shelf`,
`projects`, `apps`, `interests`, `links`, `works`). That artifact is the source of truth for that content.
Don't hand-edit those `_data` files or `_posts` here; change the artifact (its database via ArtifactData) and sync.

Only on GitHub (edit here directly): the design (`style.css`, `site.js`, `index.html`, `blackwall.css`, `blackwall.js`); design changes
usually need making in the artifact's HTML too (the Blackwall CSS/JS is pasted inline at the end of the artifact page). Only in the artifact: visitor counter, the "now" page. The guestbook was removed from both on 2026-10-08.

## "sync" = copy the artifact into this repo and push

1. `git pull`
2. Export the artifact database: ArtifactData `list` with `out_dir` set to one empty scratch folder, for each
   collection: `site posts board shelf projects apps interests links works`.
3. `python3 -I _sync/sync.py <that folder>`
4. If it prints MISSING ASSETS: fetch each with the Artifact tool (`action: read`, `url` above, `path: <id>`),
   copy it to `assets/<id>.<ext>`, and run step 3 again.
5. Show the owner `git diff --stat`, then commit and push. GitHub Pages is live about a minute later.

Posts are matched by `artifact_id:` in their front matter; new ones become `_posts/YYYY-MM-DD-log-NNN.md`.
