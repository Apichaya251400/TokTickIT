import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requireRole, AuthenticatedRequest } from "../middleware/auth.js";
import { getBangkokDayBoundaries } from "../utils/timezone.js";

export const dashboardRouter = Router();

/**
 * 3.1 IT Staff & Administrator Dashboard
 * GET /api/dashboards/staff
 *
 * Provides backend-calculated operational metrics and workload lists for IT Staff & Administrators:
 * - Unassigned open tickets
 * - My assigned open tickets
 * - Actions recorded today (Asia/Bangkok UTC+7 boundary)
 * - Urgent active workload tickets
 * - Recent 5 tickets assigned to current user
 * - Recent 5 actions performed by current user
 */
dashboardRouter.get(
  "/staff",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const prisma = getPrisma();
      const userId = req.user!.id;

      // Calculate Asia/Bangkok (UTC+7) day boundaries for today
      const { startOfDay, startOfNextDay } = getBangkokDayBoundaries();

      // Metric 1: Unassigned Tickets
      // Total open tickets with no owner: ownerId IS NULL AND currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
      const unassignedCountPromise = prisma.ticket.count({
        where: {
          ownerId: null,
          currentStatus: {
            notIn: ["RESOLVED", "CLOSED", "CANCELLED"],
          },
        },
      });

      // Metric 2: My Assigned Tickets
      // Tickets assigned to logged-in user: ownerId = req.user.id AND currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
      const myAssignedCountPromise = prisma.ticket.count({
        where: {
          ownerId: userId,
          currentStatus: {
            notIn: ["RESOLVED", "CLOSED", "CANCELLED"],
          },
        },
      });

      // Metric 3: Today's Actions
      // Actions recorded today by current user: performedById = req.user.id AND createdAt >= startOfDay AND createdAt < startOfNextDay
      const todayActionsCountPromise = prisma.actionTaken.count({
        where: {
          performedById: userId,
          createdAt: {
            gte: startOfDay,
            lt: startOfNextDay,
          },
        },
      });

      // Metric 4: Urgent Workload
      // Urgent tickets needing staff action: itPriority = 'URGENT' AND currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS')
      const urgentWorkloadCountPromise = prisma.ticket.count({
        where: {
          itPriority: "URGENT",
          currentStatus: {
            in: ["NEW", "OPEN", "IN_PROGRESS"],
          },
        },
      });

      // Workload 1: My Recent Tickets
      // Max 5 tickets assigned to current user, ordered by updatedAt DESC, id ASC
      const myRecentTicketsPromise = prisma.ticket.findMany({
        where: {
          ownerId: userId,
        },
        orderBy: [
          { updatedAt: "desc" },
          { id: "asc" },
        ],
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          requestedPriority: true,
          itPriority: true,
          updatedAt: true,
        },
      });

      // Workload 2: Current Staff Actions
      // Max 5 actions performed by current user, ordered by createdAt DESC, id ASC
      const currentStaffActionsPromise = prisma.actionTaken.findMany({
        where: {
          performedById: userId,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "asc" },
        ],
        take: 5,
        select: {
          id: true,
          ticketId: true,
          description: true,
          result: true,
          createdAt: true,
          ticket: {
            select: {
              ticketNumber: true,
            },
          },
        },
      });

      const [
        unassignedCount,
        myAssignedCount,
        todayActionsCount,
        urgentWorkloadCount,
        myRecentTickets,
        currentStaffActionsRaw,
      ] = await Promise.all([
        unassignedCountPromise,
        myAssignedCountPromise,
        todayActionsCountPromise,
        urgentWorkloadCountPromise,
        myRecentTicketsPromise,
        currentStaffActionsPromise,
      ]);

      const currentStaffActions = currentStaffActionsRaw.map((action) => ({
        id: action.id,
        ticketId: action.ticketId,
        ticketNumber: action.ticket.ticketNumber,
        description: action.description,
        result: action.result,
        createdAt: action.createdAt.toISOString(),
      }));

      const formattedTickets = myRecentTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        currentStatus: t.currentStatus,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        updatedAt: t.updatedAt.toISOString(),
      }));

      res.status(200).json({
        metrics: {
          unassignedCount,
          myAssignedCount,
          todayActionsCount,
          urgentWorkloadCount,
        },
        myRecentTickets: formattedTickets,
        currentStaffActions,
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve staff dashboard data.",
        },
      });
    }
  }
);
