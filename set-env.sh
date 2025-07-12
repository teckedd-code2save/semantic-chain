
#!/bin/bash

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "Error: .env.local file not found in the current directory"
  exit 1
fi

# Source the .env.local file to load environment variables
set -a
source .env.local
set +a

# Verify environment variables are set
echo "Environment variables set:"
echo "OPENAI_API_KEY=$OPENAI_API_KEY"
echo "MISTRAL_API_KEY=$MISTRAL_API_KEY"
echo "PINECONE_API_KEY=$PINECONE_API_KEY"
echo "PINECONE_INDEX=$PINECONE_INDEX"
echo "LANGSMITH_TRACING=$LANGSMITH_TRACING"
echo "LANGSMITH_API_KEY=$LANGSMITH_API_KEY"

# Check if MISTRAL_API_KEY is set
if [ -z "$MISTRAL_API_KEY" ]; then
  echo "Error: MISTRAL_API_KEY is not set"
  exit 1
fi
