#!/usr/bin/env bash
# Test: webhook verification with the user's broken env shape:
#   CASHFREE_WEBHOOK_SECRET = a URL (wrong) -> must fall back to CASHFREE_SECRET_KEY
set -u
cd "$(dirname "$0")/.." || exit 1

echo '--- syntax checks ---'
node --check api/billing.js && echo 'billing.js OK'
node --check server.js && echo 'server.js OK'
node --check scratch/test-webhook-signature.js && echo 'test OK'

echo '--- freeing port 5000 ---'
netstat -ano | grep ':5000' | grep LISTENING | awk '{print $5}' | sort -u | while read p; do
  taskkill //F //PID "$p" 2>/dev/null
done
sleep 1

echo '--- starting server (URL in webhook secret, secret key has the signing secret) ---'
CASHFREE_WEBHOOK_SECRET='https://gstbuddy.example.com/hook' \
CASHFREE_SECRET_KEY=testsecret123 \
CASHFREE_ENV=sandbox \
CASHFREE_APP_ID=testappid \
nohup node server.js > /tmp/gstbuddy-webhook-test.log 2>&1 &
SERVER_PID=$!
echo "server pid: $SERVER_PID"

for i in $(seq 1 20); do
  if curl -s -m 2 http://localhost:5000/health > /dev/null 2>&1; then
    echo "server ready after ${i}s"
    break
  fi
  sleep 1
done

echo '--- running webhook signature test (secret = testsecret123) ---'
node scratch/test-webhook-signature.js testsecret123 5000
EXIT=$?

echo '--- startup warnings from log ---'
grep -E 'billing_startup_error|webhook' /tmp/gstbuddy-webhook-test.log | head -6

kill "$SERVER_PID" 2>/dev/null
echo "test exit: $EXIT"
exit $EXIT
