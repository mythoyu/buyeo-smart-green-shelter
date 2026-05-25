#!/bin/bash
set -e

PACKAGES_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGES_DIR/.." && pwd)"
export REPO_ROOT
exec bash "$REPO_ROOT/scripts/lib/load-docker-images.sh" "$@"
