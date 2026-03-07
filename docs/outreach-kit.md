# Outreach Kit

Use these posts as starting points for Week 2 and Week 3 distribution. Keep the screenshot or GIF attached every time.

## Direct Outreach DM

```text
I built a read-only desktop viewer for LanceDB.

It is meant for AI/RAG developers who need to inspect local LanceDB data without writing throwaway scripts.

If you have 5 minutes, I would value one thing only: tell me whether this is actually useful in your workflow.

Release: https://github.com/wufeng1740/lanceDB-viewer/releases/latest
Sample flow: https://github.com/wufeng1740/lanceDB-viewer/blob/main/docs/sample-data.md
```

## Demo Post

```text
I built a read-only desktop viewer for LanceDB.

It is for the moment when you want to inspect tables, schema, row previews, or vector dimensions without opening a notebook and writing one-off scripts.

If you already use LanceDB for RAG or local knowledge bases, I would like to know where this helps and where it falls short.

Repo + download: https://github.com/wufeng1740/lanceDB-viewer
```

## Pain-Point Post

```text
Debugging LanceDB with ad-hoc scripts is slower than it should be.

Most of the time I just want to answer simple questions:
- what tables are here?
- what fields landed?
- does this table actually have vectors?
- what do the first rows look like?

So I made a read-only desktop viewer for LanceDB.

If you use LanceDB in AI/RAG workflows, I want blunt feedback on what is still missing.

https://github.com/wufeng1740/lanceDB-viewer
```

## Tutorial Post

```text
How to inspect a LanceDB dataset in 30 seconds:
1. Open LanceDB Viewer
2. Select your LanceDB root folder
3. Click a table
4. Check schema, row count, vector dimension, and first rows

That is the whole point: faster inspection, no throwaway scripts.

Download: https://github.com/wufeng1740/lanceDB-viewer/releases/latest
```

## Build Post

```text
Why I made LanceDB Viewer as a Tauri desktop app instead of a web app:
- local data stays local
- read-only inspection is the primary use case
- startup and distribution are simple
- no extra backend to run just to inspect a dataset

The result is a lightweight LanceDB viewer for AI/RAG debugging.

https://github.com/wufeng1740/lanceDB-viewer
```

## Feedback Prompt To Reuse

Always end with one of these:

- `What kind of LanceDB data would you inspect with this?`
- `Which step in your current inspection workflow is still slower than it should be?`
- `What should this add before it becomes part of your regular workflow?`
