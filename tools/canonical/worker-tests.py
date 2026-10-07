"""Exercise real isolated worker HTTP boundary, including process memory cap on this OS."""

import base64, json, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
URL = "http://127.0.0.1:8105/canonical/"
results = []


def request(action, data, token="canonical-local-test-token"):
    req = urllib.request.Request(
        URL + action,
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)


def test(name, fn):
    try:
        fn()
        results.append({"name": name, "result": "PASS"})
    except Exception as exc:
        results.append({"name": name, "result": "FAILED", "reason": str(exc)})


def expect(status, action, data, token="canonical-local-test-token"):
    code, result = request(action, data, token)
    assert code == status, (code, result)
    return result


data = base64.b64encode(
    (ROOT / "tools/canonical/fixtures/partitioned-concave.dxf").read_bytes()
).decode()
test(
    "Worker requires authenticated service identity",
    lambda: expect(401, "reconstruct", {}, "wrong"),
)
test(
    "Worker rejects path injection fields",
    lambda: expect(400, "reconstruct", {"filePath": "../../secrets"}),
)
test("Worker rejects unsupported operation", lambda: expect(404, "other", {}))
test(
    "Worker rejects malformed DXF without geometry",
    lambda: expect(
        422,
        "reconstruct",
        {"data": base64.b64encode(b"bad").decode(), "assetId": "test"},
    ),
)
output = {}


def reconstruct():
    output.update(expect(200, "reconstruct", {"data": data, "assetId": "test"}))
    assert len(output["canonical"]["rooms"]) == 2


test("Bounded worker reconstructs source in a separate process", reconstruct)


def correction():
    t = output["canonical"]
    r = expect(
        200,
        "correct",
        {
            "canonical": t,
            "commands": [
                {
                    "type": "RenameRoom",
                    "targetId": t["rooms"][0]["id"],
                    "value": "Checked name",
                    "reason": "Source text checked",
                }
            ],
        },
    )
    assert r["canonical"]["rooms"][0]["name"] == "Checked name"
    assert t["rooms"][0]["name"] != "Checked name"


test("Worker applies immutable corrections", correction)
test(
    "Worker validates canonical geometry",
    lambda: expect(200, "validate", {"canonical": output["canonical"]}),
)
(ROOT / "evidence/canonical/worker-tests.json").write_text(
    json.dumps(results, indent=2), encoding="utf8"
)
print(json.dumps(results, indent=2))
if any(r["result"] != "PASS" for r in results):
    raise SystemExit(1)
