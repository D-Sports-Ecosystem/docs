#!/usr/bin/env python3
"""Inventory docs drift against source repo checkouts."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path


HTTP = {"get", "post", "put", "patch", "delete"}


def load_openapi(path: Path) -> dict:
    return json.loads(path.read_text())


def route_files(api_root: Path) -> list[str]:
    routes = []
    root = api_root / "app" / "api"
    if not root.exists():
        return routes
    for route in root.rglob("route.ts"):
        rel = route.relative_to(root).parent.as_posix()
        path = "/api" if rel == "." else f"/api/{rel}"
        path = re.sub(r"\[\[\.\.\.([^\]]+)\]\]", r"{\1}", path)
        path = re.sub(r"\[\.\.\.([^\]]+)\]", r"{\1}", path)
        path = re.sub(r"\[([^\]]+)\]", r"{\1}", path)
        routes.append(path)
    return sorted(set(routes))


def pkg_versions(pkg: Path, keys: list[str]) -> dict[str, str]:
    if not pkg.exists():
        return {}
    data = json.loads(pkg.read_text())
    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    out = {"name": data.get("name", "")}
    for key in keys:
        out[key] = deps.get(key, "MISSING")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", type=Path, required=True)
    parser.add_argument("--api", type=Path, required=True)
    parser.add_argument("--native", type=Path, required=True)
    parser.add_argument("--backend", type=Path, required=True)
    args = parser.parse_args()

    api_spec = load_openapi(args.api / "openapi.json")
    docs_spec = load_openapi(args.docs / "api-reference" / "openapi.json")
    api_paths = set(api_spec.get("paths", {}))
    docs_paths = set(docs_spec.get("paths", {}))

    print("=== OpenAPI ===")
    print(f"API paths: {len(api_paths)}")
    print(f"Docs paths: {len(docs_paths)}")
    print("New in API (not in docs):")
    for path in sorted(api_paths - docs_paths):
        methods = ",".join(sorted(k for k in api_spec["paths"][path] if k in HTTP))
        print(f"  {methods:16} {path}")
    print("Removed from API (still in docs):")
    for path in sorted(docs_paths - api_paths):
        methods = ",".join(sorted(k for k in docs_spec["paths"][path] if k in HTTP))
        print(f"  {methods:16} {path}")

    routes = route_files(args.api)
    print("\n=== Route files missing from API OpenAPI ===")
    missing = [r for r in routes if r not in api_paths]
    prefixes = Counter(r.split("/")[2] if len(r.split("/")) > 2 else r for r in missing)
    for name, count in prefixes.most_common():
        print(f"  {count:3} /api/{name}")
    print(f"  total missing: {len(missing)} / {len(routes)} route files")

    print("\n=== Stack ===")
    print(
        "API",
        pkg_versions(
            args.api / "package.json",
            ["next", "react", "@prisma/client", "@clerk/nextjs", "thirdweb"],
        ),
    )
    print(
        "Native",
        pkg_versions(
            args.native / "package.json",
            ["expo", "react-native", "react", "@clerk/clerk-expo", "zustand"],
        ),
    )
    cargo = args.backend / "Cargo.toml"
    print("Backend Cargo.toml exists:", cargo.exists())


if __name__ == "__main__":
    main()
