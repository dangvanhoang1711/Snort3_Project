#!/bin/sh
# Simple forwarder using curl and tail -F. Not as robust as the node forwarder,
# but useful as a quick drop-in.

BACKEND=${1:-http://localhost:4000/api/logs}
API_KEY=${2:-change_me}
LOGFILE=${3:-/var/log/snort/alert_csv.log}

tail -F "$LOGFILE" | while read line; do
  if [ -z "$line" ]; then
    continue
  fi
  curl -s -S -X POST -H "Content-Type: text/plain" -H "x-api-key: $API_KEY" --data-binary "$line" "$BACKEND" || echo "Failed to send line"
done
