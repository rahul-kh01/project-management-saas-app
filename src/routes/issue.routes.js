import { Router } from "express";
import {
  listIssues,
  createIssue,
  getIssue,
  updateIssue,
  deleteIssue,
  addComment,
  listComments,
  transitionIssue,
  watchIssue,
  unwatchIssue,
} from "../controllers/issue.controllers.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { parseFormDataFields } from "../middlewares/formdata-parser.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createIssueValidator,
  updateIssueValidator,
  transitionIssueValidator,
  createCommentValidator,
  listIssuesQueryValidator,
} from "../validators/index.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);

// Issue CRUD routes
router
  .route("/:projectId")
  .get(
    validateProjectPermission(AvailableUserRole),
    listIssuesQueryValidator(),
    validate,
    listIssues
  )
  .post(
    validateProjectPermission(AvailableUserRole),
    upload.array("attachments", 5),
    parseFormDataFields(["labels"]),
    createIssueValidator(),
    validate,
    createIssue
  );

router
  .route("/:projectId/i/:issueId")
  .get(validateProjectPermission(AvailableUserRole), getIssue)
  .put(
    validateProjectPermission(AvailableUserRole),
    updateIssueValidator(),
    validate,
    updateIssue
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    deleteIssue
  );

// Comment routes
router
  .route("/:projectId/i/:issueId/comments")
  .get(validateProjectPermission(AvailableUserRole), listComments)
  .post(
    validateProjectPermission(AvailableUserRole),
    upload.array("attachments", 3),
    createCommentValidator(),
    validate,
    addComment
  );

// Transition route
router
  .route("/:projectId/i/:issueId/transition")
  .post(
    validateProjectPermission(AvailableUserRole),
    transitionIssueValidator(),
    validate,
    transitionIssue
  );

// Watch/Unwatch routes
router
  .route("/:projectId/i/:issueId/watch")
  .post(validateProjectPermission(AvailableUserRole), watchIssue)
  .delete(validateProjectPermission(AvailableUserRole), unwatchIssue);

export default router;

