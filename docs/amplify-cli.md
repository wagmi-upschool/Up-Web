# Amplify CLI Commands

Aşağıdaki komutlar `scripts/amplify-cli.sh` içine alınmıştır. Varsayılan değerler:
- PROFILE: wagmi.yusuf
- REGION: us-east-1
- APP_ID: d233kdx1k3bny
- BRANCH: master

Kullanım:

```bash
./scripts/amplify-cli.sh list-apps
./scripts/amplify-cli.sh list-jobs
./scripts/amplify-cli.sh last-job
./scripts/amplify-cli.sh get-job <JOB_ID>
```

Değerleri override etmek için:

```bash
PROFILE=wagmi.yusuf REGION=us-east-1 APP_ID=d233kdx1k3bny BRANCH=master \
  ./scripts/amplify-cli.sh last-job
```

Script içeriği:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROFILE="${PROFILE:-wagmi.yusuf}"
REGION="${REGION:-us-east-1}"
APP_ID="${APP_ID:-d233kdx1k3bny}"
BRANCH="${BRANCH:-master}"

usage() {
  cat <<'USAGE'
Usage:
  amplify-cli.sh list-apps
  amplify-cli.sh list-jobs
  amplify-cli.sh last-job
  amplify-cli.sh get-job <JOB_ID>

Env overrides:
  PROFILE, REGION, APP_ID, BRANCH
USAGE
}

list_apps() {
  aws amplify list-apps \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'apps[].{id:appId,name:name}' \
    --output table
}

list_jobs() {
  aws amplify list-jobs \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --profile "$PROFILE"
}

last_job() {
  aws amplify list-jobs \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'reverse(sort_by(jobSummaries,&startTime))[0]' \
    --output table
}

get_job() {
  local job_id="${1:-}"
  if [[ -z "$job_id" ]]; then
    echo "Missing JOB_ID." >&2
    usage
    exit 1
  fi

  aws amplify get-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-id "$job_id" \
    --region "$REGION" \
    --profile "$PROFILE"
}

case "${1:-}" in
  list-apps)
    list_apps
    ;;
  list-jobs)
    list_jobs
    ;;
  last-job)
    last_job
    ;;
  get-job)
    shift
    get_job "${1:-}"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Unknown command: $1" >&2
    usage
    exit 1
    ;;
esac
```
