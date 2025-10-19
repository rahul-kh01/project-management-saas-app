export const UserRolesEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};

export const AvailableUserRole = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const AvailableTaskStatues = Object.values(TaskStatusEnum);

export const IssueTypeEnum = {
  BUG: "bug",
  TASK: "task",
  STORY: "story",
  EPIC: "epic",
};

export const AvailableIssueTypes = Object.values(IssueTypeEnum);

export const IssuePriorityEnum = {
  LOWEST: "lowest",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  HIGHEST: "highest",
};

export const AvailableIssuePriorities = Object.values(IssuePriorityEnum);

export const IssueStatusEnum = {
  BACKLOG: "backlog",
  SELECTED: "selected",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  DONE: "done",
  BLOCKED: "blocked",
};

export const AvailableIssueStatuses = Object.values(IssueStatusEnum);

export const STATUS_TRANSITIONS = {
  [IssueStatusEnum.BACKLOG]: [IssueStatusEnum.SELECTED],
  [IssueStatusEnum.SELECTED]: [IssueStatusEnum.IN_PROGRESS, IssueStatusEnum.BLOCKED],
  [IssueStatusEnum.IN_PROGRESS]: [
    IssueStatusEnum.IN_REVIEW,
    IssueStatusEnum.BLOCKED,
    IssueStatusEnum.DONE,
  ],
  [IssueStatusEnum.IN_REVIEW]: [
    IssueStatusEnum.IN_PROGRESS,
    IssueStatusEnum.DONE,
    IssueStatusEnum.BLOCKED,
  ],
  [IssueStatusEnum.BLOCKED]: [IssueStatusEnum.IN_PROGRESS],
  [IssueStatusEnum.DONE]: [],
};
