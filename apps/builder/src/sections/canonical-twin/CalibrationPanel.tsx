"use client";
import React, { useState } from "react";
import type { CanonicalTwinV1, Correction } from "@aether/twin-schema";

export function CalibrationPanel({
  twin,
  queue,
  reprocess,
}: {
  twin: CanonicalTwinV1;
  queue: (c: Correction) => void;
  reprocess: (c: Record<string, unknown>) => void;
}) {
  const [error, setError] = useState("");
  const reconstruct = (form: HTMLFormElement) => {
    try {
      const data = new FormData(form),
        mapping = JSON.parse(String(data.get("mapping")));
      const config: Record<string, unknown> = { layerMapping: mapping };
      const units = String(data.get("units"));
      const scales: Record<string, number> = {
        millimeters: 0.001,
        centimeters: 0.01,
        meters: 1,
        inches: 0.0254,
        feet: 0.3048,
      };
      if (units !== "unknown") {
        config.sourceUnits = units;
        config.scaleToMeters = scales[units];
      }
      if (data.get("segment")) {
        const [a, b] = JSON.parse(String(data.get("segment")));
        const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const known = Number(data.get("distance"));
        if (
          !Number.isFinite(distance) ||
          distance <= 0 ||
          !Number.isFinite(known) ||
          known <= 0
        )
          throw new Error(
            "Enter two source points and a positive known distance",
          );
        config.scaleToMeters = known / distance;
        config.sourceUnits = units;
      }
      if (data.get("origin"))
        config.sourceOrigin = JSON.parse(String(data.get("origin")));
      setError("");
      reprocess(config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid calibration");
    }
  };
  return (
    <details className="rounded-lg border p-3">
      <summary className="font-semibold cursor-pointer">
        Units, calibration and layer roles
      </summary>
      <p className="text-sm my-2">
        Source units: {twin.frame.sourceUnits}. Scale:{" "}
        {twin.frame.scaleToMeters ?? "unknown"} metres per source unit. All
        geometry edits use metres.
      </p>
      <form
        className="space-y-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          reconstruct(e.currentTarget);
        }}
        key={twin.revision.id}
      >
        <label className="block">
          Drawing units
          <select
            name="units"
            aria-label="Drawing units"
            defaultValue={twin.frame.sourceUnits}
            className="border p-2 w-full"
          >
            {[
              "unknown",
              "millimeters",
              "centimeters",
              "meters",
              "inches",
              "feet",
            ].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Known segment in source coordinates
          <input
            name="segment"
            aria-label="Calibration segment"
            placeholder="[[0,0],[8000,0]]"
            className="border p-2 w-full"
          />
        </label>
        <label className="block">
          Known length in metres
          <input
            name="distance"
            aria-label="Calibration distance"
            type="number"
            min=".000001"
            step="any"
            className="border p-2 w-full"
          />
        </label>
        <label className="block">
          Source origin override (optional)
          <input
            name="origin"
            aria-label="Source origin"
            placeholder="[x,y,z]"
            className="border p-2 w-full"
          />
        </label>
        <label className="block">
          Layer roles
          <textarea
            name="mapping"
            aria-label="Layer mapping"
            defaultValue={JSON.stringify(
              twin.config.layerMapping || {},
              null,
              2,
            )}
            className="border w-full h-28 font-mono"
          />
        </label>
        <p>
          Map exact layer names to walls, doors, windows, annotations, voids or
          ignore. Unknown layers remain review issues.
        </p>
        <button className="rounded border px-3 py-2">
          Reconstruct with settings
        </button>
      </form>
      <button
        className="mt-3 rounded border px-3 py-2 text-sm"
        onClick={() =>
          queue({
            type: "ConfirmCalibration",
            reason:
              "Confirmed drawing units and checked a known dimension against source",
          })
        }
      >
        Confirm checked calibration
      </button>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </details>
  );
}
