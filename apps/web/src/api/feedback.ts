import apiClient from './apiClient';

export const submitFeedback = async (feedbackType: string, message: string, screenshot?: File) => {
  const formData = new FormData();
  formData.append('feedbackType', feedbackType);
  formData.append('message', message);
  if (screenshot) {
    formData.append('screenshot', screenshot);
  }

  return apiClient.post('/feedback', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
