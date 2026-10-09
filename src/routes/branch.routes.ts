import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const branchRouter = Router();

branchRouter.use(authMiddleware);
branchRouter.get('/', BranchController.getBranches);
branchRouter.post('/', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.createBranch);
branchRouter.get('/:id/export', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.exportBranchData);
branchRouter.delete('/:id', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.deleteBranch);

export default branchRouter;

