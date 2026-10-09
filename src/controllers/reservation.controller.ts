import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getReservations = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const reservations = await prisma.reservation.findMany({
    where: { tenantId },
    include: {
      tenant: { select: { name: true } },
      branch: { select: { name: true, code: true } },
      table: { select: { code: true, name: true } },
    },
    orderBy: { reservationAt: 'desc' },
  });
  res.json(reservations);
};

export const createReservation = async (req: Request, res: Response) => {
  const { tenantId, branchId, tableId, customerName, phone, guestsCount, reservationAt } = req.body;
  const reservation = await prisma.reservation.create({
    data: {
      tenantId,
      branchId,
      tableId,
      customerName,
      phone,
      guestsCount: guestsCount || 2,
      reservationAt: reservationAt ? new Date(reservationAt) : new Date(),
      status: 'PENDING',
    },
    include: {
      tenant: { select: { name: true } },
      branch: { select: { name: true, code: true } },
      table: { select: { code: true, name: true } },
    },
  });
  res.status(201).json(reservation);
};

export const updateReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status, note },
    include: {
      tenant: { select: { name: true } },
      branch: { select: { name: true, code: true } },
      table: { select: { code: true, name: true } },
    },
  });
  res.json(reservation);
};

export const deleteReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.reservation.delete({ where: { id } });
  res.json({ deleted: true });
};