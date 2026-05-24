#!/bin/bash

echo "🛑 Stopping all services..."

if [ -d "logs" ]; then
    for pidfile in logs/*.pid; do
        if [ -f "$pidfile" ]; then
            PID=$(cat "$pidfile")
            echo "Killing process $PID ($(basename "$pidfile" .pid))..."
            kill $PID 2>/dev/null && rm "$pidfile" || echo "Process $PID already dead."
            # Force remove pidfile if process is dead
            if ! ps -p $PID > /dev/null; then
               rm -f "$pidfile"
            fi
        fi
    done
else
    echo "No logs directory found. Cleaning up by port..."
    lsof -t -i :3000 -i :5000 -i :8002 -i :8003 -i :8004 | xargs kill -9 2>/dev/null
fi

echo "✅ All services stopped."
