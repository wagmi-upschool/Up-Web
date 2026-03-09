import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDashboardSummaryQuery,
  groupHourlyRatings,
  parseDashboardReceiverFilters,
  parseDashboardReceiverIdsInput,
} from "../../lib/dashboardSummary";

test("parseDashboardReceiverFilters merges single and csv params without duplicates", () => {
  const params = new URLSearchParams(
    "feedbackReceiverId=7ecb39c2-7c34-4392-9e31-06ab21b206aa&feedbackReceiverIds=7ecb39c2-7c34-4392-9e31-06ab21b206aa,005939f4-849d-44c6-a5b5-319a348ed223",
  );

  const result = parseDashboardReceiverFilters(params);

  assert.deepEqual(result.receiverIds, [
    "7ecb39c2-7c34-4392-9e31-06ab21b206aa",
    "005939f4-849d-44c6-a5b5-319a348ed223",
  ]);
  assert.deepEqual(result.invalidReceiverIds, []);
});

test("parseDashboardReceiverIdsInput accepts commas and whitespace", () => {
  const result = parseDashboardReceiverIdsInput(
    "7ecb39c2-7c34-4392-9e31-06ab21b206aa,\n005939f4-849d-44c6-a5b5-319a348ed223  005939f4-849d-44c6-a5b5-319a348ed223",
  );

  assert.deepEqual(result, [
    "7ecb39c2-7c34-4392-9e31-06ab21b206aa",
    "005939f4-849d-44c6-a5b5-319a348ed223",
  ]);
});

test("buildDashboardSummaryQuery uses single param for one receiver and csv for many", () => {
  assert.equal(
    buildDashboardSummaryQuery(["7ecb39c2-7c34-4392-9e31-06ab21b206aa"]),
    "feedbackReceiverId=7ecb39c2-7c34-4392-9e31-06ab21b206aa",
  );
  assert.equal(
    buildDashboardSummaryQuery([
      "7ecb39c2-7c34-4392-9e31-06ab21b206aa",
      "005939f4-849d-44c6-a5b5-319a348ed223",
    ]),
    "feedbackReceiverIds=7ecb39c2-7c34-4392-9e31-06ab21b206aa%2C005939f4-849d-44c6-a5b5-319a348ed223",
  );
});

test("groupHourlyRatings aligns buckets into fixed hourly windows and uses weighted averages", () => {
  const result = groupHourlyRatings(
    [
      {
        hour: "2026-03-09T00:00",
        averageRating: 2,
        totalFeedbacks: 2,
      },
      {
        hour: "2026-03-09T01:00",
        averageRating: 4,
        totalFeedbacks: 1,
      },
      {
        hour: "2026-03-09T03:00",
        averageRating: 3,
        totalFeedbacks: 2,
      },
    ],
    2,
  );

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    label: "09 Mar · 00:00-02:00",
    startHour: "2026-03-09T00:00",
    endHour: "2026-03-09T02:00",
    averageRating: 2.67,
    totalFeedbacks: 3,
  });
  assert.deepEqual(result[1], {
    label: "09 Mar · 02:00-04:00",
    startHour: "2026-03-09T02:00",
    endHour: "2026-03-09T04:00",
    averageRating: 3,
    totalFeedbacks: 2,
  });
});
