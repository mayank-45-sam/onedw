import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { biddingService } from './bidding.service';
import type {
  CustomJob,
  CreateCustomJobPayload,
  WorkerBid,
  SubmitBidPayload,
  NegotiationMessage,
  SendMessagePayload,
  Category,
  UrgencyOption,
  OpenJob,
} from './types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface BiddingContextValue {
  postCustomJob: (payload: CreateCustomJobPayload) => Promise<CustomJob>;
  getUserJobs: (userId: string) => Promise<CustomJob[]>;
  listOpenJobs: () => Promise<OpenJob[]>;
  getJob: (jobId: string) => Promise<CustomJob>;
  getJobBids: (jobId: string) => Promise<WorkerBid[]>;
  submitBid: (jobId: string, payload: SubmitBidPayload) => Promise<WorkerBid>;
  acceptBid: (bidId: string) => Promise<{ job: CustomJob; acceptedBid: WorkerBid; message: string }>;
  getJobMessages: (jobId: string) => Promise<NegotiationMessage[]>;
  sendMessage: (jobId: string, payload: SendMessagePayload) => Promise<NegotiationMessage>;
  urgencyOptions: UrgencyOption[];
}

const BiddingContext = createContext<BiddingContextValue | null>(null);

export const UrgencyOptions: UrgencyOption[] = [
  { value: 'asap', label: 'ASAP', description: 'Need it within 2 hours' },
  { value: 'today', label: 'Today', description: 'Need it by end of day' },
  { value: 'weekend', label: 'This Weekend', description: 'Flexible timing' },
  { value: 'anytime', label: 'Anytime', description: 'No rush, take your time' },
];

export function BiddingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const postJobMutation = useMutation({
    mutationFn: (payload: CreateCustomJobPayload) => biddingService.postJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bidding-jobs'] });
    },
  });

  const submitBidMutation = useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: SubmitBidPayload }) =>
      biddingService.submitBid(jobId, payload),
    onSuccess: (data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['job-bids', jobId] });
    },
  });

  const acceptBidMutation = useMutation({
    mutationFn: (bidId: string) => biddingService.acceptBid(bidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bidding-jobs'] });
      queryClient.refetchQueries({ queryKey: ['job-bids'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: SendMessagePayload }) =>
      biddingService.sendMessage(jobId, payload),
    onSuccess: (data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['job-messages', jobId] });
    },
  });

  const postCustomJob = useCallback(
    async (payload: CreateCustomJobPayload): Promise<CustomJob> => {
      return postJobMutation.mutateAsync(payload);
    },
    [postJobMutation],
  );

  const getUserJobs = useCallback((userId: string) => biddingService.getUserJobs(userId), []);

  const listOpenJobs = useCallback(() => biddingService.listOpenJobs(), []);

  const getJob = useCallback((jobId: string) => biddingService.getJob(jobId), []);

  const getJobBids = useCallback(
    (jobId: string) => biddingService.getJobBids(jobId),
    [],
  );

  const submitBid = useCallback(
    async (jobId: string, payload: SubmitBidPayload): Promise<WorkerBid> => {
      return submitBidMutation.mutateAsync({ jobId, payload });
    },
    [submitBidMutation],
  );

  const acceptBid = useCallback(
    async (bidId: string) => {
      return acceptBidMutation.mutateAsync(bidId);
    },
    [acceptBidMutation],
  );

  const getJobMessages = useCallback(
    (jobId: string) => biddingService.getJobMessages(jobId),
    [],
  );

  const sendMessage = useCallback(
    async (jobId: string, payload: SendMessagePayload): Promise<NegotiationMessage> => {
      return sendMessageMutation.mutateAsync({ jobId, payload });
    },
    [sendMessageMutation],
  );

  return (
    <BiddingContext.Provider
      value={{
        postCustomJob,
        getUserJobs,
        listOpenJobs,
        getJob,
        getJobBids,
        submitBid,
        acceptBid,
        getJobMessages,
        sendMessage,
        urgencyOptions: UrgencyOptions,
      }}
    >
      {children}
    </BiddingContext.Provider>
  );
}

export const useBidding = (): BiddingContextValue => {
  const ctx = useContext(BiddingContext);
  if (!ctx) {
    throw new Error('useBidding must be used within a BiddingProvider');
  }
  return ctx;
};

export function useUserJobs(userId: string) {
  return useQuery({
    queryKey: ['bidding-jobs', userId],
    queryFn: () => biddingService.getUserJobs(userId),
    staleTime: 30_000,
  });
}

export function useOpenJobs() {
  return useQuery({
    queryKey: ['bidding-jobs', 'open'],
    queryFn: () => biddingService.listOpenJobs(),
    staleTime: 30_000,
  });
}

export function useJobBids(jobId: string) {
  return useQuery({
    queryKey: ['job-bids', jobId],
    queryFn: () => biddingService.getJobBids(jobId),
    staleTime: 30_000,
    enabled: !!jobId,
  });
}

export function useJobMessages(jobId: string) {
  return useQuery({
    queryKey: ['job-messages', jobId],
    queryFn: () => biddingService.getJobMessages(jobId),
    staleTime: 15_000,
    refetchInterval: 5_000,
    enabled: !!jobId,
  });
}
