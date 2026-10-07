import io
import json
import math
import unittest
import ezdxf
from shapely.geometry import Polygon, Point
from cad.pipeline import reconstruct
from cad.raw_entities import CadLimitError
from cad.schema import CanonicalTwinV1


def drawing(units=6):
    d = ezdxf.new("R2010")
    d.units = units
    for layer in ["WALL", "DOOR", "WINDOW", "ROOM", "VOID"]:
        d.layers.new(layer)
    return d


def rectangle(doc, kind="LINE", factor=1, origin=(0, 0), width=4, depth=3):
    pts = [
        (origin[0] + x * factor, origin[1] + y * factor)
        for x, y in [(0, 0), (width, 0), (width, depth), (0, depth)]
    ]
    m = doc.modelspace()
    if kind == "LINE":
        for a, b in zip(pts, pts[1:] + pts[:1]):
            m.add_line(a, b, dxfattribs={"layer": "WALL"})
    elif kind == "LWPOLYLINE":
        m.add_lwpolyline(pts, close=True, dxfattribs={"layer": "WALL"})
    else:
        m.add_polyline2d(pts, close=True, dxfattribs={"layer": "WALL"})
    return doc


def as_bytes(doc):
    text = io.StringIO()
    doc.write(text)
    return text.getvalue().encode()


def parse(doc, config=None):
    return reconstruct(as_bytes(doc), "test-asset", config)[0]


class CanonicalGeometryTests(unittest.TestCase):
    def test_line_rectangle(self):
        t = parse(rectangle(drawing()))
        self.assertEqual(len(t["walls"]), 4)
        self.assertEqual(len(t["rooms"]), 1)
        self.assertAlmostEqual(t["rooms"][0]["areaM2"], 12)
        CanonicalTwinV1.model_validate(t)

    def test_lwpolyline_rectangle(self):
        t = parse(rectangle(drawing(), "LWPOLYLINE"))
        self.assertEqual(len(t["walls"]), 4)
        self.assertEqual(
            t["rooms"][0]["footprint"]["outer"], [[0, 0], [4, 0], [4, 3], [0, 3]]
        )

    def test_polyline_rectangle(self):
        t = parse(rectangle(drawing(), "POLYLINE"))
        self.assertEqual(len(t["walls"]), 4)
        self.assertEqual(len(t["rooms"]), 1)

    def test_metric_equivalence(self):
        a = parse(rectangle(drawing(6)))
        b = parse(rectangle(drawing(4), factor=1000))
        self.assertEqual(a["rooms"][0]["footprint"], b["rooms"][0]["footprint"])
        self.assertEqual(
            [(w["start"], w["end"]) for w in a["walls"]],
            [(w["start"], w["end"]) for w in b["walls"]],
        )

    def test_large_origin_roundtrip(self):
        t = parse(rectangle(drawing(4), factor=1000, origin=(1234567, 7654321)))
        self.assertEqual(t["rooms"][0]["areaM2"], 12)

        def transform(m, p):
            return [
                sum(m[i + 4 * j] * p[j] for j in range(3)) + m[i + 12] for i in range(3)
            ]

        source = [1234989, 7654856, 41]
        restored = transform(
            t["frame"]["localToSourceMatrix"],
            transform(t["frame"]["sourceToLocalMatrix"], source),
        )
        for a, b in zip(restored, source):
            self.assertAlmostEqual(a, b, places=7)

    def test_unknown_units_block(self):
        t = parse(rectangle(drawing(0)))
        self.assertIsNone(t["frame"]["scaleToMeters"])
        self.assertEqual(t["walls"], [])
        self.assertTrue(any(i["code"] == "UNKNOWN_UNITS" for i in t["issues"]))

    def test_nested_block_transform_lineage(self):
        d = drawing()
        inner = d.blocks.new("INNER")
        source = inner.add_line((0, 0), (2, 0), dxfattribs={"layer": "0"})
        outer = d.blocks.new("OUTER")
        outer.add_blockref("INNER", (1, 0), dxfattribs={"rotation": 90})
        d.modelspace().add_blockref(
            "OUTER", (10, 20), dxfattribs={"xscale": 2, "yscale": 2, "layer": "WALL"}
        )
        t = parse(d)
        e = t["sourceEntities"][0]
        self.assertAlmostEqual(e["sourcePoints"][0][0], 12)
        self.assertAlmostEqual(e["sourcePoints"][1][1], 24)
        self.assertEqual(e["sourceRefs"][0]["handle"], source.dxf.handle)
        self.assertEqual(len(e["sourceRefs"][0]["instancePath"]), 2)

    def test_cyclic_insert_bounded(self):
        d = drawing()
        block = d.blocks.new("LOOP")
        block.add_blockref("LOOP", (0, 0))
        d.modelspace().add_blockref("LOOP", (0, 0))
        with self.assertRaisesRegex(CadLimitError, "RECURSION"):
            parse(d)

    def test_t_junction(self):
        d = rectangle(drawing())
        d.modelspace().add_line((2, 0), (2, 3), dxfattribs={"layer": "WALL"})
        t = parse(d)
        self.assertEqual(len(t["rooms"]), 2)
        self.assertEqual(len(t["walls"]), 7)
        self.assertEqual(sorted(r["areaM2"] for r in t["rooms"]), [6, 6])

    def test_x_junction(self):
        d = rectangle(drawing())
        for a, b in [((2, 0), (2, 3)), ((0, 1.5), (4, 1.5))]:
            d.modelspace().add_line(a, b, dxfattribs={"layer": "WALL"})
        t = parse(d)
        self.assertEqual(len(t["rooms"]), 4)
        self.assertEqual(len(t["walls"]), 12)

    def test_concave_room(self):
        d = drawing()
        pts = [(0, 0), (5, 0), (5, 1), (1, 1), (1, 5), (0, 5)]
        d.modelspace().add_lwpolyline(pts, close=True, dxfattribs={"layer": "WALL"})
        r = parse(d)["rooms"][0]
        self.assertEqual(r["areaM2"], 9)
        self.assertEqual(len(r["footprint"]["outer"]), 6)
        self.assertTrue(Polygon(pts).contains(Point(r["spawn"][0], r["spawn"][2])))

    def test_courtyard_hole(self):
        d = rectangle(drawing(), width=10, depth=10)
        d.modelspace().add_lwpolyline(
            [(3, 3), (7, 3), (7, 7), (3, 7)], close=True, dxfattribs={"layer": "VOID"}
        )
        t = parse(d)
        self.assertEqual(len(t["rooms"]), 1)
        self.assertEqual(t["rooms"][0]["areaM2"], 84)
        self.assertEqual(len(t["rooms"][0]["footprint"]["holes"]), 1)

    def test_duplicates_and_overlap(self):
        d = rectangle(drawing())
        d.modelspace().add_line((4, 0), (0, 0), dxfattribs={"layer": "WALL"})
        d.modelspace().add_line((1, 0), (3, 0), dxfattribs={"layer": "WALL"})
        t = parse(d)
        self.assertEqual(len(t["rooms"]), 1)
        self.assertEqual(sum(math.dist(w["start"], w["end"]) for w in t["walls"]), 14)

    def test_opening_start_span_and_adjacency(self):
        d = rectangle(drawing())
        m = d.modelspace()
        m.add_line((1, 0), (2, 0), dxfattribs={"layer": "DOOR"})
        m.add_line((1, 3), (2, 3), dxfattribs={"layer": "WINDOW"})
        t = parse(d)
        self.assertEqual(len(t["openings"]), 2)
        for o in t["openings"]:
            self.assertEqual(o["startOffsetM"], 1)
            self.assertEqual(o["widthM"], 1)
            self.assertEqual(len(o["adjacentRoomIds"]), 1)
        self.assertEqual(len(t["traversal"]), 1)

    def test_ambiguous_host_blocks(self):
        d = rectangle(drawing())
        m = d.modelspace()
        m.add_line((0, 0.02), (4, 0.02), dxfattribs={"layer": "WALL"})
        m.add_line((1, 0.01), (2, 0.01), dxfattribs={"layer": "DOOR"})
        t = parse(d)
        self.assertEqual(t["openings"], [])
        self.assertTrue(
            any(i["code"] == "UNRESOLVED_OPENING_HOST" for i in t["issues"])
        )

    def test_native_label(self):
        d = rectangle(drawing())
        d.modelspace().add_text(
            "Kitchen", dxfattribs={"layer": "ROOM", "insert": (1, 1)}
        )
        self.assertEqual(parse(d)["rooms"][0]["name"], "Kitchen")

    def test_determinism_and_reprocess(self):
        data = as_bytes(rectangle(drawing()))
        a = reconstruct(data, "asset")[0]
        b = reconstruct(data, "asset")[0]
        self.assertEqual(a, b)

    def test_unsupported_reported(self):
        d = rectangle(drawing())
        d.modelspace().add_circle((1, 1), 0.4, dxfattribs={"layer": "WALL"})
        t = parse(d)
        self.assertEqual(t["entityInventory"]["UNSUPPORTED_CIRCLE"], 1)
        self.assertTrue(
            any(
                i["code"] == "UNSUPPORTED_ENTITY" and i["severity"] == "blocking"
                for i in t["issues"]
            )
        )

    def test_bulge_preserved_as_reviewed_approximation(self):
        d = drawing()
        d.modelspace().add_lwpolyline(
            [(0, 0, 1), (2, 0, 0)], format="xyb", dxfattribs={"layer": "WALL"}
        )
        t = parse(d)
        self.assertGreater(len(t["sourceEntities"][0]["sourcePoints"]), 4)
        self.assertTrue(t["sourceEntities"][0]["curved"])

    def test_snap_only_within_metric_tolerance(self):
        for error, expected in [(0.0005, 1), (0.02, 0)]:
            d = drawing()
            m = d.modelspace()
            for a, b in [
                ((error, 0), (4, 0)),
                ((4, 0), (4, 3)),
                ((4, 3), (0, 3)),
                ((0, 3), (0, 0)),
            ]:
                m.add_line(a, b, dxfattribs={"layer": "WALL"})
            self.assertEqual(len(parse(d)["rooms"]), expected)

    def test_door_gap_not_hallucinated(self):
        d = drawing()
        for a, b in [
            ((0, 0), (1, 0)),
            ((2, 0), (4, 0)),
            ((4, 0), (4, 3)),
            ((4, 3), (0, 3)),
            ((0, 3), (0, 0)),
        ]:
            d.modelspace().add_line(a, b, dxfattribs={"layer": "WALL"})
        t = parse(d)
        self.assertEqual(t["rooms"], [])
        self.assertTrue(any(i["code"] == "INCOMPLETE_TOPOLOGY" for i in t["issues"]))

    def test_corrupt_and_oversized_rejected(self):
        for data in [b"not CAD", b"a" * (10 * 1024 * 1024 + 1)]:
            with self.assertRaises(ValueError):
                reconstruct(data, "asset")


if __name__ == "__main__":
    unittest.main()
