#!/bin/sh
# Pull the chat + embedding models on first boot. Idempotent —
# re-running is safe (Ollama no-ops if the model is already present).
#
# Override the model selection by passing CHAT_MODEL / EMBED_MODEL env
# vars to docker compose, e.g.:
#
#   CHAT_MODEL=qwen2.5:72b-instruct-q4_K_M docker compose up -d
#
# Run inside the container with:
#   docker compose exec ollama sh /opt/init-models.sh

set -e

CHAT_MODEL="${CHAT_MODEL:-qwen2.5:14b-instruct-q4_K_M}"
EMBED_MODEL="${EMBED_MODEL:-bge-m3}"

echo "Pulling chat model: $CHAT_MODEL"
ollama pull "$CHAT_MODEL"

echo "Pulling embedding model: $EMBED_MODEL"
ollama pull "$EMBED_MODEL"

echo "Done. Loaded models:"
ollama list
