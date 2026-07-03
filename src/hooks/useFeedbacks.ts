import { useState, useEffect, useCallback } from 'react';
import type { Feedback } from '../types';
import { feedbackService } from '../services/feedbackService';
import { parseDate } from '../services/dateUtils';

export function useFeedbacks(technicianId?: string) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getFeedbacks(technicianId);
      // Sort by creation date descending
      data.sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
      setFeedbacks(data);
    } catch (err: any) {
      console.error("Error loading feedbacks:", err);
      setError("Erro ao carregar feedbacks.");
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  return { feedbacks, loading, error, refreshFeedbacks: fetchFeedbacks };
}
