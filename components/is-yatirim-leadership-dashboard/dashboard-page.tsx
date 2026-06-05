"use client";

import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsLoadingState,
  AnalyticsSectionHeading,
} from "@/components/analytics-dashboard/dashboard-shell";
import type { LeadershipDashboardResponse } from "@/lib/isYatirimLeadershipDashboard";
import {
  DashboardEmptyContent,
  EngagementByMoodGrid,
  GmyExtremeSection,
  GmyRankingSection,
  IsYatirimHeader,
  IsYatirimPageShell,
  KpiGrid,
  MoodDistributionCard,
  MoodTrendCard,
  SegmentTabs,
  WordCloudSections,
} from "./dashboard-sections";

type IsYatirimLeadershipDashboardProps = {
  response?: LeadershipDashboardResponse;
  selectedSegment: string;
  isLoading: boolean;
  isUpdating: boolean;
  errorMessage?: string | null;
  onSegmentSelect: (segment: string) => void;
};

export default function IsYatirimLeadershipDashboard({
  response,
  selectedSegment,
  isLoading,
  isUpdating,
  errorMessage,
  onSegmentSelect,
}: IsYatirimLeadershipDashboardProps) {
  return (
    <IsYatirimPageShell>
      <IsYatirimHeader isUpdating={isUpdating} response={response} />

      {response?.meta.segments.length ? (
        <SegmentTabs
          onSegmentSelect={onSegmentSelect}
          segments={response.meta.segments}
          selectedSegment={response.meta.selectedSegmentId || selectedSegment}
        />
      ) : null}

      {isLoading ? (
        <AnalyticsLoadingState />
      ) : errorMessage ? (
        <AnalyticsErrorState message={errorMessage} />
      ) : response ? (
        <>
          <KpiGrid response={response} />

          <AnalyticsSectionHeading>DUYGU DURUMU</AnalyticsSectionHeading>
          <MoodDistributionCard response={response} />
          <MoodTrendCard response={response} />

          <AnalyticsSectionHeading>GMY KARŞILAŞTIRMASI</AnalyticsSectionHeading>
          <GmyRankingSection
            dateLabel={response.meta.latestSurveyDateLabel}
            items={response.comparisons.gmyRanking}
          />
          <GmyExtremeSection
            dateLabel={response.meta.latestSurveyDateLabel}
            items={response.comparisons.gmyExtremes}
          />

          <AnalyticsSectionHeading>İŞ BAĞLANTISI</AnalyticsSectionHeading>
          <EngagementByMoodGrid response={response} />

          <AnalyticsSectionHeading>KELİME BULUTLARI</AnalyticsSectionHeading>
          <WordCloudSections response={response} />
        </>
      ) : (
        <>
          <AnalyticsEmptyState
            description="İş Yatırım dashboard'u canlı backend verisiyle çalışır."
            title="Dashboard verisi bekleniyor"
          />
          <DashboardEmptyContent />
        </>
      )}
    </IsYatirimPageShell>
  );
}
