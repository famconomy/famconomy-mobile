import { taskClient } from '@famconomy/shared';

export const fetchFamilyTasks = async (familyId: string) => {
  return taskClient.getAll(familyId);
};

export const createTask = async (taskData: any) => {
  return taskClient.create(taskData);
};

export const updateTask = async (id: string, taskData: any) => {
  return taskClient.update(id, taskData);
};

export const deleteTask = async (id: string) => {
  return taskClient.delete(id);
};

export const approveTask = async (id: string, approvalStatusId: number) => {
  return taskClient.approve(id, approvalStatusId);
};

export const uploadTaskAttachment = async (taskId: string, attachment: File) => {
  return taskClient.uploadAttachment(taskId, attachment);
};

export const deleteTaskAttachment = async (taskId: string, attachmentId: number) => {
  return taskClient.deleteAttachment(taskId, attachmentId);
};