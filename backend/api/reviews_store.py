"""
Aggregate star-rating counters, stored in Upstash Redis (REST API) so they
survive Render restarts/redeploys — everything else in this app is
in-memory and ephemeral by design, but a review count resetting to zero
on every deploy would look broken on a public site.

If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't set, falls
back to all-zero stats rather than erroring, so local dev works without
a Redis account.
"""
import os

import httpx

_REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/")
_REDIS_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

_COUNT_KEY = "flipflick:review_count"
_SUM_KEY = "flipflick:review_stars_sum"

_ZERO_STATS = {"count": 0, "average": 0.0}


def _configured() -> bool:
    return bool(_REDIS_URL and _REDIS_TOKEN)


async def _command(*parts: str) -> dict:
    url = "/".join([_REDIS_URL, *parts])
    async with httpx.AsyncClient(timeout=5.0) as client:
        res = await client.get(url, headers={"Authorization": f"Bearer {_REDIS_TOKEN}"})
        res.raise_for_status()
        return res.json()


def _stats(count: int, total: int) -> dict:
    return {"count": count, "average": round(total / count, 2) if count else 0.0}


async def record_review(stars: int) -> dict:
    if not _configured():
        return _ZERO_STATS
    count_res = await _command("incr", _COUNT_KEY)
    sum_res = await _command("incrby", _SUM_KEY, str(stars))
    return _stats(count_res["result"], sum_res["result"])


async def get_review_stats() -> dict:
    if not _configured():
        return _ZERO_STATS
    count_res = await _command("get", _COUNT_KEY)
    sum_res = await _command("get", _SUM_KEY)
    count = int(count_res["result"] or 0)
    total = int(sum_res["result"] or 0)
    return _stats(count, total)
