import copy
import unittest
from tests.test_canonical import drawing, rectangle, parse
from cad.corrections import correct, rebase
from cad.validation import validate_geometry


class CorrectionTests(unittest.TestCase):
    def setUp(self):
        self.twin = parse(rectangle(drawing()))

    def command(self, typ, target=None, value=None):
        return {
            "type": typ,
            "targetId": target,
            "value": value,
            "reason": "Checked source dimension",
        }

    def test_immutable_rename_history(self):
        original = copy.deepcopy(self.twin)
        room = self.twin["rooms"][0]
        t, changes = correct(
            self.twin, [self.command("RenameRoom", room["id"], "Living")]
        )
        self.assertEqual(self.twin, original)
        self.assertEqual(t["rooms"][0]["name"], "Living")
        self.assertEqual(changes[0]["before"]["name"], room["name"])
        self.assertEqual(changes[0]["after"]["name"], "Living")
        self.assertEqual(t["rooms"][0]["evidence"]["reviewState"], "corrected")

    def test_calibration_and_defaults_gate(self):
        t, _ = correct(
            self.twin,
            [self.command("AcceptDefaults"), self.command("ConfirmCalibration")],
        )
        self.assertFalse(
            any(i["severity"] == "blocking" and not i["resolved"] for i in t["issues"])
        )
        self.assertTrue(t["frame"]["calibrated"])
        self.assertEqual(validate_geometry(t), [])

    def test_geometry_issue_cannot_be_dismissed(self):
        t = parse(rectangle(drawing(0)))
        issue = next(i for i in t["issues"] if i["code"] == "UNKNOWN_UNITS")
        with self.assertRaises(ValueError):
            correct(t, [self.command("ResolveIssue", issue["id"])])
        with self.assertRaises(ValueError):
            correct(t, [self.command("ConfirmCalibration")])

    def test_vertex_move_updates_walls_support_area(self):
        r = self.twin["rooms"][0]
        fp = copy.deepcopy(r["footprint"])
        fp["outer"][1][0] = 5
        fp["outer"][2][0] = 5
        t, _ = correct(self.twin, [self.command("AdjustRoomBoundary", r["id"], fp)])
        self.assertEqual(t["rooms"][0]["areaM2"], 15)
        self.assertEqual(validate_geometry(t), [])
        self.assertTrue(all(s["footprint"] == fp for s in t["slabs"]))

    def test_split_then_merge_roundtrip(self):
        r = self.twin["rooms"][0]
        t, _ = correct(
            self.twin, [self.command("SplitRoom", r["id"], [[2, -1], [2, 4]])]
        )
        self.assertEqual(len(t["rooms"]), 2)
        self.assertEqual(sum(r["areaM2"] for r in t["rooms"]), 12)
        self.assertEqual(validate_geometry(t), [])
        t, _ = correct(
            t, [self.command("MergeRooms", t["rooms"][0]["id"], t["rooms"][1]["id"])]
        )
        self.assertEqual(len(t["rooms"]), 1)
        self.assertEqual(t["rooms"][0]["areaM2"], 12)
        self.assertEqual(validate_geometry(t), [])

    def test_opening_host_edits_and_rejection(self):
        d = rectangle(drawing())
        d.modelspace().add_line((1, 0), (2, 0), dxfattribs={"layer": "DOOR"})
        t = parse(d)
        o = t["openings"][0]
        t, _ = correct(
            t,
            [
                self.command(
                    "AdjustOpeningSpan", o["id"], {"startOffsetM": 2, "widthM": 0.8}
                )
            ],
        )
        self.assertEqual(t["openings"][0]["startOffsetM"], 2)
        self.assertEqual(validate_geometry(t), [])
        t, _ = correct(t, [self.command("RejectOpening", o["id"])])
        self.assertEqual(t["traversal"], [])
        self.assertTrue(all(not w["openingIds"] for w in t["walls"]))

    def test_rebase_exact_and_conflicting_configuration(self):
        r = self.twin["rooms"][0]
        old, history = correct(
            self.twin, [self.command("RenameRoom", r["id"], "Saved name")]
        )
        t, applied = rebase(self.twin, old, history)
        self.assertEqual(t["rooms"][0]["name"], "Saved name")
        self.assertEqual(len(applied), 1)
        changed = copy.deepcopy(self.twin)
        changed["config"]["wallThicknessM"] = 0.2
        t, applied = rebase(changed, old, history)
        self.assertEqual(applied, [])
        self.assertTrue(any(i["code"] == "REPROCESS_CONFLICT" for i in t["issues"]))

    def test_invalid_matrix_provenance_and_graph_block(self):
        t = copy.deepcopy(self.twin)
        t["frame"]["localToSourceMatrix"][0] = 2
        t["walls"][0]["sourceRefs"][0]["assetId"] = "foreign"
        t["traversal"] = [{"doorId": "fiction", "roomIds": [], "exterior": True}]
        codes = {i["code"] for i in validate_geometry(t)}
        self.assertTrue(
            {"INVALID_FRAME", "INVALID_PROVENANCE", "INVALID_TRAVERSAL"} <= codes
        )

    def test_empty_unknown_and_mass_assignment_commands_rejected(self):
        for commands in [
            [],
            [self.command("NotACommand")],
            [
                {
                    **self.command("RenameRoom", self.twin["rooms"][0]["id"], "x"),
                    "tenantId": "fake",
                }
            ],
        ]:
            with self.assertRaises(ValueError):
                correct(self.twin, commands)


if __name__ == "__main__":
    unittest.main()
