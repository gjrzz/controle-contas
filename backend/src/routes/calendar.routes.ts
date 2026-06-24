import { Router, Request, Response } from 'express';
import { CalendarService } from '../services/calendar.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const calendarService = new CalendarService();

router.use(authenticate);

// GET /api/calendar?month=6&year=2026&companyId=xxx&serviceTypeId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const companyId = req.query.companyId as string | undefined;
    const serviceTypeId = req.query.serviceTypeId as string | undefined;

    const filters = { month, year, companyId, serviceTypeId };

    const [events, summary] = await Promise.all([
      calendarService.getMonthEvents(filters),
      calendarService.getMonthSummary(filters),
    ]);

    res.json({ events, summary, month, year });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

export default router;
