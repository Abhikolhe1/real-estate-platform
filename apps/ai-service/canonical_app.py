import asyncio
import hmac
import json
import os
from pathlib import Path
import sys
from fastapi import FastAPI, HTTPException, Request
from cad.config import MAX_SECONDS

app = FastAPI(title="Aether Canonical CAD Worker", version="1.0.0")
slots = asyncio.Semaphore(2)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "schema": "aether-twin/1",
        "capabilities": ["ascii-dxf-single-floor"],
    }


@app.post("/canonical/{action}")
async def work(action: str, request: Request):
    token = os.environ.get("CAD_SERVICE_TOKEN", "")
    if not token:
        raise HTTPException(503, "CAD service authentication is not configured")
    if not hmac.compare_digest(
        request.headers.get("authorization", ""), "Bearer " + token
    ):
        raise HTTPException(401, "Invalid service identity")
    if action not in ("reconstruct", "correct", "validate"):
        raise HTTPException(404, "Unknown operation")
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 32 * 1024 * 1024:
            raise HTTPException(413, "Worker request limit")
    try:
        body = json.loads(data)
        allowed = (
            {"data", "assetId", "config", "previous", "history"}
            if action == "reconstruct"
            else ({"canonical", "commands"} if action == "correct" else {"canonical"})
        )
        if not isinstance(body, dict) or set(body) - allowed:
            raise ValueError("Unexpected request field")
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, str(exc)) from exc
    body["action"] = action
    try:
        await asyncio.wait_for(slots.acquire(), timeout=1)
    except TimeoutError as exc:
        raise HTTPException(429, "CAD worker capacity reached") from exc
    process = None
    try:
        system_keys = {
            "PATH",
            "SYSTEMROOT",
            "WINDIR",
            "COMSPEC",
            "PATHEXT",
            "TEMP",
            "TMP",
            "LANG",
            "LC_ALL",
            "PYTHONUTF8",
            "VIRTUAL_ENV",
            "HOME",
            "USERPROFILE",
            "HOMEDRIVE",
            "HOMEPATH",
        }
        worker_env = {
            key: value
            for key, value in os.environ.items()
            if key.upper() in system_keys
        }
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            "-B",
            "-m",
            "cad.worker",
            cwd=Path(__file__).parent,
            env=worker_env,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )

        async def exchange():
            process.stdin.write(json.dumps(body).encode())
            await process.stdin.drain()
            process.stdin.close()
            output = bytearray()
            while chunk := await process.stdout.read(65536):
                output.extend(chunk)
                if len(output) > 32 * 1024 * 1024:
                    raise HTTPException(422, {"code": "WORKER_OUTPUT_LIMIT"})
            await process.wait()
            return output

        output = await asyncio.wait_for(exchange(), timeout=MAX_SECONDS)
        result = json.loads(output)
        if process.returncode:
            raise HTTPException(422, result.get("failure", {"code": "WORKER_FAILED"}))
        return result
    except TimeoutError as exc:
        raise HTTPException(422, {"code": "PROCESSING_TIMEOUT"}) from exc
    except (
        json.JSONDecodeError,
        MemoryError,
        BrokenPipeError,
        ConnectionResetError,
    ) as exc:
        raise HTTPException(422, {"code": "WORKER_RESOURCE_FAILURE"}) from exc
    finally:
        if process and process.returncode is None:
            process.kill()
            await process.wait()
        slots.release()
