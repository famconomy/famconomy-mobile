import { Task } from '../types';
import apiClient from './apiClient';

export const fetchFamilyTasks = async (familyId: string): Promise<Task[]> => {
  const response = await apiClient.get(`/tasks/family/${familyId}`);
  return response.data;
};

export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  const response = await apiClient.post('/tasks', taskData);
  return response.data;
};

export const updateTask = async (id: string, taskData: Partial<Task>): Promise<Task> => {
  const response = await apiClient.put(`/tasks/${id}`, taskData);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await apiClient.delete(`/tasks/${id}`);
};

export const approveTask = async (id: string, approvalStatusId: number): Promise<void> => {
  await apiClient.put(`/tasks/${id}/approve`, { ApprovalStatusID: approvalStatusId });
};

export const uploadTaskAttachment = async (taskId: string, attachment: File): Promise<void> => {
  const formData = new FormData();
  formData.append('attachment', attachment);
  await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteTaskAttachment = async (taskId: string, attachmentId: number): Promise<void> => {
  await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
};