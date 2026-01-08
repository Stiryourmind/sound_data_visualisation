#!/bin/bash

# Get the directory where this script is saved
cd "$(dirname "$0")"

# Print a message
echo "Starting Python Server..."

# Open the default browser to localhost:8000 (after a slight delay to let server start)
(sleep 1 && open "http://localhost:8000") &

# Start the Python 3 server
python3 -m http.server 8000