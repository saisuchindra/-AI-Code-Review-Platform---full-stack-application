import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as authController from "./auth.controller";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);

// Protected routes
router.post("/logout", authMiddleware, authController.logout);
router.get("/profile", authMiddleware, authController.profile);
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post("/change-password", authMiddleware, authController.changePassword);

export const authRoutes = router;
