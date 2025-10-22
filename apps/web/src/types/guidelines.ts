export type GuidelineType = 'VALUE' | 'RULE';
export type GuidelineStatus = 'DRAFT' | 'UNDER_REVIEW' | 'ACTIVE' | 'RETIRED';

export interface GuidelineApprovalSummary {
  GuidelineID: number;
  UserID: string;
  Approved: boolean;
  ApprovedAt: string | null;
  User?: {
    UserID: string;
    FirstName: string | null;
    LastName: string | null;
    Email: string | null;
  } | null;
}

export interface GuidelineNode {
  GuidelineID: number;
  FamilyID: number;
  Type: GuidelineType;
  Title: string;
  Description: string | null;
  ParentID: number | null;
  Status: GuidelineStatus;
  ProposedByUserID: string;
  ProposedBy?: {
    UserID: string;
    FirstName: string | null;
    LastName: string | null;
    Email: string | null;
  } | null;
  ProposedAt: string;
  ActivatedAt: string | null;
  ExpiresAt: string | null;
  Metadata?: Record<string, unknown> | null;
  approvals: GuidelineApprovalSummary[];
  children: GuidelineNode[];
}

export interface GuidelineListResponse {
  active: GuidelineNode[];
  underReview: GuidelineNode[];
  newRules?: GuidelineNode[];
}
