import assert from "node:assert/strict";
import test from "node:test";
import { adaptAnalyticsDashboard } from "../../lib/analyticsDashboardAdapter";
import { buildMockAnalyticsDashboard } from "../../lib/analyticsDashboardMock";

const COMPETENCY_ID = "e48d5549-e955-49b1-9ee6-571d5a939d97";

test("adaptAnalyticsDashboard sorts behavior totals descending and exposes company tabs", () => {
  const viewModel = adaptAnalyticsDashboard(
    buildMockAnalyticsDashboard({
      competencyId: COMPETENCY_ID,
    }),
  );

  assert.equal(viewModel.meta.showCompanyTabs, true);
  assert.equal(viewModel.behaviorTotals[0].label, "Amaç & Hedef");
  assert.equal(viewModel.behaviorTotals[0].value, 45);
  assert.equal(viewModel.behaviorTotals.at(-1)?.label, "İleri Bildirim");
});

test("adaptAnalyticsDashboard keeps top senders ordered by rank", () => {
  const viewModel = adaptAnalyticsDashboard(
    buildMockAnalyticsDashboard({
      competencyId: COMPETENCY_ID,
      company: "all",
    }),
  );

  assert.equal(viewModel.topSenders[0].rank, 1);
  assert.equal(viewModel.topSenders[0].fullName, "Emin Fadillioğlu");
  assert.equal(viewModel.topSenders[1].rank, 2);
});

test("buildMockAnalyticsDashboard switches selected company and badge", () => {
  const response = buildMockAnalyticsDashboard({
    competencyId: COMPETENCY_ID,
    company: "esan",
  });

  assert.equal(response.meta.selectedCompany, "esan");
  assert.equal(response.meta.totalSignalsBadge, "23 Sinyal");
  assert.equal(response.kpis.uniqueParticipants, 12);
});
