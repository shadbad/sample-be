#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:8085/v1/projects/local-dev"
PROJECT="projects/local-dev"

create_topic() {
  local name="$1"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "${BASE_URL}/topics/${name}")
  if [[ "$status" == "200" ]]; then
    echo "topic '${name}': created"
  elif [[ "$status" == "409" ]]; then
    echo "topic '${name}': already exists"
  else
    echo "topic '${name}': unexpected status ${status}" >&2
    exit 1
  fi
}

create_subscription() {
  local name="$1"
  local topic="$2"
  local body="{\"topic\":\"${PROJECT}/topics/${topic}\"}"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    -H "Content-Type: application/json" \
    -d "$body" \
    "${BASE_URL}/subscriptions/${name}")
  if [[ "$status" == "200" ]]; then
    echo "subscription '${name}': created"
  elif [[ "$status" == "409" ]]; then
    echo "subscription '${name}': already exists"
  else
    echo "subscription '${name}': unexpected status ${status}" >&2
    exit 1
  fi
}

create_topic "identity-events"
create_topic "user-events"
create_subscription "user-service-identity-events" "identity-events"
create_subscription "gateway-user-events" "user-events"
