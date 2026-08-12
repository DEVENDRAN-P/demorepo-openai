#!/usr/bin/env bash
# Restart the GST Buddy backend with the fixed billing code.
set -u
cd "$(dirname "$0")/.." || exit 1

echo '--- freeing port 5000 ---'
netstat -ano | grep ':5000' | grep LISTENING | awk '{print $5}' | sort -u | while read p; do
  taskkill //F //PID "$p" 2>/dev/null
done
sleep 1

echo '--- starting backend ---'
nohup node server.js > /tmp/gstbuddy-api.log 2>&1 &
echo $! > /tmp/gstbuddy-api.pid
echo "API PID: $(cat /tmp/gstbuddy-api.pid)"

for i in $(seq 1 20); do
  if curl -s -m 2 http://localhost:5000/health > /dev/null 2>&1; then
    echo "API ready after ${i}s"
    break
  fi
  sleep 1
done

echo '--- health ---'
curl -s -m 3 http://localhost:5000/health; echo

echo '--- web on 3000? ---'
curl -s -m 3 -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000 2>/dev/null || echo 'frontend not running'
