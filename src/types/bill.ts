export interface FriendBillDetail {
  friendId: string;
  name: string;
  consumedItems: {
    name: string;
    price: number;
    splitPrice: number;
  }[];
  baseAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentStatus: 'pendiente' | 'pagado';
}

export interface BillConsumedItem {
  name: string;
  price: number;
  splitPrice: number;
  status: 'Sin Asignar' | 'Asignado';
}

export interface SavedBill {
  id?: string;
  userId: string;
  restaurantName: string;
  generalDiscount: number;
  grandTotal: number;
  tipPercentage: number;
  grandTotalTip: number;
  friends: FriendBillDetail[];
  consumedItems?: BillConsumedItem[];
  isActive?: boolean;
  createdAt?: any;
}
