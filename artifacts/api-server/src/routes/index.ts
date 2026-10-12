import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import buildingsRouter from "./buildings.js";
import usersRouter from "./users.js";
import adminAuthRouter from "./admin-auth.js";
import adminAccountsRouter from "./admin-accounts.js";
import campusFloorPlansRouter from "./campus-floor-plans.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminAuthRouter);
router.use(adminAccountsRouter);
router.use(buildingsRouter);
router.use(usersRouter);
router.use(campusFloorPlansRouter);

export default router;
