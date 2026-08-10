#!/usr/bin/env bash
# Fail-closed secret scan over TRACKED files.
#
# Why this exists: on 2026-08-06 a real Shopify client secret sat in the working
# tree of apps/silbe/.env.example — a file that IS tracked. It was never committed,
# but nothing would have stopped it. There are no git hooks in this repo (verified:
# .git/hooks holds only .sample, no husky, no lefthook, no lint-staged), so CI is
# the only place a guard can live.
#
# Design notes:
#   - Scans `git ls-files`, i.e. TRACKED files only. Untracked and gitignored files
#     (.env.local) are out of scope on purpose: they cannot reach the remote, and
#     scanning them would produce noise on every developer machine.
#   - NEVER prints a matched value. A scanner that echoes the secret into a public
#     CI log has leaked it a second time. Output is file:line plus the rule name.
#   - Fail-closed: any hit exits 1. No allowlist file, no "warn only" mode. If a
#     legitimate match ever appears, the fix is to change the code, not the scanner.
#
# Usage: scripts/scan-secrets.sh [--verbose]
set -uo pipefail

VERBOSE=0
[[ "${1:-}" == "--verbose" ]] && VERBOSE=1

cd "$(dirname "$0")/.." || exit 2

hits=0

# Report a hit without ever echoing the matched text.
report() {
  local rule="$1" file="$2" line="$3"
  echo "::error file=${file},line=${line}::secret-scan: ${rule} matched (value withheld)"
  echo "  ✗ ${rule}  ${file}:${line}"
  hits=$((hits + 1))
}

# --- Rule set -------------------------------------------------------------
# 1) Known credential prefixes with their real value shapes.
#    Shopify tokens/secrets are prefix + 32 hex.
# 2) Known secret ENV NAMES carrying a NON-EMPTY value. This is the class that
#    actually bit us: an empty `FOO=` in .env.example is correct and expected,
#    a filled one is a leak.
declare -a RULE_NAMES=(
  "shopify-admin-token"
  "shopify-app-secret"
  "shopify-custom-token"
  "shopify-partner-token"
  "klaviyo-private-key"
  "openai-key"
  "aws-access-key-id"
  "private-key-block"
  "filled-secret-env"
)
declare -a RULE_PATTERNS=(
  'shpat_[0-9a-fA-F]{32}'
  'shpss_[0-9a-fA-F]{32}'
  'shpca_[0-9a-fA-F]{32}'
  'shppa_[0-9a-fA-F]{32}'
  'pk_[0-9a-fA-F]{34}'
  'sk-[A-Za-z0-9_-]{20,}'
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  '^[[:space:]]*(PRINTFUL_API_TOKEN|PRINTFUL_WEBHOOK_SECRET|SHOPIFY_CLIENT_SECRET|SHOPIFY_WEBHOOK_SECRET|SHOPIFY_WEBHOOK_SECRET_OLD|GA4_API_SECRET|KLAVIYO_PRIVATE_KEY|PAYLOAD_SECRET|WIDERRUF_TOKEN_SECRET|DATABASE_URI|GELATO_API_KEY|STAPE_KEEPALIVE_URL)[[:space:]]*=[[:space:]]*["'"'"']?[^[:space:]"'"'"'#][^[:space:]]*'
)

# Placeholder values that documentation legitimately contains. Without this the
# example env blocks in docs/MEGAPROMPT.md trip `filled-secret-env` nine times —
# `PAYLOAD_SECRET=...`, `KLAVIYO_PRIVATE_KEY=pk_...`, `DATABASE_URI=postgres://...`.
# A scanner that cries wolf on documentation gets switched off, and then it guards
# nothing. Narrow and explicit: only obvious stand-ins, never a shape that could be
# a real credential.
PLACEHOLDER_RE='(\.\.\.|<[^>]*>|\bCHANGEME\b|\bchangeme\b|\byour[-_]|[Xx]{3,}|example\.com|\bTODO\b|placeholder|dein[-_]|DEIN[-_]|user:pass|USER:PASS|user:password|:password@)'

# Files that legitimately describe the patterns themselves would self-trigger.
is_excluded() {
  case "$1" in
    scripts/scan-secrets.sh) return 0 ;;
    .github/workflows/*)     return 0 ;;
    *) return 1 ;;
  esac
}

# ONE pass over all tracked files with the rules combined into a single ERE.
# The obvious implementation — nested loops over files x rules — costs one grep
# process per pair (~500 x 9 here) and ran into a multi-minute wall locally. Rule
# attribution is recovered afterwards, but only for the handful of actual hits.
combined=""
for pattern in "${RULE_PATTERNS[@]}"; do
  combined+="${combined:+|}(${pattern})"
done

[[ ${VERBOSE} -eq 1 ]] && echo "scanning $(git ls-files | wc -l) tracked files in one pass"

while IFS= read -r hit; do
  [[ -z "$hit" ]] && continue
  file="${hit%%:*}"
  rest="${hit#*:}"
  lineno="${rest%%:*}"
  content="${rest#*:}"

  is_excluded "$file" && continue

  # Which rule fired? Checked only for real hits, so the cost is negligible.
  matched_rule="unknown-rule"
  for i in "${!RULE_NAMES[@]}"; do
    if printf '%s' "$content" | grep -qE "${RULE_PATTERNS[$i]}"; then
      matched_rule="${RULE_NAMES[$i]}"
      break
    fi
  done
  report "$matched_rule" "$file" "$lineno"
done < <(git ls-files -z \
           | xargs -0 grep -nIE "$combined" -- 2>/dev/null \
           | grep -vE "$PLACEHOLDER_RE" || true)

echo
if [[ $hits -gt 0 ]]; then
  echo "secret-scan FAILED: ${hits} finding(s). Values are withheld from this log by design."
  echo "If a finding is a real credential: rotate it first, then remove it from the tree."
  exit 1
fi
echo "secret-scan clean: no credential patterns in tracked files."
