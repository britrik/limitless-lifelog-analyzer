import React, { useMemo } from 'react';
import { Transcript } from '../types';
import { generateHourlyActivityData } from '../utils/dashboardAnalytics';

interface HourlyActivityProps {
  transcripts: Transcript[];
  timeRange: '7d' | '30d' | '90d' | 'all';
}

export const HourlyActivity: React.FC<HourlyActivityProps> = ({
  transcripts,
  timeRange,
}) => {
  const hourlyData = useMemo(() => {
    return generateHourlyActivityData(transcripts, timeRange);
  }, [transcripts, timeRange]);

  const maxActivity = Math.max(...hourlyData.map(d => d.activity), 1);

  const getIntensityColor = (activity: number) => {
    const intensity = activity / maxActivity;
    if (intensity === 0) return 'bg-slate-800';
    if (intensity < 0.25) return 'bg-blue-900/40';
    if (intensity < 0.5) return 'bg-blue-700/60';
    if (intensity < 0.75) return 'bg-blue-500/80';
    return 'bg-blue-400';
  };

  const getTimeLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xl font-semibold text-slate-100">
          Activity by Hour
        </h3>
        <span className="text-slate-400 text-sm">
          {timeRange === '7d' ? 'Last 7 days' : 
           timeRange === '30d' ? 'Last 30 days' : 
           timeRange === '90d' ? 'Last 90 days' : 'All time'}
        </span>
      </div>

      <div className="space-y-4">
        {/* Hour labels and activity bars */}
        <div className="grid grid-cols-12 gap-1">
          {hourlyData.map((data, index) => (
            <div key={data.hour} className="text-center">
              {index % 3 === 0 && (
                <div className="text-xs text-slate-400 mb-2">
                  {getTimeLabel(data.hour)}
                </div>
              )}
              <div
                className={`h-8 rounded ${getIntensityColor(data.activity)} border border-slate-600 transition-all duration-200 hover:scale-110 cursor-pointer`}
                title={`${getTimeLabel(data.hour)}: ${data.activity} avg words`}
              />
              {index % 3 === 0 && (
                <div className="text-xs text-slate-500 mt-1">
                  {data.hour.toString().padStart(2, '0')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-4">
          <span>Less active</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-slate-800 border border-slate-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-900/40 border border-slate-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-700/60 border border-slate-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-500/80 border border-slate-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-400 border border-slate-600 rounded"></div>
          </div>
          <span>More active</span>
        </div>

        {/* Peak hours summary */}
        {hourlyData.length > 0 && (
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
            <div className="text-sm text-slate-300">
              <strong>Peak Activity:</strong> {
                (() => {
                  const peakHour = hourlyData.reduce((max, current) => 
                    current.activity > max.activity ? current : max
                  );
                  return `${getTimeLabel(peakHour.hour)} (${peakHour.activity} avg words)`;
                })()
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};