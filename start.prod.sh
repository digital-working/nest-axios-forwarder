#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "Stashing changes..."
git stash || echo "No changes to stash"
git stash drop || echo "No stashes to drop"

echo "Switch to main..."
git switch main

echo "Pulling latest code from main..."
git pull origin main

echo "Removing dist directory..."
rm -rf dist 

echo "Setting up environment..."
cp .env.prod .env

echo "Installing dependencies..."
npm install --legacy-peer-deps

#npm run build
echo "Building NestJS..."
npm run build

echo "Cleaning NestJS..."
npm run start:prod

echo "Done!"
