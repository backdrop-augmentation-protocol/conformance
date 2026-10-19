export type Role = "host" | "component" | "companion";
export type LifecycleState = "created" | "initializing" | "ready" | "running" | "paused" | "stopped" | "destroyed";
export interface Manifest { bap: "0.1"; id: string; name: string; version: string; role: Role; capabilities?: string[]; entry?: { standalone?: string; embedded?: string }; }
export interface MessageEnvelope { bap: "0.1"; id: string; kind: "request" | "response" | "event"; type: string; source: Role; target: Role; payload?: Record<string, unknown>; replyTo?: string; error?: { code: string; message: string; retryable?: boolean }; }
export interface ConformanceReport { protocol: "bap"; version: "0.1"; suite: string; startedAt: string; finishedAt: string; passed: number; failed: number; checks: Array<{ id: string; status: "passed" | "failed"; details?: string }>; }
