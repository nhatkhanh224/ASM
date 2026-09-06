export interface Debt {
  _id: string;
  name: string;
  userId: string;
  type: 'borrowed' | 'lent'; // 'borrowed' = Đi vay (phải trả), 'lent' = Cho mượn (phải thu)
  amount: number;
  currency: string;
  interestRate?: number; // Lãi suất % năm
  dueDate?: string; // Ngày đáo hạn
  status: 'active' | 'paid';
  note?: string;
  createdAt: string;
  updatedAt: string;
}
