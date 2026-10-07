"""One bounded process per request; no tenant ownership or publication authority."""

import base64
import json
import sys


def limit_memory():
    limit = 768 * 1024 * 1024
    if sys.platform != "win32":
        import resource

        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    else:
        # Windows Job Object process-memory cap. The handle lives for this process lifetime.
        import ctypes
        from ctypes import wintypes

        class Basic(ctypes.Structure):
            _fields_ = [
                ("PerProcessUserTimeLimit", ctypes.c_int64),
                ("PerJobUserTimeLimit", ctypes.c_int64),
                ("LimitFlags", wintypes.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class IO(ctypes.Structure):
            _fields_ = [
                (name, ctypes.c_uint64)
                for name in (
                    "ReadOperationCount",
                    "WriteOperationCount",
                    "OtherOperationCount",
                    "ReadTransferCount",
                    "WriteTransferCount",
                    "OtherTransferCount",
                )
            ]

        class Extended(ctypes.Structure):
            _fields_ = [
                ("BasicLimitInformation", Basic),
                ("IoInfo", IO),
                ("ProcessMemoryLimit", ctypes.c_size_t),
                ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t),
                ("PeakJobMemoryUsed", ctypes.c_size_t),
            ]

        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.CreateJobObjectW.restype = wintypes.HANDLE
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        kernel.SetInformationJobObject.argtypes = [
            wintypes.HANDLE,
            ctypes.c_int,
            ctypes.c_void_p,
            wintypes.DWORD,
        ]
        kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        job = kernel.CreateJobObjectW(None, None)
        info = Extended()
        info.BasicLimitInformation.LimitFlags = 0x100  # JOB_OBJECT_LIMIT_PROCESS_MEMORY
        info.ProcessMemoryLimit = limit
        if (
            not job
            or not kernel.SetInformationJobObject(
                job, 9, ctypes.byref(info), ctypes.sizeof(info)
            )
            or not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess())
        ):
            raise RuntimeError("MEMORY_LIMIT_SETUP_FAILED")


def main():
    limit_memory()
    from .pipeline import reconstruct
    from .corrections import correct, rebase
    from .validation import validate_geometry

    request = json.loads(sys.stdin.buffer.read(32 * 1024 * 1024 + 1))
    action = request["action"]
    if action == "reconstruct":
        twin, timings = reconstruct(
            base64.b64decode(request["data"], validate=True),
            request["assetId"],
            request.get("config"),
        )
        changes = []
        if request.get("previous"):
            twin, changes = rebase(
                twin, request["previous"], request.get("history", [])
            )
        output = {"canonical": twin, "timings": timings, "changes": changes}
    elif action == "correct":
        twin, changes = correct(request["canonical"], request["commands"])
        output = {"canonical": twin, "changes": changes}
    elif action == "validate":
        output = {"issues": validate_geometry(request["canonical"])}
    else:
        raise ValueError("Unknown worker action")
    sys.stdout.write(json.dumps(output, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stdout.write(
            json.dumps(
                {"failure": {"code": type(exc).__name__, "message": str(exc)[:1000]}}
            )
        )
        sys.exit(1)
