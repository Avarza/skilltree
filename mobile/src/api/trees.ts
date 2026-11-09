import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { request } from './client';
import type { GenerateRequest, NodeStatus, SkillTree } from './types';
import { recordCompletion } from '../activity/activityLog';

export const treeKeys = {
  all: ['trees'] as const,
  detail: (id: string) => ['trees', id] as const,
};

export function useTrees() {
  return useQuery({ queryKey: treeKeys.all, queryFn: () => request<SkillTree[]>('/api/v1/trees') });
}

export function useTree(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: treeKeys.detail(id),
    queryFn: () => request<SkillTree>(`/api/v1/trees/${id}`),
    // Show the list version instantly while the detail loads.
    initialData: () => qc.getQueryData<SkillTree[]>(treeKeys.all)?.find(t => t.id === id),
  });
}

function useStoreTree() {
  const qc = useQueryClient();
  return (tree: SkillTree) => {
    qc.setQueryData(treeKeys.detail(tree.id), tree);
    qc.setQueryData<SkillTree[]>(treeKeys.all, old =>
      old ? [tree, ...old.filter(t => t.id !== tree.id)] : [tree],
    );
  };
}

export function useSetNodeStatus(treeId: string) {
  const store = useStoreTree();
  return useMutation({
    mutationFn: ({ nodeId, status }: { nodeId: string; status: Exclude<NodeStatus, 'LOCKED'> }) =>
      request<SkillTree>(`/api/v1/trees/${treeId}/nodes/${encodeURIComponent(nodeId)}`, { method: 'PATCH', body: { status } }),
    onSuccess: (tree, { nodeId, status }) => {
      store(tree);
      if (status === 'COMPLETED') {
        const node = tree.nodes.find(n => n.id === nodeId);
        recordCompletion({ treeId, nodeId, xp: node?.xp ?? 0 });
      }
    },
  });
}

export function useGenerateTree() {
  const store = useStoreTree();
  return useMutation({
    mutationFn: (body: GenerateRequest) => request<SkillTree>('/api/v1/trees/generate', { method: 'POST', body }),
    onSuccess: store,
  });
}

export function useCreateFromTemplate() {
  const store = useStoreTree();
  return useMutation({
    mutationFn: (slug: string) => request<SkillTree>(`/api/v1/trees/from-template/${encodeURIComponent(slug)}`, { method: 'POST' }),
    onSuccess: store,
  });
}

export function useDeleteTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/api/v1/trees/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.setQueryData<SkillTree[]>(treeKeys.all, old => old?.filter(t => t.id !== id));
      qc.removeQueries({ queryKey: treeKeys.detail(id) });
    },
  });
}
