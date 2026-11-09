import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { request } from './client';

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
};
export type Practice = {
  lesson: string;
  tasks: string[];
  quiz: QuizQuestion[];
  suggestedMinutes: number;
};
export type StudySession = {
  id: number;
  treeId: string;
  nodeId: string;
  durationSeconds: number;
  endedAt: string;
};

const path = (treeId: string, nodeId: string) =>
  `/api/v1/trees/${treeId}/nodes/${encodeURIComponent(nodeId)}`;

/** Practice is generated once per node on the server (Claude) and cached there, so cache it forever here too. */
export function usePractice(treeId: string, nodeId: string) {
  return useQuery({
    queryKey: ['practice', treeId, nodeId],
    queryFn: () => request<Practice>(`${path(treeId, nodeId)}/practice`),
    staleTime: Infinity,
  });
}

/** Monday 00:00 local time of the current week. */
export function startOfWeek(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function useSessions(since: Date) {
  return useQuery({
    queryKey: ['sessions', since.toISOString()],
    queryFn: () =>
      request<StudySession[]>(
        `/api/v1/sessions?since=${encodeURIComponent(since.toISOString())}`,
      ),
  });
}

export function useRecordSession(treeId: string, nodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (durationSeconds: number) =>
      request<StudySession>(`${path(treeId, nodeId)}/sessions`, {
        method: 'POST',
        body: { durationSeconds },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
