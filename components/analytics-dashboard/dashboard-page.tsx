"use client";

import { type AnalyticsDashboardResponse } from "@/lib/analyticsDashboard";
import { adaptAnalyticsDashboard } from "@/lib/analyticsDashboardAdapter";
import {
  AnalyticsDashboardBody,
  AnalyticsDashboardHeader,
  AnalyticsDashboardPageShell,
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsLoadingState,
} from "@/components/analytics-dashboard/dashboard-shell";
import {
  BehaviorTrendGridSection,
  CompanyComparisonSection,
  KpiSection,
  OverallTrendSection,
  PeopleAndSummarySection,
} from "@/components/analytics-dashboard/dashboard-sections";

type AnalyticsDashboardPageProps = {
  hasCompetencyId: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  errorMessage?: string | null;
  response?: AnalyticsDashboardResponse;
  onCompanySelect: (slug: string) => void;
};

export default function AnalyticsDashboardPage({
  hasCompetencyId,
  isLoading,
  isUpdating,
  errorMessage,
  response,
  onCompanySelect,
}: AnalyticsDashboardPageProps) {
  const viewModel = response ? adaptAnalyticsDashboard(response) : null;

  return (
    <AnalyticsDashboardPageShell>
      {viewModel ? (
        <AnalyticsDashboardHeader
          companies={viewModel.meta.availableCompanies}
          isUpdating={isUpdating}
          onCompanySelect={onCompanySelect}
          selectedCompany={viewModel.meta.selectedCompany}
        />
      ) : null}

      <AnalyticsDashboardBody>
        {!hasCompetencyId ? (
          <AnalyticsEmptyState
            description="Bu sayfa `/analytics?competencyId=<uuid>` formatıyla çalışır."
            title="competencyId gerekli"
          />
        ) : isLoading ? (
          <AnalyticsLoadingState />
        ) : errorMessage ? (
          <AnalyticsErrorState message={errorMessage} />
        ) : viewModel ? (
          <>
            <KpiSection items={viewModel.kpis} />
            <OverallTrendSection
              availableGranularities={viewModel.filters.availableGranularities}
              behaviorTotals={viewModel.behaviorTotals}
              overallTrend={viewModel.overallTrend}
            />
            <CompanyComparisonSection items={viewModel.companyComparison} />
            <PeopleAndSummarySection
              behaviorSummary={viewModel.behaviorSummary}
              topSenders={viewModel.topSenders}
            />
            <BehaviorTrendGridSection
              availableGranularities={viewModel.filters.availableGranularities}
              items={viewModel.behaviorTrends}
            />
          </>
        ) : (
          <AnalyticsEmptyState
            description="Dashboard verisi boş döndü."
            title="Dashboard verisi bulunamadı"
          />
        )}
      </AnalyticsDashboardBody>
    </AnalyticsDashboardPageShell>
  );
}
