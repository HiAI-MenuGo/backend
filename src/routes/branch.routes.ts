import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const branchRouter = Router();

branchRouter.use(authMiddleware, enforceTenantIsolation);
branchRouter.get('/', BranchController.getBranches);
branchRouter.post('/', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.createBranch);
branchRouter.patch('/:id', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.updateBranch);
branchRouter.put('/:id', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.updateBranch);
branchRouter.get('/:id/export', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.exportBranchData);
branchRouter.delete('/:id', requireRole(['ADMIN', 'PLATFORM_ADMIN']), BranchController.deleteBranch);

export default branchRouter;

