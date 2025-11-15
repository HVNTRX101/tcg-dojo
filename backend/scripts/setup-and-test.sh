#!/bin/bash

# Prisma Setup and Test Runner Script
# This script helps set up Prisma and run backend tests in environments with network restrictions

set -e

echo "========================================="
echo "Prisma Setup and Test Runner"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}Error: This script must be run from the backend directory${NC}"
    exit 1
fi

echo "Step 1: Checking Prisma installation..."
if [ ! -d "node_modules/prisma" ]; then
    echo -e "${YELLOW}Prisma not found. Installing...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Prisma is installed${NC}"
fi

echo ""
echo "Step 2: Checking Prisma Client..."
if [ ! -f "node_modules/.prisma/client/index.js" ] || grep -q "did not initialize yet" "node_modules/.prisma/client/index.js"; then
    echo -e "${YELLOW}Prisma Client not generated or using stub. Attempting to generate...${NC}"

    # Try to generate with checksum ignore
    echo "Attempting: PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate"
    if PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate 2>&1 | tee /tmp/prisma_generate.log; then
        echo -e "${GREEN}✓ Prisma Client generated successfully${NC}"
    else
        echo -e "${RED}✗ Prisma Client generation failed${NC}"
        echo ""
        echo -e "${YELLOW}This is likely due to network restrictions preventing engine downloads.${NC}"
        echo ""
        echo "Possible solutions:"
        echo "1. If you're behind a firewall, ensure access to https://binaries.prisma.sh"
        echo "2. Use a VPN or different network connection"
        echo "3. Try downloading engines manually:"
        echo "   npx prisma generate --force-download"
        echo "4. Use Prisma Data Platform (Accelerate) which doesn't require local engines:"
        echo "   https://www.prisma.io/data-platform"
        echo ""
        echo "For CI/CD environments, consider:"
        echo "- Pre-building Prisma Client and committing it (not recommended for production)"
        echo "- Using Docker with cached Prisma engines"
        echo "- Setting up a local Prisma engine mirror"
        echo ""

        # Check error log
        if grep -q "403 Forbidden" /tmp/prisma_generate.log; then
            echo -e "${YELLOW}Detected: 403 Forbidden error from binaries.prisma.sh${NC}"
            echo "This indicates network-level blocking. You need to:"
            echo "  • Check firewall/proxy settings"
            echo "  • Whitelist binaries.prisma.sh in your security policy"
            echo "  • Use a different network/VPN"
        fi

        exit 1
    fi
else
    echo -e "${GREEN}✓ Prisma Client is already generated${NC}"
fi

echo ""
echo "Step 3: Running database migrations (if needed)..."
if [ -f "prisma/dev.db" ]; then
    echo -e "${GREEN}✓ Database exists${NC}"
else
    echo -e "${YELLOW}Database not found. Running migrations...${NC}"
    npx prisma migrate dev --name init
fi

echo ""
echo "Step 4: Running tests..."
echo ""

if [ -n "$1" ]; then
    echo "Running specific test: $1"
    npm test -- "$1"
else
    echo "Running all tests..."
    npm test
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Setup and tests completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
