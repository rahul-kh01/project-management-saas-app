import { Router } from "express";
import {
  getMessages,
  postMessage,
  markAsRead,
} from "../controllers/chat.controllers.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { AvailableUserRole } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);

// Get message history
router
  .route("/:projectId/messages")
  .get(validateProjectPermission(AvailableUserRole), getMessages)
  .post(
    validateProjectPermission(AvailableUserRole),
    upload.array("attachments", 5),
    postMessage
  );

// Mark message as read
router
  .route("/:projectId/messages/:messageId/read")
  .post(validateProjectPermission(AvailableUserRole), markAsRead);

export default router;

