
import apiClient from './apiClient';

export interface TaskStatus {
  TaskStatusID: number;
  StatusName: string;
}

export const getAllTaskStatuses = async (): Promise<TaskStatus[]> => {
  const response = await apiClient.get('/task-statuses');
  return response.data;
};
