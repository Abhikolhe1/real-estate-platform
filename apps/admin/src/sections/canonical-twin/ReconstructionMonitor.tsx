"use client";
import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/config/api";
type Job = {
  jobId: string;
  tenantId: string;
  floorplanId: string;
  stage: string;
  createdAt: string;
  failure: { message: string } | null;
  approvedRevisionId: string | null;
};
export default function ReconstructionMonitor() {
  const token = useAuthStore((s) => s.token),
    [jobs, setJobs] = useState<Job[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const res = await fetch(`${API_URL}/canonical-admin/status`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Status unavailable");
        setJobs(data);
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [token]);
  return (
    <section className="rounded-xl border bg-white p-5 mt-6">
      <h2 className="font-semibold text-lg">CAD processing</h2>
      <p className="text-sm text-gray-500 my-2">
        Recent reconstruction jobs and approval status.
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="overflow-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              {[
                "Tenant",
                "Floorplan",
                "Stage",
                "Approved revision",
                "Failure",
              ].map((s) => (
                <th key={s} className="p-2">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.jobId} className="border-t">
                <td className="p-2">{j.tenantId}</td>
                <td className="p-2">{j.floorplanId}</td>
                <td className="p-2">{j.stage}</td>
                <td className="p-2">{j.approvedRevisionId || "none"}</td>
                <td className="p-2">{j.failure?.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!error && !jobs.length && <p className="py-3">No CAD jobs.</p>}
      </div>
    </section>
  );
}
