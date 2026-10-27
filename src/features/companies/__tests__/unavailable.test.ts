/**
 * With mock mode off the repository resolves to the real API provider
 * (`GET /super-admin/companies[/:id]`) with the demo provider injected as the
 * fallback the owner approved on 2026-09-24: unreachable backend or no rows →
 * show the mock data instead of an empty table. 401/403 still propagate (they
 * cannot be exercised here without a live server; covered by the live API
 * contract suite when the backend is up).
 *
 * `node --test` runs each file in its own process, so the environment set
 * here cannot leak into the other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const { companiesRepository } = await import("../data/repository");
const { COMPANIES_MOCK_MODE } = await import("../data/config");

describe("api mode", () => {
  it("turns the single mock flag off and wires the API provider", () => {
    assert.equal(COMPANIES_MOCK_MODE, false);
    assert.equal(companiesRepository.mode, "api");
  });

  it("propagates network error when backend is unreachable instead of silent mock fallback", async () => {
    await assert.rejects(
      async () => {
        await companiesRepository.listCompanies({});
      },
      (err: any) => err.code === "NETWORK_ERROR" || err.status === 0
    );
  });

  it("never serves a demo company: a demo id is 'not connected' (503), not sample data", async () => {
    await assert.rejects(companiesRepository.getCompany("cmp_namo-gange-trust"), (err: any) => err.status === 503);
  });

  it("shows an empty portfolio, not the demo one, when the backend has no companies", async () => {
    const portfolio = await companiesRepository.getPortfolio();
    assert.equal(portfolio.total, 0);
    assert.equal(portfolio.attentionItems.length, 0);
  });

  it("has no demo reset and reports 'not connected' for what the backend does not serve yet", async () => {
    assert.equal(companiesRepository.resetDemoData, undefined);
    await assert.rejects(companiesRepository.addNote("00000000-0000-4000-8000-000000000001", { body: "x" } as never, {} as never), (err: any) => err.status === 503);
  });
});
