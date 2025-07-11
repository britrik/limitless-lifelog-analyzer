import React, { useMemo } from 'react';
import { parseISO, subDays, isWithinInterval } from 'date-fns';
import { Transcript } from '../types';

interface TrendAnalysisProps {
  transcripts: Transcript[];
  metric: 'count' | 'duration' | 'analysis';
  timeRange: '7d' | '30d' | '90d' | 'all';
}

interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  periodLabel: string;
}

const calculateDuration = (transcript: Transcript): number => {
  // Since we don't have duration in the transcript, we'll estimate based on content length
  // This is a rough approximation: ~150 words per minute, ~5 characters per word
  const wordCount = transcript.content.length / 5;
  return Math.max(wordCount / 150, 0.1); // Minimum 0.1 hours (6 minutes)
};

const hasAnalysis = (transcript: Transcript): boolean => {
  // Check if transcript has been analyzed (has summary or other analysis indicators)
  return Boolean(transcript.summary && transcript.summary.length > 50);
};

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  transcripts,
  metric,
  timeRange,
}) => {
  const trendData = useMemo((): TrendData => {
    // Handle "all time" case - no comparison available
    if (timeRange === 'all') {
      let current: number;
      switch (metric) {
        case 'count':
          current = transcripts.length;
          break;
        case 'duration':
          current = transcripts.reduce((sum, t) => sum + calculateDuration(t), 0);
          break;
        case 'analysis':
          current = transcripts.filter(hasAnalysis).length;
          break;
        default:
          current = 0;
      }
      
      return {
        current,
        previous: 0,
        change: 0,
        changePercent: 0,
        trend: 'stable',
        periodLabel: 'all time'
      };
    }

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const currentPeriodStart = subDays(now, days);
    const previousPeriodStart = subDays(now, days * 2);
    const previousPeriodEnd = subDays(now, days);
    
    // Split transcripts into current period and previous period
    const currentPeriodTranscripts = transcripts.filter(transcript => {
      try {
        const date = parseISO(transcript.date);
        return isWithinInterval(date, { start: currentPeriodStart, end: now });
      } catch {
        return false;
      }
    });
    
    const previousPeriodTranscripts = transcripts.filter(transcript => {
      try {
        const date = parseISO(transcript.date);
        return isWithinInterval(date, { start: previousPeriodStart, end: previousPeriodEnd });
      } catch {
        return false;
      }
    });
    
    let current: number;
    let previous: number;
    
    switch (metric) {
      case 'count':
        current = currentPeriodTranscripts.length;
        previous = previousPeriodTranscripts.length;
        break;
        
      case 'duration':
        current = currentPeriodTranscripts.reduce((sum, t) => sum + calculateDuration(t), 0);
        previous = previousPeriodTranscripts.reduce((sum, t) => sum + calculateDuration(t), 0);
        break;
        
      case 'analysis':
        current = currentPeriodTranscripts.filter(hasAnalysis).length;
        previous = previousPeriodTranscripts.filter(hasAnalysis).length;
        break;
        
      default:
        current = 0;
        previous = 0;
    }
    
    const change = current - previous;
    const changePercent = previous === 0 ? (current > 0 ? 100 : 0) : (change / previous) * 100;
    
    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    // Create period label for display
    const periodLabel = timeRange === '7d' ? 'vs. previous 7 days' : 
                       timeRange === '30d' ? 'vs. previous 30 days' : 
                       'vs. previous 90 days';
    
    return {
      current,
      previous,
      change,
      changePercent,
      trend,
      periodLabel,
    };
  }, [transcripts, metric, timeRange]);

  const formatValue = (value: number): string => {
    switch (metric) {
      case 'count':
        return value.toString();
      case 'duration':
        return `${value.toFixed(1)}h`;
      case 'analysis':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getMetricLabel = (): string => {
    switch (metric) {
      case 'count':
        return 'Recordings';
      case 'duration':
        return 'Hours Recorded';
      case 'analysis':
        return 'AI Analyses';
      default:
        return 'Metric';
    }
  };

  const getTrendIcon = () => {
    switch (trendData.trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
    }
  };

  const getTrendColor = () => {
    switch (trendData.trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      case 'stable':
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">{getMetricLabel()}</h3>
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
              {isNaN(trendData.changePercent) ? 'N/A' : `${trendData.changePercent > 0 ? '+' : ''}${trendData.changePercent.toFixed(1)}%`}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Current Period</span>
          <span className="text-2xl font-bold text-slate-100">
            {formatValue(trendData.current)}
          </span>
        </div>
        
        {timeRange !== 'all' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Previous Period</span>
              <span className="text-lg text-slate-300">
                {formatValue(trendData.previous)}
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400 text-sm">{trendData.periodLabel}</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {trendData.change > 0 ? '+' : ''}{formatValue(Math.abs(trendData.change))}
                </span>
              </div>
            </div>
          </>
        )}
        
        {timeRange === 'all' && (
          <div className="text-center py-2">
            <span className="text-slate-400 text-sm">No comparison available for all-time view</span>
          </div>
        )}
      </div>
    </div>
  );
};