import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import buildingsRouter from "./buildings.js";
import usersRouter from "./users.js";
import adminAuthRouter from "./admin-auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminAuthRouter);
router.use(buildingsRouter);
router.use(usersRouter);

export default router;
