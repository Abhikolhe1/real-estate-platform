"""Run canonical unit tests and retain the actual per-test results."""

import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / "apps/ai-service"
sys.path.insert(0, str(SERVICE))
records = []


class ReportResult(unittest.TextTestResult):
    def addSuccess(self, test):
        super().addSuccess(test)
        records.append({"name": test.id(), "result": "PASS"})

    def addFailure(self, test, err):
        super().addFailure(test, err)
        records.append(
            {
                "name": test.id(),
                "result": "FAILED",
                "reason": self._exc_info_to_string(err, test),
            }
        )

    def addError(self, test, err):
        super().addError(test, err)
        records.append(
            {
                "name": test.id(),
                "result": "FAILED",
                "reason": self._exc_info_to_string(err, test),
            }
        )

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        records.append({"name": test.id(), "result": "UNVERIFIED", "reason": reason})


suite = unittest.defaultTestLoader.discover(str(SERVICE / "tests"))
result = unittest.TextTestRunner(verbosity=2, resultclass=ReportResult).run(suite)
output = ROOT / "evidence/canonical/python-tests.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    json.dumps({"testsRan": result.testsRun, "results": records}, indent=2) + "\n",
    encoding="utf8",
)
sys.exit(0 if result.wasSuccessful() else 1)
