import React, { useMemo } from 'react';
import { parseISO, subDays, format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Transcript } from '../types';

interface ActivityHeatmapProps {
  transcripts: Transcript[];
  timeRange: '7d' | '30d' | '90d' | 'all';
}

interface DayActivity {
  date: string;
  count: number;
  transcripts: Transcript[];
}

const getIntensityColor = (count: number, maxCount: number): string => {
  if (count === 0) return 'bg-slate-700';
  
  const intensity = count / maxCount;
  if (intensity <= 0.25) return 'bg-green-900';
  if (intensity <= 0.5) return 'bg-green-700';
  if (intensity <= 0.75) return 'bg-green-500';
  return 'bg-green-400';
};

const getWeekDays = (): string[] => {
  const today = new Date();
  const startWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const endWeek = endOfWeek(today, { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start: startWeek, end: endWeek }).map(date => 
    format(date, 'EEE')
  );
};

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  transcripts,
  timeRange,
}) => {
  const heatmapData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    // Determine date range based on timeRange
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'all':
        startDate = new Date(0); // from epoch start
        break;
      default:
        startDate = subDays(now, 90); // Default to 90 days for heatmap
    }
    
    // Generate all days in the range
    const days = eachDayOfInterval({ start: startDate, end: now });
    
    // Group transcripts by date
    const activityByDate: Record<string, DayActivity> = {};
    
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      activityByDate[dateKey] = {
        date: dateKey,
        count: 0,
        transcripts: [],
      };
    });
    
    // Count transcripts per day
    transcripts.forEach(transcript => {
      try {
        const transcriptDate = parseISO(transcript.date);
        const dateKey = format(transcriptDate, 'yyyy-MM-dd');
        
        if (activityByDate[dateKey]) {
          activityByDate[dateKey].count++;
          activityByDate[dateKey].transcripts.push(transcript);
        }
      } catch (error) {
        console.warn('Invalid date format in transcript:', transcript.date);
      }
    });
    
    const activities = Object.values(activityByDate);
    const maxCount = Math.max(...activities.map(a => a.count), 1);
    
    return { activities, maxCount };
  }, [transcripts, timeRange]);

  const weekDays = getWeekDays();

  // Group activities by weeks for display
  const weeks = useMemo(() => {
    const weekGroups: DayActivity[][] = [];
    let currentWeek: DayActivity[] = [];
    
    heatmapData.activities.forEach((activity, index) => {
      const date = parseISO(activity.date);
      const dayOfWeek = format(date, 'i'); // 1 = Monday, 7 = Sunday
      
      // If it's Monday or first day, start a new week
      if (dayOfWeek === '1' || index === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push([...currentWeek]);
        }
        currentWeek = [];
      }
      
      currentWeek.push(activity);
      
      // If it's the last day, push the current week
      if (index === heatmapData.activities.length - 1) {
        weekGroups.push(currentWeek);
      }
    });
    
    return weekGroups;
  }, [heatmapData.activities]);

  // Check if there's any actual activity to display.
  const hasActivityToShow = useMemo(() => {
    if (transcripts.length === 0) return false;
    return heatmapData.activities.some(activity => activity.count > 0);
  }, [heatmapData.activities, transcripts.length]);

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700 min-h-[200px]"> {/* Added min-height */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
        {hasActivityToShow && (
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-sm bg-slate-700"></div>
              <div className="w-3 h-3 rounded-sm bg-green-900"></div>
              <div className="w-3 h-3 rounded-sm bg-green-700"></div>
              <div className="w-3 h-3 rounded-sm bg-green-500"></div>
              <div className="w-3 h-3 rounded-sm bg-green-400"></div>
            </div>
            <span>More</span>
          </div>
        )}
      </div>
      
      {!hasActivityToShow ? (
        <div className="flex flex-col items-center justify-center h-full py-10 text-center"> {/* Ensure text-center for icon + text */}
          {/* Optional: MUI Icon can be added here if desired, e.g. <InfoOutlinedIcon sx={{ fontSize: 40, color: 'rgb(148, 163, 184)' }} /> */}
          <p className="text-slate-400 mt-2">No activity data available for this period.</p> {/* Added mt-2 if icon is present */}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {/* Week day labels */}
            <div className="flex items-center">
              <div className="w-8"></div> {/* Spacer for alignment */}
              <div className="grid grid-cols-7 gap-1 flex-1">
                {weekDays.map(day => (
                  <div key={day} className="text-xs text-slate-400 text-center">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex items-center">
                  <div className="w-8 text-xs text-slate-400">
                    {/* Ensure week[0] and week[0].date exist before formatting */}
                    {(weekIndex === 0 || weekIndex === weeks.length - 1) && week[0]?.date
                      ? format(parseISO(week[0].date), 'MMM')
                      : ''
                    }
                  </div>
                  <div className="grid grid-cols-7 gap-1 flex-1">
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const activity = week[dayIndex];
                      if (!activity) {
                        return <div key={dayIndex} className="w-3 h-3"></div>;
                      }

                      return (
                        <div
                          key={activity.date}
                          className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-white hover:ring-opacity-50 ${getIntensityColor(
                            activity.count,
                            heatmapData.maxCount
                          )}`}
                          title={`${format(parseISO(activity.date), 'MMM d, yyyy')}: ${activity.count} recording${activity.count !== 1 ? 's' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            <p>
              {heatmapData.activities.filter(a => a.count > 0).length} active days in the last{' '}
              {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'selected period'}.
            </p>
          </div>
        </>
      )}
    </div>
  );
};