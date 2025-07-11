import React from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChartDataPoint, ChartDataResponse } from '../../types'; // Import new types

// ChartDataPoint is now imported from types.ts

interface AnalyticsChartProps {
  chartResponse: ChartDataResponse; // Changed from 'data' to 'chartResponse'
  type: 'line' | 'bar' | 'area';
  title: string;
  subtitle?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  type,
  title,
  subtitle,
  color = '#8b5cf6',
  height = 300,
  showGrid = true,
  showTooltip = true,
  selectedGroupBy,
  onGroupByChange,
  timeRange
}: AnalyticsChartProps & {
  selectedGroupBy?: 'day' | 'week' | 'month';
  onGroupByChange?: (groupBy: 'day' | 'week' | 'month') => void;
  timeRange?: '7d' | '30d' | '90d' | 'all';
}) => {
  const { data, status, message } = chartResponse; // Destructure chartResponse

  const chartKey = React.useMemo(() => `${type}-${title}-${data.map(d => d.date + d.value).join('-')}-${selectedGroupBy}-${status}`, [type, title, data, selectedGroupBy, status]);

  const renderChart = React.useMemo(() => {
    // console.log(`AnalyticsChart: Memoizing chart render for: ${title}, GroupBy: ${selectedGroupBy}, Status: ${status}`); // For debugging

    if (status === 'loading') { // Added a loading state check
      return (
        <div className="flex items-center justify-center h-full text-slate-400">
          Loading chart data...
        </div>
      );
    }

    if (status === 'no-data' || status === 'error') {
      return (
        <div className="flex items-center justify-center h-full text-slate-400 px-4 text-center">
          {message || (status === 'no-data' ? 'No data available.' : 'An error occurred.')}
        </div>
      );
    }

    // Only proceed to render chart if status is 'success'
    if (status !== 'success' || data.length === 0) {
       // Fallback for safety, though 'no-data' status should catch empty data.
      return (
        <div className="flex items-center justify-center h-full text-slate-400 px-4 text-center">
           No data to display.
        </div>
      );
    }

    const commonProps = {
      data, // Use the destructured data
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const axisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 12, fill: '#94a3b8' }
    };

    const gridProps = showGrid ? {
      strokeDasharray: '3 3',
      stroke: '#334155',
      opacity: 0.5
    } : undefined;

    const tooltipProps = showTooltip ? {
      contentStyle: {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        color: '#f1f5f9'
      },
      labelStyle: { color: '#94a3b8' }
    } : undefined;

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Unsupported chart type
          </div>
        );
    }
  }, [data, type, color, showGrid, showTooltip, height, status, message]); // Updated dependencies for useMemo

  // Determine if groupBy dropdown should be shown
  // It should be shown if onGroupByChange is provided, and not for "all" time if that's a specific business rule.
  // For now, just checking if onGroupByChange exists.
  const showGroupBySelector = !!onGroupByChange && !!selectedGroupBy;


  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {showGroupBySelector && (
          <div>
            <select
              value={selectedGroupBy}
              onChange={(e) => onGroupByChange?.(e.target.value as 'day' | 'week' | 'month')}
              className="bg-slate-700 text-slate-200 text-sm rounded-md p-2 border border-slate-600 focus:ring-purple-500 focus:border-purple-500"
              aria-label="Select chart grouping period"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        )}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer key={chartKey} width="100%" height="100%">
          {renderChart}
        </ResponsiveContainer>
      </div>
    </div>
  );
};