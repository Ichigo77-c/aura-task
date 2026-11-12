#!/bin/bash
# Cross-Process Test Runner
# Runs both processes and validates cross-process sync

echo "🧪 Cross-Process Synchronization Test"
echo "======================================"
echo ""

# Clean previous database
export ONE_BRAIN_DB="$(pwd)/test-sync.db"
rm -f test-sync.db test-sync.db-wal test-sync.db-shm

echo "1️⃣ Starting OpenCode worker (Process 2)..."
npm run test:cross-p2 > p2.log 2>&1 &
P2_PID=$!
echo "   PID: $P2_PID"

# Give P2 time to start
sleep 2

echo ""
echo "2️⃣ Starting Claude Code (Process 1)..."
npm run test:cross-p1 > p1.log 2>&1 &
P1_PID=$!
echo "   PID: $P1_PID"

echo ""
echo "3️⃣ Waiting for both processes to complete (max 40s)..."

# Wait for both processes
wait $P1_PID
P1_EXIT=$?

wait $P2_PID
P2_EXIT=$?

echo ""
echo "======================================"
echo "📊 Results:"
echo "======================================"
echo ""

echo "Process 1 (Claude) Output:"
echo "---"
cat p1.log
echo ""

echo "Process 2 (OpenCode) Output:"
echo "---"
cat p2.log
echo ""

echo "======================================"
echo ""

if [ $P1_EXIT -eq 0 ] && [ $P2_EXIT -eq 0 ]; then
    echo "✅ Cross-process test PASSED!"
    echo ""
    echo "Both processes successfully:"
    echo "  - Shared the same SQLite database"
    echo "  - Saw each other's agents"
    echo "  - Exchanged task and result messages"
    echo "  - Maintained consistent state"
    exit 0
else
    echo "❌ Cross-process test FAILED!"
    echo "   P1 exit code: $P1_EXIT"
    echo "   P2 exit code: $P2_EXIT"
    exit 1
fi
