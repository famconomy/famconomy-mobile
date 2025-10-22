import apiClient from './apiClient';
import { createDebugLogger } from '../utils/debug';

export type AssistantSuggestionTone = 'primary' | 'secondary' | 'neutral';

export interface AssistantSuggestionDTO {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
  tone?: AssistantSuggestionTone;
}

export interface AssistantActionDTO {
  type: string;
  payload?: Record<string, unknown>;
}

export interface AssistantResponseDTO {
  reply: string;
  suggestions?: AssistantSuggestionDTO[];
  actions?: AssistantActionDTO[];
}

const assistantDebug = createDebugLogger('api-assistant');
export const sendMessageToAssistant = async (message: string, tenantId: string, userId: string): Promise<AssistantResponseDTO> => {
  try {
    const response = await apiClient.post('/assistant', { message }, {
      headers: {
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      },
    });
    const payload = response.data as AssistantResponseDTO;
    if (typeof payload !== 'object' || payload === null) {
      return { reply: '', suggestions: [], actions: [] };
    }
    return {
      reply: typeof payload.reply === 'string' ? payload.reply : '',
      suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
      actions: Array.isArray(payload.actions) ? payload.actions : [],
    };
  } catch (error) {
    assistantDebug.error('Error sending message to assistant:', error);
    throw error;
  }
};
