import { useMutation, useQuery } from '@tanstack/react-query';
import type { Profile } from '../game/types';
import { defaultProfile, localAdapter } from './adapter';

export const PROFILE_KEY = ['profile'] as const;

/** Loads the saved profile via React Query — the seam where the
 *  Postgres-backed API replaces localStorage in sub-project 2. */
export function useProfileQuery() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => localAdapter.load() ?? defaultProfile(),
    staleTime: Infinity,
  });
}

export function useProfileSave() {
  return useMutation({
    mutationFn: async (p: Profile) => {
      localAdapter.save(p);
    },
  });
}
