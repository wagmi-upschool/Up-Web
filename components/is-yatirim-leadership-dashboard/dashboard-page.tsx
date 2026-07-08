"use client";

import { Fragment } from "react";
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsLoadingState,
  AnalyticsSectionHeading,
} from "@/components/analytics-dashboard/dashboard-shell";
import type {
  IsYatirimComparisonBreakdown,
  IsYatirimDateFilter,
  LeadershipDashboardResponse,
} from "@/lib/isYatirimLeadershipDashboard";
import {
  DEFAULT_IS_YATIRIM_SEGMENT,
  getIsYatirimComparisonItems,
  hasIsYatirimUnvanComparisons,
  normalizeIsYatirimSegment,
  resolveIsYatirimComparisonBreakdown,
} from "@/lib/isYatirimLeadershipDashboard";
import {
  DashboardEmptyContent,
  ComparisonBreakdownTabs,
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
  dailyToken: string;
  weeklyToken: string;
  isWeeklyToggleEnabled: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  isBreakdownUpdating: boolean;
  isDateTimePickerEnabled: boolean;
  isUnvanComparisonEnabled: boolean;
  errorMessage?: string | null;
  onDateFilterChange: (dateFilter: IsYatirimDateFilter) => void;
  onSegmentSelect: (segment: string) => void;
  onUnvanSelect: (unvan: string) => void;
  selectedUnvan: string;
};

export default function IsYatirimLeadershipDashboard({
  dateFilter,
  response,
  selectedSegment,
  dailyToken,
  weeklyToken,
  isWeeklyToggleEnabled,
  isLoading,
  isUpdating,
  isBreakdownUpdating,
  isDateTimePickerEnabled,
  isUnvanComparisonEnabled,
  errorMessage,
  onDateFilterChange,
  onSegmentSelect,
  onUnvanSelect,
  selectedUnvan,
}: IsYatirimLeadershipDashboardProps) {
  const hasUnvanComparisons = hasIsYatirimUnvanComparisons(
    response?.comparisons,
  );
  const canShowUnvanBreakdown = isUnvanComparisonEnabled && hasUnvanComparisons;
  const selectedSegmentId = selectedSegment || response?.meta.selectedSegmentId;
  const isAllSegmentSelected =
    normalizeIsYatirimSegment(selectedSegmentId) === DEFAULT_IS_YATIRIM_SEGMENT;
  const detailBreakdown =
    isUnvanComparisonEnabled && selectedUnvan && response?.selectedUnvan
      ? "unvan"
      : resolveIsYatirimComparisonBreakdown({
          comparisons: response?.comparisons,
          isUnvanComparisonEnabled,
          selectedUnvan,
      });
  const comparisonBreakdowns: IsYatirimComparisonBreakdown[] =
    canShowUnvanBreakdown && isAllSegmentSelected && !selectedUnvan
      ? ["gmy", "unvan"]
      : [detailBreakdown];
  const displayResponse =
    detailBreakdown === "unvan" && response?.selectedUnvan
      ? {
          ...response,
          selectedSegment: response.selectedUnvan,
        }
      : response;

  return (
    <IsYatirimPageShell>
      <IsYatirimHeader
        dateFilter={dateFilter}
        isDateTimePickerEnabled={isDateTimePickerEnabled}
        isUpdating={isUpdating}
        onDateFilterChange={onDateFilterChange}
        response={response}
        selectedSegment={selectedSegment}
        selectedUnvan={selectedUnvan}
        dailyToken={dailyToken}
        isUnvanComparisonEnabled={isUnvanComparisonEnabled}
        isWeeklyToggleEnabled={isWeeklyToggleEnabled}
        weeklyToken={weeklyToken}
      />

      {response?.meta.segments.length && canShowUnvanBreakdown ? (
        <ComparisonBreakdownTabs
          onSegmentSelect={onSegmentSelect}
          onUnvanSelect={onUnvanSelect}
          response={response}
          selectedSegment={selectedUnvan ? "" : selectedSegment}
          selectedUnvan={selectedUnvan}
        />
      ) : response?.meta.segments.length ? (
        <SegmentTabs
          onSegmentSelect={onSegmentSelect}
          segments={response.meta.segments}
          selectedSegment={response.meta.selectedSegmentId || selectedSegment}
        />
      ) : null}

      {isLoading || isUpdating || isBreakdownUpdating ? (
        <AnalyticsLoadingState />
      ) : errorMessage ? (
        <AnalyticsErrorState message={errorMessage} />
      ) : response && displayResponse ? (
        <>
          <KpiGrid response={displayResponse} />

          <AnalyticsSectionHeading>DUYGU DURUMU</AnalyticsSectionHeading>
          <MoodDistributionCard response={displayResponse} />
          <MoodTrendCard response={displayResponse} />

          {comparisonBreakdowns.map((breakdown) => {
            const comparisonLabel = breakdown === "unvan" ? "Unvan" : "GMY";
            const { rankingItems, extremeItems } = getIsYatirimComparisonItems(
              response.comparisons,
              breakdown,
            );

            return (
              <Fragment key={breakdown}>
                <AnalyticsSectionHeading>
                  {`${comparisonLabel.toLocaleUpperCase("tr-TR")} KARŞILAŞTIRMASI`}
                </AnalyticsSectionHeading>
                <GmyRankingSection
                  comparisonLabel={comparisonLabel}
                  dateFilter={response.meta.dateFilter}
                  items={rankingItems}
                />
                <GmyExtremeSection
                  comparisonLabel={comparisonLabel}
                  dateFilter={response.meta.dateFilter}
                  items={extremeItems}
                />
              </Fragment>
            );
          })}

          <AnalyticsSectionHeading>İŞ BAĞLANTISI</AnalyticsSectionHeading>
          <EngagementByMoodGrid response={displayResponse} />

          <AnalyticsSectionHeading>KELİME BULUTLARI</AnalyticsSectionHeading>
          <WordCloudSections response={displayResponse} />
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
