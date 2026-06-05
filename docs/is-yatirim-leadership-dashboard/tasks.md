# Is Yatirim Leadership Dashboard Tasks

- [ ] 1. Wire confirmed route and endpoint naming
  - Decide final frontend route, recommended `/is-yatirim/leadership-dashboard`.
  - Use confirmed backend endpoint `/analytics/dashboard?client=is-yatirim&competencyId=<uuid>&segment=<segmentId>`.
  - Use current Is Yatirim competency ID `9bb629ad-afd3-4cae-9744-a3faf5729174`.
  - Document required environment variables for backend base URL.
  - _Requirements: 1.1, 8.1, 9.2_

- [ ] 2. Add typed dashboard domain models
  - Create TypeScript types for dashboard response, mood categories, GMY comparisons, engagement metrics, and word items.
  - Export constants for mood labels, emojis, and color tokens.
  - Add type-safe helpers for percentages and Turkish date labels.
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 8.2, 8.3_

- [ ] 3. Implement backend proxy route
  - Add a Next.js route handler that validates `surveyId` and `segment`.
  - Forward requests to the configured backend URL.
  - Normalize backend errors into the dashboard error contract.
  - Use no-store or documented revalidation.
  - _Requirements: 1.4, 8.1, 9.2, 9.3, 9.4_

- [ ] 4. Build dashboard data client
  - Add a fetcher for the dashboard proxy route.
  - Integrate React Query with stable query keys.
  - Preserve previous data only when changing segment does not create misleading states.
  - Add error parsing and empty-state handling.
  - _Requirements: 1.4, 3.2, 5.2, 9.4_

- [ ] 5. Convert prototype shell to React components
  - Build page shell, sticky header, brand area, live badge, page badge, title, and subtitle.
  - Recreate UP Pulse sand background and card system.
  - Replace imperative DOM updates with prop-driven components.
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 6. Implement segment tabs
  - Render `Tüm Şirket` and all backend-provided GMY segments.
  - Sync selected segment with URL query parameter.
  - Keep all GMY comparison sections visible regardless of selected tab.
  - _Requirements: 1.3, 5.1, 5.2, 5.3_

- [ ] 7. Implement KPI grid
  - Render participation, average mood score, work-linked low mood, and most frequent word.
  - Use backend counts and percentages.
  - Handle null most frequent word.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8. Implement mood distribution card
  - Render four mood bars with emojis, labels, percentages, and respondent counts.
  - Render average score and good-plus-great summary.
  - Add zero-data handling.
  - _Requirements: 4.1, 4.2, 4.3, 6.4_

- [ ] 9. Implement trend chart and metric toggles
  - Render chart for participation, average mood, bad, meh, good, and great metrics.
  - Use backend `selectedSegment.trend`.
  - Support all returned dates, not only prototype dates.
  - _Requirements: 4.3, 4.4, 8.5_

- [ ] 10. Implement date comparison table
  - Render latest four survey date rows from `comparisons.dateComparison`.
  - Include participation, average score, and mood distribution columns.
  - Ensure dates update dynamically as backend adds new survey days.
  - _Requirements: 4.5, 8.5_

- [ ] 11. Implement GMY ranking section
  - Render all GMY ranking items sorted by backend rank or score.
  - Show average mood score, respondent count, and participation rate.
  - Preserve prototype bar styling.
  - _Requirements: 5.3, 5.4_

- [ ] 12. Implement GMY score change section
  - Render previous-vs-current score comparison for all GMY segments.
  - Show delta with positive, neutral, and negative states.
  - Use backend-provided current and previous survey dates.
  - _Requirements: 5.5, 8.5_

- [ ] 13. Implement GMY extreme chart
  - Render bidirectional bad percentage and great percentage bars.
  - Keep center axis stable across all GMY rows.
  - Show zero values without layout shift.
  - _Requirements: 5.6_

- [ ] 14. Implement engagement-by-mood cards
  - Render four cards for bad, meh, good, and great mood groups.
  - Show yes, partial, no percentages and work-linked rate.
  - Handle zero respondents safely.
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 15. Implement word cloud sections
  - Render category-specific word clouds for each mood.
  - Render all-words card for selected segment.
  - Preserve pill styling and count display.
  - Add empty word states.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 16. Add responsive QA and visual polish
  - Verify desktop, tablet, and mobile layouts.
  - Ensure long GMY names and long word pills do not overlap.
  - Confirm card radii, shadows, colors, and typography match the prototype.
  - _Requirements: 2.1, 2.4_

- [ ] 17. Add adapter and route tests
  - Test backend response normalization.
  - Test empty arrays and zero numeric fallback behavior.
  - Test segment query behavior and selected segment mapping.
  - Test latest-four date comparison selection if frontend derives it.
  - _Requirements: 5.2, 8.2, 8.3, 8.4, 9.5_

- [ ] 18. Deploy and validate live data
  - Configure production backend URL.
  - Deploy dashboard to accessible URL.
  - Validate that displayed values match backend response.
  - Confirm no prototype static data remains in production code.
  - _Requirements: 1.1, 8.6, 9.1_
