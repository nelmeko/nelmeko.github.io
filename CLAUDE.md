# nely online (nelmeko.github.io)

Jekyll site on GitHub Pages. `content.json` is built from `_data/*.yml` and `_posts/*.md`; `site.js` renders it.

## Where content is edited

The owner edits content in the **"nely online" artifact**: https://claude.ai/artifact/27FUJmiWt4diactbpdg3tR
(its database: `site/{profile,status,listening,hidden,now}`, plus collections `posts`, `board`, `shelf`,
`projects`, `apps`, `interests`, `links`, `works`). That artifact is the source of truth for that content.
Don't hand-edit those `_data` files or `_posts` here; change the artifact (its database via ArtifactData) and sync.

Only on GitHub (edit here directly): `_data/about.yml`, `profile.yml`'s `guestbook_url`, and the design
(`style.css`, `site.js`, `index.html`). Only in the artifact: guestbook, visitor counter, the "now" page.

## "sync" = copy the artifact into this repo and push

1. `git pull`
2. Export the artifact database: ArtifactData `list` with `out_dir` set to one empty scratch folder, for each
   collection: `site posts board shelf projects apps interests links works`.
3. `python3 -I _sync/sync.py <that folder>`
4. If it prints MISSING ASSETS: fetch each with the Artifact tool (`action: read`, `url` above, `path: <id>`),
   copy it to `assets/<id>.<ext>`, and run step 3 again.
5. Show the owner `git diff --stat`, then commit and push. GitHub Pages is live about a minute later.

Posts are matched by `artifact_id:` in their front matter; new ones become `_posts/YYYY-MM-DD-log-NNN.md`.
