import { useQuery } from '@tanstack/react-query'
import { getNodes, getNodeMetrics } from '../lib/api'

export function useNodes() {
  return useQuery({
    queryKey: ['nodes'],
    queryFn: getNodes,
    refetchInterval: 10000
  })
}

export function useNodeMetrics(id: string | undefined) {
  return useQuery({
    queryKey: ['metrics', id],
    queryFn: () => id ? getNodeMetrics(id) : Promise.resolve([]),
    refetchInterval: 10000,
    enabled: !!id
  })
}
