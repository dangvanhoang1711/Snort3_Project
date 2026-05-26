# Integration Guide: Snort VM -> Backend

1. Configure Snort to log alerts in alert_csv format to a file shared with the backend container.

   - Ensure Snort produces CSV lines with columns: timestamp, pkt_num, proto, pkt_gen, pkt_len, dir, src_ap, dst_ap, rule, action

2. Example sh script on Snort VM to forward alerts (run as a service):

```sh
#!/bin/sh
BACKEND=http://<backend-host>:4000/api/ingest
API_KEY=YOUR_API_KEY
tail -F /var/log/snort/alert_csv.log | while read line; do
  # send each line as text/plain body
  curl -s -X POST -H "Content-Type: text/plain" -H "x-api-key: $API_KEY" --data-binary "$line" "$BACKEND"
done
```

3. Alternatively, buffer multiple lines and POST as JSON payload (batched):

```sh
tail -F /var/log/snort/alert_csv.log | while read line; do
  printf '%s\n' "$line" >> /tmp/pending_alerts.txt
  if [ $(wc -l < /tmp/pending_alerts.txt) -ge 50 ]; then
    curl -s -X POST -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" -d "{ \"data\": \"$(sed -e 's/\"/\\\"/g' /tmp/pending_alerts.txt)\" }" $BACKEND
    > /tmp/pending_alerts.txt
  fi
done
```

4. Docker deployment uses `backend-api/tools/snort-csv-forwarder.js` by default. It polls `/app/snort-logs/alert_csv.txt`, batches new lines, retries API requests, and stores the last file offset in `.forwarder_position`. Example:

```
SNORT_LOG_FILE=/app/snort-logs/alert_csv.txt SNORT_API_URL=http://localhost:4000/api/ingest API_KEY=YOUR_API_KEY node tools/snort-csv-forwarder.js
```

5. Snort inline (IPS) note: In IPS mode Snort may drop packets but will still generate alerts depending on rules. Ensure Snort outputs the alert CSV to a file or syslog accessible to the forwarding script.

6. Security: the ingest endpoint requires an API key via header `x-api-key`. Protect the ingestion endpoint with TLS or place it on a management network. Configure firewalls to allow the Snort VM to reach backend only on the required port.
