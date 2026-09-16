import { Router } from "express";
import { changePassword, getCurrentUser, login, logout } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";

export const authRouter = Router();

// Public login endpoint
authRouter.post("/login", login);

// Protected authentication endpoints
authRouter.post("/logout", authenticateToken, logout);
authRouter.get("/me", authenticateToken, getCurrentUser);
authRouter.post("/change-password", authenticateToken, changePassword);
