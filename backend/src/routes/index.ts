import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import companyRoutes from './company.routes';
import contractRoutes from './contract.routes';
import serviceTypeRoutes from './serviceType.routes';
import invoiceRoutes from './invoice.routes';
import calendarRoutes from './calendar.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/contracts', contractRoutes);
router.use('/service-types', serviceTypeRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/calendar', calendarRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
