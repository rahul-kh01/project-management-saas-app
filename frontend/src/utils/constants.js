export const USER_ROLES = {
  ADMIN: 'admin',
  PROJECT_ADMIN: 'project_admin',
  MEMBER: 'member',
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.PROJECT_ADMIN]: 'Project Admin',
  [USER_ROLES.MEMBER]: 'Member',
};

export const STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'To Do',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.DONE]: 'Done',
};

export const ISSUE_TYPES = {
  BUG: 'bug',
  TASK: 'task',
  STORY: 'story',
  EPIC: 'epic',
};

export const ISSUE_PRIORITIES = {
  LOWEST: 'lowest',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  HIGHEST: 'highest',
};

export const ISSUE_STATUSES = {
  BACKLOG: 'backlog',
  SELECTED: 'selected',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  BLOCKED: 'blocked',
};

export const ISSUE_TYPE_LABELS = {
  [ISSUE_TYPES.BUG]: 'Bug',
  [ISSUE_TYPES.TASK]: 'Task',
  [ISSUE_TYPES.STORY]: 'Story',
  [ISSUE_TYPES.EPIC]: 'Epic',
};

export const ISSUE_PRIORITY_LABELS = {
  [ISSUE_PRIORITIES.LOWEST]: 'Lowest',
  [ISSUE_PRIORITIES.LOW]: 'Low',
  [ISSUE_PRIORITIES.MEDIUM]: 'Medium',
  [ISSUE_PRIORITIES.HIGH]: 'High',
  [ISSUE_PRIORITIES.HIGHEST]: 'Highest',
};

export const ISSUE_STATUS_LABELS = {
  [ISSUE_STATUSES.BACKLOG]: 'Backlog',
  [ISSUE_STATUSES.SELECTED]: 'Selected',
  [ISSUE_STATUSES.IN_PROGRESS]: 'In Progress',
  [ISSUE_STATUSES.IN_REVIEW]: 'In Review',
  [ISSUE_STATUSES.DONE]: 'Done',
  [ISSUE_STATUSES.BLOCKED]: 'Blocked',
};

export const STATUS_TRANSITIONS = {
  [ISSUE_STATUSES.BACKLOG]: [ISSUE_STATUSES.SELECTED],
  [ISSUE_STATUSES.SELECTED]: [ISSUE_STATUSES.IN_PROGRESS, ISSUE_STATUSES.BLOCKED],
  [ISSUE_STATUSES.IN_PROGRESS]: [
    ISSUE_STATUSES.IN_REVIEW,
    ISSUE_STATUSES.BLOCKED,
    ISSUE_STATUSES.DONE,
  ],
  [ISSUE_STATUSES.IN_REVIEW]: [
    ISSUE_STATUSES.IN_PROGRESS,
    ISSUE_STATUSES.DONE,
    ISSUE_STATUSES.BLOCKED,
  ],
  [ISSUE_STATUSES.BLOCKED]: [ISSUE_STATUSES.IN_PROGRESS],
  [ISSUE_STATUSES.DONE]: [],
};

