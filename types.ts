
export type TicketStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Ticket {
  id: string;
  model: string;
  ngId: string;
  station: string;
  techType: string;
  status: TicketStatus;
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  technicianName?: string;
  actionTaken?: string;
}

export interface MachineStats {
  totalDowntime: number;
  averageResponseTime: number;
  ticketCount: number;
}
