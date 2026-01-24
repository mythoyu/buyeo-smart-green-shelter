import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { internalApi } from '../axiosInstance';

export interface PeopleCounterState {
  peopleCounterEnabled: boolean;
}

export const useGetPeopleCounterState = (options?: { enabled?: boolean }) => {
  return useQuery<PeopleCounterState>({
    queryKey: ['people-counter', 'state'],
    queryFn: async () => {
      const response = await internalApi.get('/system/people-counter/state');
      return response.data.data;
    },
    staleTime: 5000,
    enabled: options?.enabled ?? true,
  });
};

export const useUpdatePeopleCounterState = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (peopleCounterEnabled: boolean) => {
      const response = await internalApi.post('/system/people-counter', {
        peopleCounterEnabled,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people-counter', 'state'] });
    },
  });
};
