#!/bin/bash
# Local smoke test for the consolidated GST Buddy API (server.js)
# Starts the dev server on port 5099 and probes every endpoint's
# routing + auth gate. Cron/email side effects are intentionally NOT
# triggered (no real emails, no real agent chains).
set -u
PORT=5099 node server.js > /tmp/gb-server2.log 2>&1 &
SPID=$!

# Wait until the port is listening (max 60s — this machine is slow)
for i in $(seq 1 60); do
  if curl -s -o /dev/null http://localhost:5099/api/health; then break; fi
  sleep 1
done
sleep 1

echo "== endpoint smoke tests (expected code in parens) =="
printf '%-52s' 'GET  /api/health (200):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/health
printf '%-52s' 'GET  /health (200):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/health
printf '%-52s' 'GET  /api/email (200):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/email
printf '%-52s' 'POST /api/email no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5099/api/email -H 'Content-Type: application/json' -d '{"subject":"t","body":"b","email":"a@b.com"}'
printf '%-52s' 'GET  /api/agent no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/agent
printf '%-52s' 'POST /api/agent no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5099/api/agent -H 'Content-Type: application/json' -d '{"trigger":"run_compliance"}'
printf '%-52s' 'GET  /api/ai (405):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/ai
printf '%-52s' 'POST /api/ai no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5099/api/ai -H 'Content-Type: application/json' -d '{"task":"gst_assistant"}'
printf '%-52s' 'GET  /api/payment/history no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/payment/history
printf '%-52s' 'GET  /api/subscription/status no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/subscription/status
printf '%-52s' 'POST /api/payment/create-order no-token (401):'
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5099/api/payment/create-order -H 'Content-Type: application/json' -d '{"planId":"pro"}'
printf '%-52s' 'GET  /api/reminders no-secret (401):'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5099/api/reminders
printf '%-52s' 'GET  /api/reminders?task=overdue wrong-secret (401):'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:5099/api/reminders?task=overdue' -H 'Authorization: Bearer wrong-secret'
printf '%-52s' 'POST /api/reminders wrong-secret (401):'
curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://localhost:5099/api/reminders' -H 'Authorization: Bearer wrong-secret' -H 'Content-Type: application/json' -d '{}'

kill $SPID 2>/dev/null
echo "== server log tail =="
tail -20 /tmp/gb-server2.log
