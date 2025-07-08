# Dashboard Period Comparison Logic

## What "Since Last Period" Means

The dashboard's **"since last period"** comparison shows how your current metrics compare to the equivalent previous time period. Here's exactly what gets compared:

### Time Range Comparisons

#### 7 Days Selected
- **Current Period**: Last 7 days (today back to 7 days ago)
- **Previous Period**: Days 8-14 ago (the 7 days immediately before the current period)
- **Example**: If today is March 15th:
  - Current: March 9-15 (last 7 days)
  - Previous: March 2-8 (previous 7 days)

#### 30 Days Selected
- **Current Period**: Last 30 days (today back to 30 days ago)
- **Previous Period**: Days 31-60 ago (the 30 days immediately before the current period)
- **Example**: If today is March 15th:
  - Current: February 14 - March 15 (last 30 days)
  - Previous: January 15 - February 13 (previous 30 days)

#### 90 Days Selected
- **Current Period**: Last 90 days (today back to 90 days ago)
- **Previous Period**: Days 91-180 ago (the 90 days immediately before the current period)
- **Example**: If today is March 15th:
  - Current: December 15 - March 15 (last 90 days)
  - Previous: September 16 - December 14 (previous 90 days)

#### All Time Selected
- **Current Period**: All available data
- **Previous Period**: No comparison available
- **Display**: Shows total metrics without percentage changes

## What Gets Compared

### 1. Total Recordings
- **Current**: Number of transcripts in the current period
- **Previous**: Number of transcripts in the previous period
- **Growth**: `((current - previous) / previous) × 100`

### 2. Hours Recorded
- **Current**: Estimated total duration of transcripts in current period
- **Previous**: Estimated total duration of transcripts in previous period
- **Calculation**: Based on content length (~150 words/minute, ~5 chars/word)
- **Growth**: `((current_hours - previous_hours) / previous_hours) × 100`

### 3. AI Analyses
- **Current**: Number of transcripts with completed analysis in current period
- **Previous**: Number of transcripts with completed analysis in previous period
- **Criteria**: Transcript has a summary with >50 characters
- **Growth**: `((current_analyses - previous_analyses) / previous_analyses) × 100`

### 4. Bookmarks
- **Current**: Number of starred/bookmarked transcripts in current period
- **Previous**: Number of starred/bookmarked transcripts in previous period
- **Growth**: `((current_bookmarks - previous_bookmarks) / previous_bookmarks) × 100`

## Visual Indicators

### Growth Percentages
- **Positive (+)**: Green color, upward arrow
- **Negative (-)**: Red color, downward arrow
- **Stable (±5%)**: Gray color, horizontal line

### Trend Analysis Cards
Each metric shows:
- **Current Period Value**: Large number (e.g., "42 recordings")
- **Previous Period Value**: Smaller number for reference
- **Change Amount**: Absolute difference (e.g., "+5 recordings")
- **Change Percentage**: Relative change (e.g., "+13.5%")
- **Period Label**: Clear description (e.g., "vs. previous 30 days")

## Examples

### Scenario 1: 30-Day View
```
Current Period (Feb 15 - Mar 15): 25 recordings
Previous Period (Jan 16 - Feb 14): 20 recordings
Change: +5 recordings (+25%)
Display: "25 recordings, +25% vs. previous 30 days"
```

### Scenario 2: 7-Day View
```
Current Period (Mar 9 - Mar 15): 8 recordings
Previous Period (Mar 2 - Mar 8): 12 recordings
Change: -4 recordings (-33.3%)
Display: "8 recordings, -33.3% vs. previous 7 days"
```

### Scenario 3: All Time View
```
Current Period: All 150 recordings
Previous Period: N/A
Change: N/A
Display: "150 recordings, no comparison available for all-time view"
```

## Special Cases

### No Previous Data
If there's no data in the previous period:
- **Growth**: Shows +100% if current period has data, 0% if both periods are empty
- **Display**: Indicates this is new activity

### Equal Periods
If current and previous periods have identical values:
- **Growth**: 0%
- **Trend**: Stable (horizontal line)

### First Time Users
For users with limited data:
- **7-day view**: May show incomplete comparisons
- **30/90-day views**: May not have enough historical data
- **Recommendation**: Use "All Time" view initially

## Implementation Details

The comparison logic is implemented in:
- **Dashboard Metrics**: `src/utils/dashboardAnalytics.ts`
- **Trend Analysis**: `src/components/TrendAnalysis.tsx`
- **Visual Display**: Individual metric cards and trend analysis components

Both components now use the same logic and respect the user's selected time range for consistent comparisons across the entire dashboard.