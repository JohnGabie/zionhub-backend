import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import {
  AnalyticsPeriod,
  DeviceUsageResponse,
  RoutineExecutionsResponse,
  TimelineResponse,
  AnalyticsSummary
} from '@/lib/api/types';

interface UseAnalyticsOptions {
  period?: AnalyticsPeriod;
  date?: string; // For timeline, YYYY-MM-DD
  enabled?: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { period = '7d', date, enabled = true } = options;
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(period);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(date);

  // Fetch device usage data
  const deviceUsageQuery = useQuery({
    queryKey: ['analytics', 'device-usage', selectedPeriod],
    queryFn: async (): Promise<DeviceUsageResponse | null> => {
      const response = await apiClient.get<DeviceUsageResponse>(
        `${API_ENDPOINTS.ANALYTICS_DEVICE_USAGE}?period=${selectedPeriod}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch routine executions data
  const routineExecutionsQuery = useQuery({
    queryKey: ['analytics', 'routine-executions', selectedPeriod],
    queryFn: async (): Promise<RoutineExecutionsResponse | null> => {
      const response = await apiClient.get<RoutineExecutionsResponse>(
        `${API_ENDPOINTS.ANALYTICS_ROUTINE_EXECUTIONS}?period=${selectedPeriod}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch timeline data
  const timelineQuery = useQuery({
    queryKey: ['analytics', 'timeline', selectedDate],
    queryFn: async (): Promise<TimelineResponse | null> => {
      const dateParam = selectedDate ? `?date=${selectedDate}` : '';
      const response = await apiClient.get<TimelineResponse>(
        `${API_ENDPOINTS.ANALYTICS_TIMELINE}${dateParam}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch summary data
  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary', selectedPeriod],
    queryFn: async (): Promise<AnalyticsSummary | null> => {
      const response = await apiClient.get<AnalyticsSummary>(
        `${API_ENDPOINTS.ANALYTICS_SUMMARY}?period=${selectedPeriod}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    // Data
    deviceUsage: deviceUsageQuery.data,
    routineExecutions: routineExecutionsQuery.data,
    timeline: timelineQuery.data,
    summary: summaryQuery.data,

    // Loading states
    isLoadingDeviceUsage: deviceUsageQuery.isLoading,
    isLoadingRoutineExecutions: routineExecutionsQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    isLoadingSummary: summaryQuery.isLoading,
    isLoading:
      deviceUsageQuery.isLoading ||
      routineExecutionsQuery.isLoading ||
      timelineQuery.isLoading ||
      summaryQuery.isLoading,

    // Error states
    errorDeviceUsage: deviceUsageQuery.error,
    errorRoutineExecutions: routineExecutionsQuery.error,
    errorTimeline: timelineQuery.error,
    errorSummary: summaryQuery.error,

    // Refetch functions
    refetchDeviceUsage: deviceUsageQuery.refetch,
    refetchRoutineExecutions: routineExecutionsQuery.refetch,
    refetchTimeline: timelineQuery.refetch,
    refetchSummary: summaryQuery.refetch,
    refetchAll: () => {
      deviceUsageQuery.refetch();
      routineExecutionsQuery.refetch();
      timelineQuery.refetch();
      summaryQuery.refetch();
    },

    // Period/date selection
    selectedPeriod,
    setSelectedPeriod,
    selectedDate,
    setSelectedDate,
  };
}

// Helper to format duration in human-readable format
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

// Helper to format hours nicely
export function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }

  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
