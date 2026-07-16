export interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  coverImage: string;
  categories: TicketCategoryData[];
  createdAt: string;
}

export interface TicketCategoryData {
  id: string;
  eventId: string;
  name: string;
  price: number;
  soldQuantity: number;
}

export interface OrderData {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  momoTransactionId: string;
  totalAmount: number;
  status: string;
  tickets: TicketData[];
  createdAt: string;
}

export interface TicketData {
  id: string;
  orderId: string;
  categoryId: string;
  categoryName: string;
  secureToken: string;
  isUsed: boolean;
  usedAt: string | null;
}

export interface CartItem {
  categoryId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface EventSummary {
  id: string;
  title: string;
  date: string;
  location: string;
  totalTickets: number;
  validatedOrders: number;
}

export interface DashboardData {
  pendingOrders: OrderData[];
  validatedOrders: OrderData[];
  totalRevenue: number;
  totalTicketsSold: number;
  categoriesStats: { name: string; sold: number; revenue: number }[];
  eventCount: number;
  events: EventSummary[];
}

export interface VerificationResult {
  status: "SUCCESS" | "ALREADY_USED" | "INVALID";
  message: string;
  buyer?: string;
  category?: string;
  date?: string;
}
