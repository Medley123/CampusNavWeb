import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import buildingsRouter from "./buildings.js";
import usersRouter from "./users.js";
import adminAuthRouter from "./admin-auth.js";
import adminAccountsRouter from "./admin-accounts.js";
import campusFloorPlansRouter from "./campus-floor-plans.js";
import appContentRouter from "./app-content.js";
import adminChatRouter from "./admin-chat.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminAuthRouter);
router.use(adminAccountsRouter);
router.use(buildingsRouter);
router.use(usersRouter);
router.use(campusFloorPlansRouter);
router.use(appContentRouter);
router.use(adminChatRouter);

export default router;
