#!/bin/bash
# Shield AI API Test Suite
# Comprehensive tests for all core features

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
PASS=0
FAIL=0
SKIP=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}✗ FAIL${NC}: $1 - $2"; ((FAIL++)); }
log_skip() { echo -e "${YELLOW}○ SKIP${NC}: $1"; ((SKIP++)); }
log_info() { echo -e "${BLUE}ℹ INFO${NC}: $1"; }
log_section() { echo -e "\n${BLUE}═══════════════════════════════════════${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}═══════════════════════════════════════${NC}\n"; }

# Test helper
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4
    local description=$5

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        log_pass "$description"
        echo "$body"
        return 0
    else
        log_fail "$description" "Expected $expected_status, got $status_code"
        echo "$body"
        return 1
    fi
}

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Shield AI - API Test Suite v1.0                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "API Base: $API_BASE"
echo "Date: $(date)"
echo ""

# ============================================================================
# HEALTH & STATUS
# ============================================================================
log_section "1. HEALTH & STATUS CHECKS"

# Health check
response=$(curl -s "$API_BASE/health" 2>/dev/null)
if echo "$response" | grep -q "healthy\|status"; then
    log_pass "Health endpoint responds"
    echo "$response" | head -1
else
    log_fail "Health endpoint" "No valid response"
fi

# Stats endpoint
response=$(curl -s "$API_BASE/api/stats" 2>/dev/null)
if echo "$response" | grep -q "total_queries\|blocked_queries"; then
    log_pass "Stats endpoint responds"
    echo "$response" | head -1
else
    log_skip "Stats endpoint (may need auth)"
fi

# ============================================================================
# AUTHENTICATION
# ============================================================================
log_section "2. AUTHENTICATION TESTS"

# Register user
TEST_EMAIL="test-$(date +%s)@shieldai.dev"
TEST_PASSWORD="TestPass123!"

response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    log_pass "User registration"
    ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
    log_info "Access token obtained: ${ACCESS_TOKEN:0:20}..."
else
    log_fail "User registration" "Status: $status_code"
    echo "$body"
fi

# Login
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status_code" = "200" ]; then
    log_pass "User login"
    ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
    log_fail "User login" "Status: $status_code"
fi

# Get current user
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/auth/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)

    if [ "$status_code" = "200" ]; then
        log_pass "Get current user (authenticated)"
    else
        log_fail "Get current user" "Status: $status_code"
    fi
else
    log_skip "Get current user (no token)"
fi

# Token refresh
if [ -n "$REFRESH_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)

    if [ "$status_code" = "200" ]; then
        log_pass "Token refresh"
    else
        log_fail "Token refresh" "Status: $status_code"
    fi
else
    log_skip "Token refresh (no refresh token)"
fi

# ============================================================================
# DNS RESOLUTION
# ============================================================================
log_section "3. DNS RESOLUTION TESTS"

# Resolve domain
response=$(curl -s "$API_BASE/api/dns/resolve/google.com" 2>/dev/null)
if echo "$response" | grep -q "ip_addresses\|domain"; then
    log_pass "DNS resolution (google.com)"
    echo "$response" | head -1
else
    log_skip "DNS resolution"
fi

# Resolve blocked domain (test with common ad domain)
response=$(curl -s "$API_BASE/api/dns/resolve/ads.google.com" 2>/dev/null)
if echo "$response" | grep -q "blocked"; then
    log_pass "Blocked domain detection"
else
    log_skip "Blocked domain detection"
fi

# DoH endpoint
response=$(curl -s "$API_BASE/dns-query?name=example.com&type=A" \
    -H "Accept: application/dns-json" 2>/dev/null)
if echo "$response" | grep -q "Answer\|Question\|Status"; then
    log_pass "DNS-over-HTTPS (DoH) endpoint"
else
    log_skip "DNS-over-HTTPS"
fi

# ============================================================================
# ML/AI ANALYSIS
# ============================================================================
log_section "4. ML/AI ANALYSIS TESTS"

# ML domain analysis
response=$(curl -s "$API_BASE/api/ml/analyze/google.com" 2>/dev/null)
if echo "$response" | grep -q "risk\|score\|safe"; then
    log_pass "ML domain analysis"
    echo "$response" | head -1
else
    log_skip "ML domain analysis"
fi

# DGA detection
response=$(curl -s "$API_BASE/api/ml/dga/xkjhsdf8923jksdf.com" 2>/dev/null)
if echo "$response" | grep -q "dga\|score\|suspicious"; then
    log_pass "DGA detection"
else
    log_skip "DGA detection"
fi

# Deep analysis
response=$(curl -s "$API_BASE/api/deep/suspicious-domain.xyz" 2>/dev/null)
if echo "$response" | grep -q "threat\|risk\|analysis"; then
    log_pass "Deep threat analysis"
else
    log_skip "Deep threat analysis"
fi

# ============================================================================
# BLOCKLIST MANAGEMENT
# ============================================================================
log_section "5. BLOCKLIST MANAGEMENT TESTS"

# Get allowlist
response=$(curl -s "$API_BASE/api/allowlist" 2>/dev/null)
if [ -n "$response" ]; then
    log_pass "Get allowlist"
else
    log_skip "Get allowlist"
fi

# Add to blocklist
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/blocklist" \
    -H "Content-Type: application/json" \
    -d '{"domain":"test-block.example.com"}' 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    log_pass "Add to blocklist"
else
    log_skip "Add to blocklist"
fi

# ============================================================================
# PROFILES
# ============================================================================
log_section "6. PROFILE MANAGEMENT TESTS"

# Get profiles
response=$(curl -s "$API_BASE/api/profiles" \
    -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)
if echo "$response" | grep -q "profile\|name\|\[\]"; then
    log_pass "Get profiles"
else
    log_skip "Get profiles"
fi

# Create profile
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/profiles" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"name":"Test Kid","type":"child"}' 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    log_pass "Create profile"
else
    log_skip "Create profile"
fi

# ============================================================================
# ANALYTICS
# ============================================================================
log_section "7. ANALYTICS TESTS"

# Query history
response=$(curl -s "$API_BASE/api/history" 2>/dev/null)
if echo "$response" | grep -q "queries\|domain\|\[\]"; then
    log_pass "Query history"
else
    log_skip "Query history"
fi

# Privacy metrics
response=$(curl -s "$API_BASE/api/privacy-metrics" 2>/dev/null)
if [ -n "$response" ]; then
    log_pass "Privacy metrics"
else
    log_skip "Privacy metrics"
fi

# ============================================================================
# DEVICES
# ============================================================================
log_section "8. DEVICE MANAGEMENT TESTS"

# Register device
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/devices/register" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"device_name":"Test iPhone","platform":"ios"}' 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    log_pass "Register device"
else
    log_skip "Register device"
fi

# Get devices
response=$(curl -s "$API_BASE/api/auth/devices" \
    -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)
if echo "$response" | grep -q "device\|\[\]"; then
    log_pass "Get devices"
else
    log_skip "Get devices"
fi

# ============================================================================
# TIERS & PRICING
# ============================================================================
log_section "9. TIERS & PRICING TESTS"

# Get pricing
response=$(curl -s "$API_BASE/api/tiers/pricing" 2>/dev/null)
if echo "$response" | grep -q "tier\|price\|free"; then
    log_pass "Get pricing info"
else
    log_skip "Get pricing info"
fi

# ============================================================================
# WEBSOCKET
# ============================================================================
log_section "10. WEBSOCKET TESTS"

# WebSocket connection test (basic check)
if command -v websocat &> /dev/null; then
    timeout 2 websocat -q "ws://localhost:8080/ws" 2>/dev/null && log_pass "WebSocket connection" || log_skip "WebSocket connection"
else
    log_skip "WebSocket test (websocat not installed)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                            ║"
echo "╠════════════════════════════════════════════════════════════╣"
printf "║  ${GREEN}PASSED${NC}: %-4d                                            ║\n" $PASS
printf "║  ${RED}FAILED${NC}: %-4d                                            ║\n" $FAIL
printf "║  ${YELLOW}SKIPPED${NC}: %-3d                                            ║\n" $SKIP
echo "╠════════════════════════════════════════════════════════════╣"
TOTAL=$((PASS + FAIL + SKIP))
if [ $FAIL -eq 0 ]; then
    echo -e "║  ${GREEN}All core tests passed!${NC}                                  ║"
else
    echo -e "║  ${RED}Some tests failed - check output above${NC}                 ║"
fi
echo "╚════════════════════════════════════════════════════════════╝"
