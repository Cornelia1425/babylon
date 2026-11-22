"""Babylon: the tower's memory.

This service generates nothing. It keeps count of two things that cannot be generated:
bridges that two climbers on two devices joined by standing at both ends at the same
moment, towers whose every bridge was joined, and climbs that reached the top. The game tells it; it remembers; every visitor
sees the same numbers.

Deploy:  modal deploy modal_app.py
"""
import modal

app = modal.App("babylon")
image = modal.Image.debian_slim().pip_install("fastapi[standard]")
ledger = modal.Dict.from_name("babylon-ledger", create_if_missing=True)


def make_web(store):
    from datetime import datetime, timedelta, timezone

    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    web = FastAPI()
    web.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    def today():  # the day in New York, where the tower was built
        return datetime.now(timezone(timedelta(hours=-5))).strftime("%Y-%m-%d")

    def page(day):
        rec = store.get(day) or {"bridges": [], "towers": [], "summits": 0}
        return rec, {"day": day, "bridges": len(rec["bridges"]), "towers": len(rec["towers"]), "summits": rec["summits"]}

    @web.get("/tower")
    def tower():
        return page(today())[1]

    @web.post("/witness")
    def witness(body: dict):
        day = today()
        rec, _ = page(day)
        kind, key = body.get("kind"), str(body.get("key", ""))[:40]
        if kind == "bridge" and key and key not in rec["bridges"] and len(rec["bridges"]) < 5000:
            rec["bridges"] = rec["bridges"] + [key]  # one bridge in one room counts once, whoever reports it
        elif kind == "tower" and key and key not in rec["towers"] and len(rec["towers"]) < 5000:
            rec["towers"] = rec["towers"] + [key]  # a tower whose five bridges were all joined, then climbed through
        elif kind == "summit":
            rec["summits"] += 1
        else:
            return page(day)[1]
        store[day] = rec
        return page(day)[1]

    return web


@app.function(image=image)
@modal.asgi_app()
def api():
    return make_web(ledger)
