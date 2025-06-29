#!/bin/bash

# Create .gitignore if it doesn't exist
cat > .gitignore << EOL

# backend
node_modules/
dist/
.env
.DS_Store
*.log
*.env.local
*.env.development.local

# Compiled output
dist/
tmp/
out-tsc/
bazel-out/


# System files
.DS_Store
Thumbs.db


# IDEs and editors
.idea/
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# Visual Studio Code
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.history/*

EOL

# Initialize git if not already initialized
if [ ! -d .git ]; then
    echo "# semantic-chain ## Setup - source ./set-env.sh   " >> README.md
    git init
    git add README.md
    git commit -m "Agentic semantic chain"
    git branch -M main
    git remote add origin https://github.com/teckedd-code2save/semantic-chain.git
    git push -u origin main
else
    # Regular commit
    git add .
    git commit -m "$1"
    git push origin main
fi