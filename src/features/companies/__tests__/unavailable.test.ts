/**
 * With mock mode off the workspace must refuse to show data rather than pass
 * demo records off as production data. `node --test` runs each file in its own
 * process, so the environment set here cannot leak into the other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const { companiesRepository } = await import("../data/repository");
const { COMPANIES_MOCK_MODE } = await import("../data/config");
const { ApiError } = await import("@/types/api");

describe("mock mode off", () => {
  it("turns the single mock flag off", () => {
    assert.equal(COMPANIES_MOCK_MODE, false);
    assert.equal(companiesRepository.mode, "unavailable");
  });

  it("fails every read and write as service unavailable, never with data", async () => {
    const calls: Array<() => Promise<unknown>> = [
      () => companiesRepository.listCompanies({}),
      () => companiesRepository.getPortfolio(),
      () => companiesRepository.getCompany("cmp_namo-gange-trust"),
      () => companiesRepository.getBilling("cmp_namo-gange-trust"),
      () => companiesRepository.suspendCompanies(["cmp_namo-gange-trust"], { reason: "billing", note: "" }, { id: "x", name: "x" }),
    ];
    for (const call of calls) {
      await assert.rejects(call(), (error: unknown) => ApiError.isApiError(error) && error.code === "SERVICE_UNAVAILABLE" && error.status === 503);
    }
  });
});
