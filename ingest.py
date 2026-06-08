#!/usr/bin/env python3
"""
Standalone ingest script — uploads bagrut notes to Pinecone via Voyage AI.
Rate limits (free tier): 3 RPM, 10,000 TPM → BATCH_SIZE=1, 25s between chunks.
"""

import os, re, time, json, sys
import requests
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
NOTES_DIR    = Path(__file__).parent / "src/data/notes"
ENV_FILE     = Path(__file__).parent / ".env.local"
MAX_CHUNK    = 1500
MIN_CHUNK    = 200
SLEEP_SEC    = 65   # 65s between chunks — stays under 10K TPM even for large chunks
MAX_RETRIES  = 5
PINECONE_HOST = "https://bagrut-notes-wnrmm7k.svc.aped-4627-b74a.pinecone.io"

# ── Load env ──────────────────────────────────────────────────────────────────
env = {}
for line in ENV_FILE.read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

VOYAGE_KEY  = env["VOYAGE_API_KEY"]
PINE_KEY    = env["PINECONE_API_KEY"]
INDEX_NAME  = env["PINECONE_INDEX_NAME"]

# ── Frontmatter parser (simple, no deps) ──────────────────────────────────────
def parse_md(text: str):
    if not text.startswith("---"):
        return {}, text
    end = text.index("---", 3)
    fm_raw = text[3:end].strip()
    body   = text[end+3:].strip()
    fm: dict = {}
    for line in fm_raw.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k, v = k.strip(), v.strip()
        if v.startswith("[") and v.endswith("]"):
            items = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
            try:
                fm[k] = [int(x) for x in items]
            except ValueError:
                fm[k] = items
        else:
            try:
                fm[k] = int(v)
            except ValueError:
                fm[k] = v
    return fm, body

# ── Chunking (mirrors ingest/route.ts) ────────────────────────────────────────
def is_balanced(text: str) -> bool:
    return (text.count("$$") % 2) == 0

def prepend_heading(chunk: str, heading: str) -> str:
    if not heading or chunk.lstrip().startswith(heading):
        return chunk
    return f"{heading}\n\n{chunk}"

def split_lines_into_chunks(text: str, heading: str) -> list[str]:
    """Split text by single newlines, accumulate up to MAX_CHUNK chars."""
    lines = text.splitlines()
    chunks, current = [], ""
    for line in lines:
        candidate = f"{current}\n{line}" if current else line
        if current and len(candidate) > MAX_CHUNK and is_balanced(current):
            chunks.append(prepend_heading(current, heading))
            current = line
        else:
            current = candidate
    if current and is_balanced(current):
        chunks.append(prepend_heading(current, heading))
    elif current:
        # LaTeX unbalanced — append anyway
        chunks.append(prepend_heading(current, heading))
    return chunks

def chunk_section(section: str) -> list[str]:
    if not section.strip():
        return []
    m = re.search(r"^(#{1,3} .+)$", section, re.MULTILINE)
    heading = m.group(1) if m else ""
    if len(section) <= MAX_CHUNK and is_balanced(section):
        return [section]

    # Split on double newlines first
    paragraphs = re.split(r"\n{2,}", section)
    chunks, current = [], ""

    for para in paragraphs:
        if not para.strip():
            continue
        # If this single para is itself too large, split it by lines
        if len(para) > MAX_CHUNK:
            if current:
                chunks.append(prepend_heading(current, heading))
                current = ""
            chunks.extend(split_lines_into_chunks(para, heading))
            continue
        candidate = f"{current}\n\n{para}" if current else para
        if not is_balanced(candidate):
            current = candidate
            continue
        if current and len(candidate) > MAX_CHUNK:
            chunks.append(prepend_heading(current, heading))
            current = para
        else:
            current = candidate
    if current:
        chunks.append(prepend_heading(current, heading))
    return chunks

def chunk_text(body: str) -> list[str]:
    sections = re.split(r"\n---+\n", body)
    result = []
    for sec in sections:
        result.extend(chunk_section(sec.strip()))
    return [c for c in result if len(c.strip()) >= MIN_CHUNK]

# ── Voyage AI embedding ───────────────────────────────────────────────────────
def embed(text: str, attempt: int = 0) -> list[float]:
    try:
        r = requests.post(
            "https://api.voyageai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {VOYAGE_KEY}", "Content-Type": "application/json"},
            json={"input": text, "model": "voyage-3-lite"},
            timeout=60,
        )
    except requests.exceptions.RequestException as e:
        if attempt >= MAX_RETRIES:
            raise RuntimeError(f"Network error after {MAX_RETRIES} retries: {e}")
        wait = 65 * (attempt + 1)
        print(f"\n   ⚠️  network error — waiting {wait}s... ({e})")
        time.sleep(wait)
        return embed(text, attempt + 1)

    if r.status_code == 429:
        if attempt >= MAX_RETRIES:
            raise RuntimeError(f"429 after {MAX_RETRIES} retries")
        wait = 65 * (attempt + 1)
        print(f"\n   ⚠️  429 — waiting {wait}s before retry {attempt+1}/{MAX_RETRIES}...")
        time.sleep(wait)
        return embed(text, attempt + 1)

    if not r.content.strip():
        if attempt >= MAX_RETRIES:
            raise RuntimeError("Empty response after retries")
        wait = 65 * (attempt + 1)
        print(f"\n   ⚠️  empty response — waiting {wait}s...")
        time.sleep(wait)
        return embed(text, attempt + 1)

    r.raise_for_status()
    try:
        data = r.json()
    except Exception:
        print(f"\n   DEBUG status={r.status_code} content={r.content[:300]!r}")
        raise
    return data["data"][0]["embedding"]

# ── Pinecone upsert ───────────────────────────────────────────────────────────
def upsert(vec_id: str, values: list[float], metadata: dict):
    r = requests.post(
        f"{PINECONE_HOST}/vectors/upsert",
        headers={"Api-Key": PINE_KEY, "Content-Type": "application/json"},
        json={"vectors": [{"id": vec_id, "values": values, "metadata": metadata}]},
        timeout=30,
    )
    r.raise_for_status()

def verify(vec_id: str) -> bool:
    r = requests.get(
        f"{PINECONE_HOST}/vectors/fetch",
        headers={"Api-Key": PINE_KEY},
        params={"ids": vec_id},
        timeout=15,
    )
    if r.status_code != 200:
        return False
    try:
        return vec_id in r.json().get("vectors", {})
    except Exception:
        return False

def pinecone_count() -> int:
    r = requests.get(
        f"{PINECONE_HOST}/describe_index_stats",
        headers={"Api-Key": PINE_KEY},
        timeout=15,
    )
    return r.json().get("totalVectorCount", 0)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    files = sorted(NOTES_DIR.glob("*.md"))
    print(f"\n📚 קבצים: {len(files)}")

    # Build all chunks first so we know total
    all_chunks: list[tuple[str, str, dict]] = []  # (id, text, metadata)
    for f in files:
        fm, body = parse_md(f.read_text(encoding="utf-8"))
        chunks = chunk_text(body)
        for i, chunk in enumerate(chunks):
            vec_id = f"{f.name}-chunk-{i}"
            meta = {
                "text":  chunk,
                "topic": str(fm.get("topic", "")),
                "units": [str(u) for u in fm.get("units", [])],
                "tags":  [str(t) for t in fm.get("tags", [])],
                "source": f.name,
            }
            for key in ("type", "year", "moed", "shalon"):
                if key in fm:
                    meta[key] = str(fm[key])
            all_chunks.append((vec_id, chunk, meta))

    total = len(all_chunks)
    print(f"🔢 סה\"כ chunks: {total}")
    count_before = pinecone_count()
    print(f"📊 Pinecone לפני: {count_before} vectors\n")

    succeeded, failed = [], []

    for idx, (vec_id, text, meta) in enumerate(all_chunks, 1):
        tokens_est = len(text) // 4
        print(f"[{idx:3}/{total}] {vec_id[:55]:<55} (~{tokens_est} tok)", end=" ", flush=True)

        try:
            values = embed(text)
            upsert(vec_id, values, meta)
            ok = verify(vec_id)
            if ok:
                print(f"✅")
                succeeded.append(vec_id)
            else:
                print(f"⚠️  upserted but verify failed")
                failed.append(vec_id)
        except Exception as e:
            import traceback
            print(f"❌ {e}\n{traceback.format_exc()}")
            failed.append(vec_id)

        if idx < total:
            time.sleep(SLEEP_SEC)

    count_after = pinecone_count()
    print(f"\n{'='*60}")
    print(f"✅ הצליחו:  {len(succeeded)}/{total}")
    print(f"❌ נכשלו:   {len(failed)}/{total}")
    print(f"📊 Pinecone לפני: {count_before}  אחרי: {count_after}  (+{count_after - count_before})")
    if failed:
        print(f"\nנכשלו:")
        for fid in failed:
            print(f"  - {fid}")

if __name__ == "__main__":
    main()
