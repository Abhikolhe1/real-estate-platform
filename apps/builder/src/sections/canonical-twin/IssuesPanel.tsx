"use client";
import React from "react";
import type { CanonicalTwinV1, Correction } from "@aether/twin-schema";
const reviewable = new Set([
  "AMBIGUOUS_WALL",
  "AMBIGUOUS_ROOM",
  "AMBIGUOUS_LABEL",
  "REPROCESS_CONFLICT",
]);
export function IssuesPanel({
  twin,
  select,
  queue,
}: {
  twin: CanonicalTwinV1;
  select: (id: string) => void;
  queue: (c: Correction) => void;
}) {
  return (
    <div
      className="space-y-2 max-h-96 overflow-auto"
      aria-label="Validation issues"
    >
      {twin.issues.length === 0 && <p>No issues found.</p>}
      {twin.issues.map((i) => (
        <div
          key={i.id}
          className={`border-l-4 p-3 text-sm ${i.resolved ? "border-green-500 bg-green-50" : i.severity === "blocking" ? "border-red-500 bg-red-50" : "border-amber-400 bg-amber-50"}`}
        >
          <b>{i.code.replaceAll("_", " ")}</b>
          <span className="ml-2">{i.resolved ? "resolved" : i.severity}</span>
          <pre className="whitespace-pre-wrap break-all text-xs mt-1">
            {JSON.stringify(i.details, null, 2)}
          </pre>
          {i.objectIds.map((id) => (
            <button
              className="mr-2 underline"
              key={id}
              onClick={() => select(id)}
            >
              Locate {id.slice(0, 20)}
            </button>
          ))}
          {!i.resolved &&
            (i.severity !== "blocking" || reviewable.has(i.code)) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  queue({
                    type: "ResolveIssue",
                    targetId: i.id,
                    reason: String(data.get("reason")),
                  });
                }}
                className="mt-2 flex gap-2"
              >
                <input
                  name="reason"
                  required
                  aria-label={`Resolution reason for ${i.code}`}
                  placeholder="Review decision and reason"
                  className="border p-1 min-w-0 flex-1"
                />
                <button>Queue resolution</button>
              </form>
            )}
          {i.resolved && (
            <>
              <p className="text-xs">{i.resolution}</p>
              <button
                className="underline"
                onClick={() =>
                  queue({
                    type: "ReopenIssue",
                    targetId: i.id,
                    reason: "Reopened for further review",
                  })
                }
              >
                Reopen
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
