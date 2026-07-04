import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  validateWalkSteps,
  getDailyStepGoal,
  DEFAULT_DAILY_STEP_GOAL,
  MAX_STEPS_PER_SECOND,
} from "./walkLogic";

describe("walk step validation", () => {
  it("passes a plausible step count through unchanged", () => {
    // 60s walking at ~1.8 steps/sec = 108 steps, well under the cap.
    expect(validateWalkSteps({ steps: 108, elapsedSeconds: 60 })).toBe(108);
  });

  it("clamps an impossible count down to the physical cap", () => {
    // 10s session can't yield 99999 steps.
    const capped = validateWalkSteps({ steps: 99999, elapsedSeconds: 10 });
    expect(capped).toBe(Math.ceil((10 + 2) * MAX_STEPS_PER_SECOND));
    expect(capped).toBeLessThan(99999);
  });

  it("rejects negative or non-finite counts", () => {
    expect(() => validateWalkSteps({ steps: -5, elapsedSeconds: 60 })).toThrow(
      TRPCError
    );
    expect(() =>
      validateWalkSteps({ steps: NaN, elapsedSeconds: 60 })
    ).toThrow(TRPCError);
  });

  it("rounds fractional steps", () => {
    expect(validateWalkSteps({ steps: 50.6, elapsedSeconds: 60 })).toBe(51);
  });

  it("defaults the daily goal when env is unset/invalid", () => {
    delete process.env.DAILY_STEP_GOAL;
    expect(getDailyStepGoal()).toBe(DEFAULT_DAILY_STEP_GOAL);
    process.env.DAILY_STEP_GOAL = "0";
    expect(getDailyStepGoal()).toBe(DEFAULT_DAILY_STEP_GOAL);
    process.env.DAILY_STEP_GOAL = "8000";
    expect(getDailyStepGoal()).toBe(8000);
    delete process.env.DAILY_STEP_GOAL;
  });
});
