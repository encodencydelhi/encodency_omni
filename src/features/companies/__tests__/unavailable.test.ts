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

  it("falls back to demo data for the list when the backend is unreachable", async () => {
    const list = await companiesRepository.listCompanies({});
    assert.ok(Array.isArray(list.data));
    assert.ok(list.data.length > 0, "expected the mock fallback to supply rows");
    assert.ok(list.matchingIds.length > 0);
    assert.ok(list.pagination.total >= list.data.length);
  });

  it("routes non-UUID demo ids straight to the fallback detail reader", async () => {
    const company = await companiesRepository.getCompany("cmp_namo-gange-trust");
    assert.equal(company.company.id, "cmp_namo-gange-trust");
    assert.equal(company.company.name, "Namo Gange Trust");
  });

  it("still delegates methods the backend does not serve to the fallback", async () => {
    const portfolio = await companiesRepository.getPortfolio();
    assert.ok(portfolio.total > 0, "portfolio KPIs come from the demo fallback");
  });
});
