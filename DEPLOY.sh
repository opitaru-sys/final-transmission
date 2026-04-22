#!/bin/bash
# Deploy Final Words to Surge
# Run this once from inside the final-words folder:
#   cd final-words && bash DEPLOY.sh

echo "Installing Surge..."
npm install surge

echo ""
echo "Deploying to Surge..."
echo "(You'll be prompted to create a free account or log in)"
echo ""

npx surge dist/ final-words-shuttle.surge.sh

echo ""
echo "Done! Your site should be live at: https://final-words-shuttle.surge.sh"
