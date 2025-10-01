import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Filter, CheckCircle2, Circle, Star, MoreHorizontal, Users, Calendar, Tag, ArrowRight, Clock, Repeat, UserPlus, X, CalendarDays, CalendarRange, Paperclip } from 'lucide-react';
import { Task, Attachment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { fetchFamilyTasks, createTask, updateTask, uploadTaskAttachment, deleteTaskAttachment } from '../api/tasks';
import { getAllTaskStatuses, TaskStatus } from '../api/taskStatuses';
import { createDebugLogger } from "../utils/debug";
import { AttachmentGallery } from '../components/tasks/AttachmentGallery';

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'family' | 'completed'>('my');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add this state
  const tasksDebug = useMemo(() => createDebugLogger('tasks-page'), []);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [modalAttachments, setModalAttachments] = useState<Attachment[]>([]);
  
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setNewTaskTitle(selectedTask.Title);
      setNewTaskDescription(selectedTask.Description || '');
      setNewTaskDueDate(selectedTask.DueDate ? new Date(selectedTask.DueDate).toISOString().substring(0, 16) : '');
      setNewTaskAssignedTo(selectedTask.AssignedToUserID || '');
      setNewRewardType(selectedTask.RewardType || 'points');
      setNewRewardValue(selectedTask.RewardValue || 0);
      setModalAttachments(selectedTask.attachments || []);
    } else {
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate(new Date().toISOString().substring(0, 16)); // Set default to current date/time
      setNewTaskAssignedTo('');
      setNewRewardType('points');
      setNewRewardValue(0);
      setModalAttachments([]);
    }
  }, [selectedTask]);

  const fetchData = useCallback(async () => {
    if (!family) return;
    try {
      setIsLoading(true);
      const [tasksData, taskStatusesData] = await Promise.all([
        fetchFamilyTasks(family.FamilyID.toString()),
        getAllTaskStatuses(),
      ]);
      tasksDebug.log('Tasks received by frontend:', JSON.stringify(tasksData, null, 2));
      setTasks(tasksData);
      setTaskStatuses(taskStatusesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [family, tasksDebug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [newRewardType, setNewRewardType] = useState<'screentime' | 'points' | 'currency'>('points');
  const [newRewardValue, setNewRewardValue] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateTaskForm = () => {
    const errors: { [key: string]: string } = {};
    if (!newTaskTitle) {
      errors.newTaskTitle = 'Task title is required.';
    }
    // Validate newTaskAssignedTo: it should not be empty if an assignment is required
    // Assuming an assignment is always required based on your statement
    if (newTaskAssignedTo === '') { // Check specifically for the empty string value of "Unassigned"
      errors.newTaskAssignedTo = 'Please assign this task to a family member.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleRemoveAttachment = (attachmentId: number) => {
    setModalAttachments(prevAttachments => prevAttachments.filter(att => att.AttachmentID !== attachmentId));
  };

  const resetForm = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDueDate(new Date().toISOString().substring(0, 16)); // Reset to current date/time
    setNewTaskAssignedTo('');
    setNewRewardType('points');
    setNewRewardValue(0);
    setNewAttachment(null);
    setModalAttachments([]);
    setFormErrors({}); // Clear form errors
    setSelectedTask(null); // Ensure selectedTask is null for new task creation
  };

  const handleSaveTask = async () => {
    if (!validateTaskForm()) {
      return;
    }
    if (!family || !user) return;

    const taskData = {
      FamilyID: family.FamilyID,
      Title: newTaskTitle,
      Description: newTaskDescription,
      DueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      AssignedToUserID: newTaskAssignedTo,
      CreatedByUserID: user.id,
      RewardType: newRewardType,
      RewardValue: newRewardValue,
    };

    try {
      let savedTask;
      if (selectedTask) {
        // Identify attachments to delete
        const attachmentsToDelete = selectedTask.attachments.filter(
          originalAtt => !modalAttachments.some(modalAtt => modalAtt.AttachmentID === originalAtt.AttachmentID)
        );

        // Delete attachments
        for (const attachment of attachmentsToDelete) {
          await deleteTaskAttachment(selectedTask.TaskID.toString(), attachment.AttachmentID);
        }

        savedTask = await updateTask(selectedTask.TaskID.toString(), taskData as unknown as Task);
      } else {
        savedTask = await createTask(taskData as unknown as Task);
      }

      if (newAttachment) {
        setIsUploading(true);
        try {
          await uploadTaskAttachment(savedTask.TaskID.toString(), newAttachment);
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload attachment');
        } finally {
          setIsUploading(false);
          setNewAttachment(null);
        }
      }

      setShowTaskModal(false);
      resetForm(); // Reset form fields after successful save
      fetchData(); // Refetch tasks after attachment upload (if any) or task save
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const isTaskCompleted = (task: Task) => {
    const completedStatus = taskStatuses.find(status => status.StatusName.toLowerCase() === 'completed');
    return completedStatus ? task.TaskStatusID === completedStatus.TaskStatusID : false;
  };

  const handleToggleComplete = async (task: Task) => {
    if (taskStatuses.length === 0) {
      setError('Task statuses have not been loaded yet.');
      return;
    }
    const completedStatus = taskStatuses.find(status => status.StatusName.toLowerCase() === 'completed');
    const pendingStatus = taskStatuses.find(status => status.StatusName.toLowerCase() === 'pending');

    if (!completedStatus || !pendingStatus) {
      setError('Could not find task statuses.');
      return;
    }

    const newStatusId = isTaskCompleted(task) ? pendingStatus.TaskStatusID : completedStatus.TaskStatusID;

    try {
      const updatedTask = await updateTask(task.TaskID.toString(), { TaskStatusID: newStatusId } as Task);
      setTasks(tasks.map(t => t.TaskID === task.TaskID ? updatedTask : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleApproveTask = async (task: Task) => {
    try {
      await updateTask(task.TaskID.toString(), { ApprovalStatusID: 2 } as Task); // Assuming 2 is the ApprovalStatusID for "Approved"
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const completedStatus = taskStatuses.find(status => status.StatusName.toLowerCase() === 'completed');
    const isCompleted = completedStatus ? task.TaskStatusID === completedStatus.TaskStatusID : false;

    if (activeTab === 'my') {
      return task.AssignedToUserID === user?.id && !isCompleted;
    }

    if (activeTab === 'family') {
      return !isCompleted;
    }

    if (activeTab === 'completed') {
      return isCompleted && task.ApprovalStatusID === 1; // Assuming 1 is Not Approved
    }
    
    return true;
  });

  const allTasks = tasks;

  const totalCompletedTasks = allTasks.filter(isTaskCompleted).length;
  const totalPendingTasks = allTasks.length - totalCompletedTasks;

  const userTasks = filteredTasks.filter(task => 
    activeTab === 'my' && task.AssignedToUserID === user?.id
  );
  
  const allTasksComplete = userTasks.length > 0 && userTasks.every(isTaskCompleted);

  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

  if (error) {
    return <div className="text-error-500">Error: {error}</div>;
  }

  return (
    <div id="tasks-board" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Tasks</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Manage and track family responsibilities</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className="flex items-center px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Filter size={18} className="mr-2" />
            <span>Filter</span>
          </button>

          <button 
            onClick={() => {
              setSelectedTask(null);
              setShowTaskModal(true);
            }}
            className="flex items-center px-3 py-2 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {showFilterOptions && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-4 mb-4"
        >
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Filter Options</h3>
          <p className="text-neutral-500 dark:text-neutral-400">More filter options will go here.</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setActiveTab('completed')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Completed</h3>
            <CheckCircle2 className="text-success-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{totalCompletedTasks}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Tasks completed</p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Pending</h3>
            <Circle className="text-warning-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{totalPendingTasks}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Tasks to complete</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card overflow-hidden">
        <div className="flex border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'my'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            My Tasks
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'family'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Family Tasks
          </button>
          {user?.role === 'parent' && (
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'completed'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
              }`}
            >
              Completed
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'my' && allTasksComplete ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                All Tasks Complete!
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                Great job! Why not help out a family member?
              </p>
              <button
                onClick={() => setActiveTab('family')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
              >
                Check Family Tasks
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.TaskID}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 min-h-[120px] ${
                    isTaskCompleted(task) ? 'bg-neutral-50 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-start">
                    <button
                      onClick={() => handleToggleComplete(task)}
                      disabled={isLoading}
                      className={`p-2 rounded-xl ${
                        isTaskCompleted(task)
                          ? 'text-primary-500 dark:text-primary-400'
                          : 'text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400'
                      }`}
                    >
                      {isTaskCompleted(task) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>

                    <div className="flex-1 ml-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            isTaskCompleted(task)
                              ? 'text-neutral-400 dark:text-neutral-500 line-through'
                              : 'text-neutral-900 dark:text-white'
                          }`}>
                            {task.Title}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2 ml-auto">
                          {task.attachments && task.attachments.length > 0 && (
                            <div className="ml-4">
                              <AttachmentGallery attachments={task.attachments} />
                            </div>
                          )}
                          {isTaskCompleted(task) && task.ApprovalStatusID === 1 && user?.role === 'parent' && (
                            <button
                              onClick={() => handleApproveTask(task)}
                              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-success-500 dark:text-success-400"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedTask(task);
                              setShowTaskModal(true);
                            }}
                            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 dark:text-neutral-500">
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {task.DueDate && (
                          <span className="flex items-center text-xs text-neutral-500 dark:text-neutral-400">
                            <Calendar size={12} className="mr-1" />
                            {new Date(task.DueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.AssignedToUserID &&
                          <div className="flex -space-x-2 ml-auto">
                              <div 
                                key={task.AssignedToUserID}
                                className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs text-primary-700 dark:text-primary-300 ring-2 ring-white dark:ring-neutral-800 cursor-default select-none"
                              >
                                {family?.members.find(m => m.UserID === task.AssignedToUserID)?.FirstName.charAt(0)}
                              </div>
                          </div>
                        }
                      </div>

                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {task.Description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg w-full max-w-lg my-8"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  {selectedTask ? 'Edit Task' : 'New Task'}
                </h3>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border ${formErrors.newTaskTitle ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400`}
                      placeholder="Enter task title"
                    />
                    {formErrors.newTaskTitle && <p className="text-red-500 text-xs mt-1">{formErrors.newTaskTitle}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                      placeholder="Add task description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Reward
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={newRewardType}
                        onChange={(e) => setNewRewardType(e.target.value as 'screentime' | 'points' | 'currency')}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                      >
                        <option value="points">Points</option>
                        <option value="screentime">Screen Time (minutes)</option>
                        <option value="currency">Currency</option>
                      </select>
                      <input
                        type="number"
                        value={newRewardValue}
                        onChange={(e) => setNewRewardValue(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                        placeholder="Value"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Assign To
                    </label>
                    <select
                      value={newTaskAssignedTo}
                      onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border ${formErrors.newTaskAssignedTo ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400`}
                    >
                      <option value="">Unassigned</option>
                      {family?.members.map(member => (
                        <option key={member.UserID} value={member.UserID}>
                          {member.FirstName} {member.LastName}
                        </option>
                      ))}
                    </select>
                    {formErrors.newTaskAssignedTo && <p className="text-red-500 text-xs mt-1">{formErrors.newTaskAssignedTo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Attachment
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setNewAttachment(e.target.files ? e.target.files[0] : null)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    />
                  </div>

                  {selectedTask && modalAttachments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Existing Attachments
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {modalAttachments.map(attachment => (
                          <div key={attachment.AttachmentID} className="relative group">
                            <img src={attachment.Url} alt={attachment.FileName} className="w-20 h-20 object-cover rounded-lg" />
                            <button
                              onClick={() => handleRemoveAttachment(attachment.AttachmentID)}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={isUploading}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl disabled:bg-primary-300 dark:disabled:bg-primary-700 flex items-center justify-center"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : selectedTask ? (
                    'Save Changes'
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
