import { body, query } from "express-validator";
import {
  AvailableUserRole,
  AvailableIssueTypes,
  AvailableIssuePriorities,
  AvailableIssueStatuses,
} from "../utils/constants.js";
const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLowercase()
      .withMessage("Username must be in lower case")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("password").trim().notEmpty().withMessage("Password is required"),
    body("fullName").optional().trim(),
  ];
};

const userLoginValidator = () => {
  return [
    body("email").optional().isEmail().withMessage("Email is invalid"),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

const userChangeCurrentPasswordValidator = () => {
  return [
    body("oldPassword").notEmpty().withMessage("Old password is required"),
    body("newPassword").notEmpty().withMessage("New password is required"),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
  ];
};

const userResetForgotPasswordValidator = () => {
  return [body("newPassword").notEmpty().withMessage("Password is required")];
};

const createProjectValidator = () => {
  return [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").optional(),
  ];
};

const addMembertoProjectValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("role")
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AvailableUserRole)
      .withMessage("Role is invalid"),
  ];
};

const createIssueValidator = () => {
  return [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters long"),
    body("description").optional().trim(),
    body("type")
      .optional()
      .isIn(AvailableIssueTypes)
      .withMessage("Invalid issue type"),
    body("priority")
      .optional()
      .isIn(AvailableIssuePriorities)
      .withMessage("Invalid priority"),
    body("status")
      .optional()
      .isIn(AvailableIssueStatuses)
      .withMessage("Invalid status"),
    body("assignee").optional().isMongoId().withMessage("Invalid assignee ID"),
    body("labels").optional().isArray().withMessage("Labels must be an array"),
    body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
    body("storyPoints")
      .optional()
      .isNumeric()
      .withMessage("Story points must be a number"),
  ];
};

const updateIssueValidator = () => {
  return [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters long"),
    body("description").optional().trim(),
    body("type")
      .optional()
      .isIn(AvailableIssueTypes)
      .withMessage("Invalid issue type"),
    body("priority")
      .optional()
      .isIn(AvailableIssuePriorities)
      .withMessage("Invalid priority"),
    body("assignee").optional().isMongoId().withMessage("Invalid assignee ID"),
    body("labels").optional().isArray().withMessage("Labels must be an array"),
    body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
    body("storyPoints")
      .optional()
      .isNumeric()
      .withMessage("Story points must be a number"),
  ];
};

const transitionIssueValidator = () => {
  return [
    body("to")
      .notEmpty()
      .withMessage("Target status is required")
      .isIn(AvailableIssueStatuses)
      .withMessage("Invalid status"),
  ];
};

const createCommentValidator = () => {
  return [body("body").trim().notEmpty().withMessage("Comment body is required")];
};

const listIssuesQueryValidator = () => {
  return [
    query("type").optional().isIn(AvailableIssueTypes),
    query("status").optional().isIn(AvailableIssueStatuses),
    query("priority").optional().isIn(AvailableIssuePriorities),
    query("assignee").optional().isMongoId(),
    query("search").optional().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ];
};

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  createProjectValidator,
  addMembertoProjectValidator,
  createIssueValidator,
  updateIssueValidator,
  transitionIssueValidator,
  createCommentValidator,
  listIssuesQueryValidator,
};
