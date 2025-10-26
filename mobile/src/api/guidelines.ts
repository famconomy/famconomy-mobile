import apiClient from './apiClient';

// Types for Guidelines (Values & Rules)
export type GuidelineType = 'VALUE' | 'RULE';

export interface GuidelineApproval {
  ApprovalID: number;
  GuidelineID: number;
  UserID: string;
  Approved: boolean;
  CreatedAt: string;
  user?: {
    UserID: string;
    FirstName: string;
    LastName: string;
    ProfilePhotoUrl?: string;
  };
}

export interface GuidelineNode {
  GuidelineID: number;
  FamilyID: number;
  Type: GuidelineType;
  Title: string;
  Description?: string;
  ParentID?: number;
  IsActive: boolean;
  CreatedByUserID: string;
  CreatedAt: string;
  Metadata?: any;
  approvals: GuidelineApproval[];
  children?: GuidelineNode[];
}

export interface GuidelineListResponse {
  active: GuidelineNode[];
  pending: GuidelineNode[];
}

export interface CreateGuidelinePayload {
  type: GuidelineType;
  title: string;
  description?: string;
  parentId?: number;
  metadata?: any;
}

export interface UpdateGuidelinePayload {
  title?: string;
  description?: string;
  parentId?: number;
  metadata?: any;
  isActive?: boolean;
}

/**
 * Fetch all guidelines (values or rules) for a family
 */
export const fetchGuidelines = async (
  familyId: number | string,
  type: GuidelineType
): Promise<GuidelineListResponse> => {
  const { data } = await apiClient.get(`/family/${familyId}/guidelines`, {
    params: { type },
  });
  return data as GuidelineListResponse;
};

/**
 * Create a new guideline suggestion
 */
export const createGuideline = async (
  familyId: number | string,
  payload: CreateGuidelinePayload
): Promise<GuidelineNode> => {
  const { data } = await apiClient.post(`/family/${familyId}/guidelines`, payload);
  return data as GuidelineNode;
};

/**
 * Update an existing guideline
 */
export const updateGuideline = async (
  familyId: number | string,
  guidelineId: number,
  payload: UpdateGuidelinePayload
): Promise<GuidelineNode> => {
  const { data } = await apiClient.patch(
    `/family/${familyId}/guidelines/${guidelineId}`,
    payload
  );
  return data as GuidelineNode;
};

/**
 * Approve or reject a guideline suggestion
 */
export const approveGuideline = async (
  familyId: number | string,
  guidelineId: number,
  approved: boolean
): Promise<GuidelineNode> => {
  const { data } = await apiClient.post(
    `/family/${familyId}/guidelines/${guidelineId}/approve`,
    { approved }
  );
  return data as GuidelineNode;
};

/**
 * Delete a guideline (if authorized)
 */
export const deleteGuideline = async (
  familyId: number | string,
  guidelineId: number
): Promise<void> => {
  await apiClient.delete(`/family/${familyId}/guidelines/${guidelineId}`);
};
