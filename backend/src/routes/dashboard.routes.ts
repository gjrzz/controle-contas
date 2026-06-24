import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const dashboardService = new DashboardService();

router.use(authenticate);

function getFilters(req: Request) {
  const now = new Date();
  return {
    startDate: (req.query.startDate as string) || new Date(now.getFullYear(), 0, 1).toISOString(),
    endDate: (req.query.endDate as string) || new Date(now.getFullYear(), 11, 31).toISOString(),
    companyId: req.query.companyId as string | undefined,
    serviceTypeId: req.query.serviceTypeId as string | undefined,
  };
}

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getSummary(getFilters(req));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/monthly-evolution', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getMonthlyEvolution(getFilters(req));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-service-type', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getByServiceType(getFilters(req));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-company', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getByCompany(getFilters(req));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stacked-evolution', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getStackedEvolution(getFilters(req));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/top-invoices', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getTopInvoices(getFilters(req));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
