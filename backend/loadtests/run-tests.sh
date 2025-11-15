#!/bin/bash

# Load Testing Runner Script for TCG Dojo
# Runs all k6 load tests and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="loadtests/results"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TCG Dojo Load Testing Suite${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Base URL: ${YELLOW}${BASE_URL}${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install k6 from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run a test
run_test() {
    local test_file=$1
    local test_name=$2

    echo -e "${YELLOW}Running: ${test_name}${NC}"
    echo "----------------------------------------"

    if BASE_URL="$BASE_URL" k6 run "$test_file"; then
        echo -e "${GREEN}✓ ${test_name} completed successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        echo ""
        return 1
    fi
}

# Run tests
failed_tests=0

echo -e "${GREEN}Starting load tests...${NC}"
echo ""

# 1. Authentication Flow
run_test "loadtests/auth-flow.test.js" "Authentication Flow" || ((failed_tests++))

# 2. Product API
run_test "loadtests/product-api.test.js" "Product API" || ((failed_tests++))

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Run Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ ${failed_tests} test(s) failed${NC}"
    exit 1
fi
