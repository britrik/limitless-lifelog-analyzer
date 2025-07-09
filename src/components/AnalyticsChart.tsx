import React from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  date: string; // Using string as current data prep provides formatted date/time strings
  value: number;
  label: string; // Label is always provided by current data generation functions
}

interface AnalyticsChartProps {
  data: ChartDataPoint[];
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
  showTooltip = true
}) => {
  // Create a key based on data to force re-render when data changes
  const chartKey = `${type}-${data.length}-${data.map(d => d.value).join('-')}`;

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      key: chartKey,
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
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer key={chartKey} width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};