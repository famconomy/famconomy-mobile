export interface RoomTemplateSummary {
  id: number;
  name: string;
  description?: string;
}

export type RoomTemplate = RoomTemplateSummary;

export interface Room {
  id: number;
  familyId: number;
  name: string;
  roomTemplateId?: number | null;
  roomTemplate?: RoomTemplateSummary | null;
}

export interface GigTemplate {
  id: number;
  name: string;
  estimatedMinutes: number;
  applicableTags?: string | null;
  roomTemplate: RoomTemplateSummary | null;
}

export interface FamilyGig {
  id: number;
  familyId: number;
  gigTemplateId: number;
  familyRoomId: number;
  cadenceType: string;
  maxPerDay?: number;
  visible: boolean;
  overridePoints?: number;
  overrideCurrencyCents?: number;
  overrideScreenMinutes?: number;
  gigTemplate: GigTemplate;
  familyRoom?: Room | null;
  claims: any[];
}
