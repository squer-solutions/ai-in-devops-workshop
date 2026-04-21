# Scenario B — "New claims are stuck"

## Alert
> Slack: "Users report that claims created 10 minutes ago are still in `pending` status. Queue looks weird."

## Your job
Figure out whether the API is failing to enqueue, the worker is failing to consume, or something between.

## What you can touch
- OpenCode agent, Grafana, shell, Redis (`redis-cli` in the redis container)
- `podman exec -it compose_redis_1 redis-cli LLEN claims:queue` is a quick way to check queue depth
  (exact container name varies — use `podman ps` to find it)

## Deliverable
Short report identifying:
- Where the bottleneck is (api-side enqueue? worker-side consume? db write?)
- What evidence tells you (metric or log line)
- What one action you'd take next
