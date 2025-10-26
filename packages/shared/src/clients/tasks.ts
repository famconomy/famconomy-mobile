import { Task, TaskStatus } from '../types';
import { apiClient } from './apiClient';
import { AxiosRequestConfig } from 'axios';

export const taskClient = {
  async getAll(familyId: string): Promise<Task[]> {
    return apiClient.get(`/tasks/family/${familyId}`);
  },

  async getById(taskId: string): Promise<Task> {
    return apiClient.get(`/tasks/${taskId}`);
  },

  async create(data: Partial<Task>): Promise<Task> {
    return apiClient.post('/tasks', data);
  },

  async update(taskId: string, data: Partial<Task>): Promise<Task> {
    return apiClient.put(`/tasks/${taskId}`, data);
  },

  async updateStatus(taskId: string, status: TaskStatus): Promise<Task> {
    return apiClient.put(`/tasks/${taskId}`, { status });
  },

  async delete(taskId: string): Promise<void> {
    return apiClient.delete(`/tasks/${taskId}`);
  },

  async approve(taskId: string, approvalStatusId: number): Promise<void> {
    return apiClient.put(`/tasks/${taskId}/approve`, { ApprovalStatusID: approvalStatusId });
  },

  async uploadAttachment(taskId: string, attachment: File): Promise<void> {
    const formData = new FormData();
    formData.append('attachment', attachment);
    return apiClient.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    } as AxiosRequestConfig);
  },

  async deleteAttachment(taskId: string, attachmentId: number): Promise<void> {
    return apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },
};
