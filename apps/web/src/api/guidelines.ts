import apiClient from './apiClient';
import type {
  GuidelineListResponse,
  GuidelineNode,
  GuidelineType,
} from '../types/guidelines';

export interface CreateGuidelinePayload {
  type: GuidelineType;
  title: string;
  description?: string;
  parentId?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateGuidelinePayload {
  title?: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: 'ACTIVE' | 'RETIRED';
}

export const fetchGuidelines = async (
  familyId: number | string,
  type: GuidelineType,
): Promise<GuidelineListResponse> => {
  const { data } = await apiClient.get(`/family/${familyId}/guidelines`, {
    params: { type },
  });
  return data as GuidelineListResponse;
};

export const createGuideline = async (
  familyId: number | string,
  payload: CreateGuidelinePayload,
): Promise<GuidelineNode> => {
  const { data } = await apiClient.post(`/family/${familyId}/guidelines`, payload);
  return data as GuidelineNode;
};

export const updateGuideline = async (
  familyId: number | string,
  guidelineId: number,
  payload: UpdateGuidelinePayload,
): Promise<GuidelineNode> => {
  const { data } = await apiClient.patch(`/family/${familyId}/guidelines/${guidelineId}`, payload);
  return data as GuidelineNode;
};

export const approveGuideline = async (
  familyId: number | string,
  guidelineId: number,
  approved: boolean,
): Promise<GuidelineNode> => {
  const { data } = await apiClient.post(`/family/${familyId}/guidelines/${guidelineId}/approve`, { approved });
  return data as GuidelineNode;
};
