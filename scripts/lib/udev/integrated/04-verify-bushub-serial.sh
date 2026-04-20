#!/usr/bin/env bash
exec bash "$(cd "$(dirname "$0")" && pwd)/../common/04-verify-bushub-serial.sh" --apc-only "$@"
