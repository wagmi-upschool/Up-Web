"use client";

import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsLoadingState,
  AnalyticsSectionHeading,
} from "@/components/analytics-dashboard/dashboard-shell";
import type {
  IsYatirimDateFilter,
  LeadershipDashboardResponse,
} from "@/lib/isYatirimLeadershipDashboard";
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
  dateFilter: IsYatirimDateFilter;
  response?: LeadershipDashboardResponse;
  selectedSegment: string;
  isLoading: boolean;
  isUpdating: boolean;
  isDateTimePickerEnabled: boolean;
  errorMessage?: string | null;
  onDateFilterChange: (dateFilter: IsYatirimDateFilter) => void;
  onSegmentSelect: (segment: string) => void;
};

export default function IsYatirimLeadershipDashboard({
  dateFilter,
  response,
  selectedSegment,
  isLoading,
  isUpdating,
  isDateTimePickerEnabled,
  errorMessage,
  onDateFilterChange,
  onSegmentSelect,
}: IsYatirimLeadershipDashboardProps) {
  return (
    <IsYatirimPageShell>
      <IsYatirimHeader
        dateFilter={dateFilter}
        isDateTimePickerEnabled={isDateTimePickerEnabled}
        isUpdating={isUpdating}
        onDateFilterChange={onDateFilterChange}
        response={response}
      />

      {response?.meta.segments.length ? (
        <SegmentTabs
          onSegmentSelect={onSegmentSelect}
          segments={response.meta.segments}
          selectedSegment={response.meta.selectedSegmentId || selectedSegment}
        />
      ) : null}

      {isLoading || isUpdating ? (
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
            dateFilter={response.meta.dateFilter}
            items={response.comparisons.gmyRanking}
          />
          <GmyExtremeSection
            dateFilter={response.meta.dateFilter}
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
