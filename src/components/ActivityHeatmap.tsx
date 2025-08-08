import React, { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

// This component is used by Dashboard to render hourly activity heatmap-like data.
// Align props with Dashboard usage: it passes `data` which is an array of { hour, activity, label }.
export interface ActivityHeatmapPoint {
  hour: number;
  activity: number;
  label: string;
}

export interface ActivityHeatmapProps {
  data: ActivityHeatmapPoint[];
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
  return eachDayOfInterval({ start: startWeek, end: endWeek }).map(date => format(date, 'EEE'));
};

function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = useMemo(() => (data.length ? Math.max(...data.map(d => d.activity)) : 1), [data]);
  const hasActivityToShow = useMemo(() => data.some(d => d.activity > 0), [data]);
  const weekDays = getWeekDays();

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700 min-h-[200px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
        {hasActivityToShow && (
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-sm bg-slate-700" />
              <div className="w-3 h-3 rounded-sm bg-green-900" />
              <div className="w-3 h-3 rounded-sm bg-green-700" />
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <div className="w-3 h-3 rounded-sm bg-green-400" />
            </div>
            <span>More</span>
          </div>
        )}
      </div>

      {!hasActivityToShow ? (
        <div className="flex flex-col items-center justify-center h-full py-10 text-center">
          <p className="text-slate-400 mt-2">No activity data available for this period.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-8" />
              <div className="grid grid-cols-7 gap-1 flex-1">
                {weekDays.map(day => (
                  <div key={day} className="text-xs text-slate-400 text-center">
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center">
              <div className="w-8 text-xs text-slate-400">UTC</div>
              <div className="grid grid-cols-24 gap-1 flex-1">
                {data.map((point) => (
                  <div
                    key={point.hour}
                    className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-white hover:ring-opacity-50 ${getIntensityColor(
                      point.activity,
                      maxCount
                    )}`}
                    title={`${point.label}: ${point.activity}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            <p>{data.filter(d => d.activity > 0).length} active hours in the selected period.</p>
          </div>
        </>
      )}
    </div>
  );
}

ActivityHeatmap.displayName = 'ActivityHeatmap';

export default ActivityHeatmap;