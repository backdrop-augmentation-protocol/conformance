import { describe, expect, it } from "vitest";
import { InvalidLifecycleStateError, LifecycleMachine } from "../src/lifecycle.js";

describe("Core lifecycle state machine", () => {
  it("uses the specified handshake and lifecycle states", () => {
    const machine = new LifecycleMachine("component");
    expect(machine.apply("connect")).toBe("connected");
    expect(machine.apply("initialize")).toBe("initialized");
    expect(machine.apply("start")).toBe("running");
    expect(machine.apply("pause")).toBe("paused");
    expect(machine.apply("resume")).toBe("running");
    expect(machine.apply("stop")).toBe("stopped");
    expect(machine.apply("restart")).toBe("initialized");
    expect(machine.apply("start")).toBe("running");
  });

  it("keeps pause, resume, and stop idempotent in their stable states", () => {
    const machine = new LifecycleMachine("host");
    machine.apply("connect");
    machine.apply("initialize");
    machine.apply("start");
    expect(machine.apply("resume")).toBe("running");
    expect(machine.apply("pause")).toBe("paused");
    expect(machine.apply("pause")).toBe("paused");
    expect(machine.apply("stop")).toBe("stopped");
    expect(machine.apply("stop")).toBe("stopped");
  });

  it("rejects invalid transitions without mutating state", () => {
    const machine = new LifecycleMachine("component");
    expect(() => machine.apply("start")).toThrow(InvalidLifecycleStateError);
    expect(machine.state).toBe("created");
    machine.apply("connect");
    expect(() => machine.apply("pause")).toThrow(/cannot pause from connected/);
    expect(machine.state).toBe("connected");
    machine.apply("initialize");
    machine.apply("start");
    machine.apply("stop");
    expect(() => machine.apply("start")).toThrow(/cannot start from stopped/);
    expect(machine.state).toBe("stopped");
  });

  it("can fail from each non-terminal state but never leave failed", () => {
    for (const state of ["created", "connected", "initialized", "running", "paused"] as const) {
      const machine = new LifecycleMachine("companion");
      machine.state = state;
      expect(machine.apply("fail")).toBe("failed");
      expect(() => machine.apply("restart")).toThrow(InvalidLifecycleStateError);
      expect(machine.state).toBe("failed");
    }
  });
});
