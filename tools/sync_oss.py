#!/usr/bin/env python3
"""Mirror a built site folder to an Alibaba Cloud OSS bucket (Hong Kong).

Used by .github/workflows/mirror.yml so the site can be served from Hong Kong,
which is far more reachable from mainland China than github.io.

    OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
    python3 tools/sync_oss.py <folder> <bucket> <endpoint>

Only changed files are uploaded (compared by MD5 / ETag); files that no
longer exist locally are deleted from the bucket.
"""
import hashlib
import mimetypes
import os
import pathlib
import sys

import oss2

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/plain", ".md")


def cache_control(key):
    if key.endswith(".html") or key.startswith("data/") or key.endswith(".json") or key.endswith(".xml"):
        return "no-cache"
    if key.endswith((".css", ".js")):
        return "public, max-age=600"
    return "public, max-age=86400"


def main():
    root = pathlib.Path(sys.argv[1]).resolve()
    bucket_name, endpoint = sys.argv[2], sys.argv[3]
    auth = oss2.Auth(os.environ["OSS_ACCESS_KEY_ID"], os.environ["OSS_ACCESS_KEY_SECRET"])
    bucket = oss2.Bucket(auth, endpoint, bucket_name)

    remote = {}
    for obj in oss2.ObjectIterator(bucket):
        remote[obj.key] = obj.etag.strip('"').lower()

    local = {}
    for p in root.rglob("*"):
        if p.is_file():
            local[p.relative_to(root).as_posix()] = p

    up = 0
    for key, p in sorted(local.items()):
        data = p.read_bytes()
        if remote.get(key) == hashlib.md5(data).hexdigest():
            continue
        ctype = mimetypes.guess_type(key)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json", "image/svg+xml"):
            ctype += "; charset=utf-8"
        bucket.put_object(key, data, headers={"Content-Type": ctype, "Cache-Control": cache_control(key)})
        up += 1

    stale = [k for k in remote if k not in local]
    for i in range(0, len(stale), 1000):
        bucket.batch_delete_objects(stale[i:i + 1000])
    print(f"uploaded {up}, deleted {len(stale)}, unchanged {len(local) - up}")


if __name__ == "__main__":
    main()
