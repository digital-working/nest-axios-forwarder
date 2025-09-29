#Build the NestJS application
#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status

echo "Stashing changes..."
git stash || echo "No changes to stash"
git stash drop || echo "No stashes to drop"

echo "Switch to development..."
git switch development

echo "Pulling latest code from development..."
git pull origin development

echo "Removing dist directory..."
rm -rf dist 

echo "Setting up environment..."
cp .env.dev .env

echo "Installing dependencies..."
npm install --legacy-peer-deps

#npm run build
echo "Building NestJS..."
npm run build

echo "Build Done!"