#!/bin/bash

# FamConomy API Sync Script
# Syncs local API source with remote backend

LOCAL_PATH="/Users/lindseybiggers/Documents/WillzProjects/FamConomy/FamConomy/apps/api/src/"
REMOTE_PATH="wpbiggs@famconomy.com:~/apps/famconomy-backend/src/"

echo "🔄 Starting rsync of API source..."
echo "From: $LOCAL_PATH"
echo "To: $REMOTE_PATH"
echo ""

# Run rsync with verbose output
# -r: recurse into directories
# -a: archive mode (preserves permissions, timestamps, etc)
# -v: verbose
# -z: compress during transfer
# -p: preserve permissions
# -g: preserve group
# -o: preserve owner
# --dirs: transfer directories without recursing
rsync -arvzpgo --delete --include='*/' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='dist' \
  --exclude='build' \
  "$LOCAL_PATH" "$REMOTE_PATH"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Rsync completed successfully!"
  echo "All subdirectories and files synced to remote backend."
else
  echo ""
  echo "❌ Rsync failed with exit code $?"
  exit 1
fi
