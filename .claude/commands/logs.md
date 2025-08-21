# logs command - Read Next.js development logs with optional search functionality
# Usage: 
#   logs                    # Read logs from port 3000
#   logs 3001               # Read logs from port 3001  
#   logs search "error"     # Search for "error" in logs from port 3000
#   logs 3001 search "warn" # Search for "warn" in logs from port 3001

PORT=${1:-3000}

# Check if second argument is "search" or if first argument is "search" (when using default port)
if [[ "$1" == "search" ]]; then
    PORT=3000
    SEARCH_TERM="$2"
elif [[ "$2" == "search" ]]; then
    SEARCH_TERM="$3"
fi

echo "Reading logs for Next.js app on port $PORT..."

if [[ -n "$SEARCH_TERM" ]]; then
    echo "Searching for: '$SEARCH_TERM'"
    echo "----------------------------------------"
fi

# Find the Next.js process on the specified port
NEXT_PID=$(lsof -ti :$PORT 2>/dev/null | head -1)

if [[ -z "$NEXT_PID" ]]; then
    echo "❌ No process found running on port $PORT"
    echo "Make sure your Next.js development server is running with: npm run dev"
    exit 1
fi

echo "✅ Found Next.js process (PID: $NEXT_PID) on port $PORT"
echo "----------------------------------------"

# Function to read and optionally search logs
read_logs() {
    if [[ -n "$SEARCH_TERM" ]]; then
        echo "🔍 Searching for '$SEARCH_TERM' in logs..."
        echo "Press Ctrl+C to stop monitoring"
        echo "----------------------------------------"
        
        # Search in various log sources
        (
            # Search in npm logs
            if [[ -d ~/.npm/_logs ]]; then
                find ~/.npm/_logs -name "*.log" -exec tail -f {} \; 2>/dev/null | grep -i --color=always "$SEARCH_TERM" &
            fi
            
            # Search in Next.js logs
            if [[ -d "client/.next" ]]; then
                find client/.next -name "*.log" -exec tail -f {} \; 2>/dev/null | grep -i --color=always "$SEARCH_TERM" &
            fi
            
            # Search in project logs
            if [[ -d ".next" ]]; then
                find .next -name "*.log" -exec tail -f {} \; 2>/dev/null | grep -i --color=always "$SEARCH_TERM" &
            fi
            
            # Monitor console output from the current terminal/process
            echo "💡 Also monitor your terminal where 'npm run dev' is running for console output containing '$SEARCH_TERM'"
            
            wait
        )
    else
        echo "📋 Monitoring all logs... Press Ctrl+C to stop"
        echo "----------------------------------------"
        
        LOG_FOUND=false
        
        # 1. Try npm logs
        if [[ -d ~/.npm/_logs ]] && [[ $(ls ~/.npm/_logs/*.log 2>/dev/null | wc -l) -gt 0 ]]; then
            echo "📄 Reading latest npm logs..."
            tail -f $(ls -t ~/.npm/_logs/*.log | head -1) &
            LOG_FOUND=true
        fi
        
        # 2. Try Next.js specific logs in client directory
        if [[ -d "client/.next" ]]; then
            NEXTJS_LOGS=$(find client/.next -name "*.log" 2>/dev/null)
            if [[ -n "$NEXTJS_LOGS" ]]; then
                echo "📄 Reading Next.js build logs..."
                echo "$NEXTJS_LOGS" | xargs tail -f &
                LOG_FOUND=true
            fi
        fi
        
        # 3. Try Next.js specific logs in current directory
        if [[ -d ".next" ]]; then
            NEXTJS_LOGS=$(find .next -name "*.log" 2>/dev/null)
            if [[ -n "$NEXTJS_LOGS" ]]; then
                echo "📄 Reading Next.js build logs..."
                echo "$NEXTJS_LOGS" | xargs tail -f &
                LOG_FOUND=true
            fi
        fi
        
        # 4. Try to monitor stderr/stdout of the Next.js process
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "📄 Monitoring Next.js process output..."
            # On macOS, we can try to use script to capture output
            if command -v script >/dev/null 2>&1; then
                echo "💡 For full console output, run this in the same terminal as your 'npm run dev'"
            fi
        fi
        
        if [[ "$LOG_FOUND" == "false" ]]; then
            echo "⚠️  No log files found in standard locations"
            echo "💡 Make sure to check your terminal where 'npm run dev' is running"
            echo "💡 Console logs will appear there in real-time"
            echo ""
            echo "📍 Next.js process is running (PID: $NEXT_PID)"
            echo "📍 You can also check browser DevTools Console for client-side logs"
            
            # Just wait and show process info
            while kill -0 $NEXT_PID 2>/dev/null; do
                sleep 5
                echo "⏱️  Process still running... ($(date '+%H:%M:%S'))"
            done
            echo "❌ Next.js process stopped"
        else
            wait
        fi
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n👋 Stopping log monitoring..."
    jobs -p | xargs kill 2>/dev/null
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start reading logs
read_logs