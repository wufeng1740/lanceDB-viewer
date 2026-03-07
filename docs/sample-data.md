# Try LanceDB Viewer With Sample Data

This repository does not ship a LanceDB dataset yet, but you can still test the full inspection flow with almost no setup.

## Fastest Path

Use any small local LanceDB dataset you already created for RAG experiments, or generate one with the shortest possible script and then open it in LanceDB Viewer.

## Minimal Python Example

Create a temporary folder and run the following script:

```python
import lancedb

uri = "./sample-lancedb"
db = lancedb.connect(uri)

table = db.create_table(
    "chunks",
    data=[
        {
            "id": 1,
            "source": "getting-started.md",
            "chunk": "LanceDB Viewer helps inspect schema and row previews.",
            "vector": [0.12, 0.08, 0.91, 0.33],
        },
        {
            "id": 2,
            "source": "faq.md",
            "chunk": "Use the app when you want to inspect local vector data without writing throwaway scripts.",
            "vector": [0.45, 0.22, 0.61, 0.14],
        },
    ],
)

print(table.count_rows())
```

Install the Python package if needed:

```bash
pip install lancedb
```

## Open It In LanceDB Viewer

1. Run the script above so the `sample-lancedb` folder exists.
2. Launch LanceDB Viewer.
3. Choose the folder that contains `sample-lancedb`.
4. Click the `chunks` table.
5. Verify the schema, vector field, and data preview.

## What To Check In Your First 5 Minutes

- Can you find the dataset immediately after selecting the folder?
- Is the schema clear enough without opening any docs?
- Is the first-row preview enough to validate your ingestion output?
- What would you want to copy, export, or compare next?

If anything feels slow or confusing, open a bug report or discussion from the repository home page.
