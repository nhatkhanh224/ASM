export interface Goal {
  _id: string;
  name: string;
  userId: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string; // Ngày mục tiêu
  note?: string;
  createdAt: string;
  updatedAt: string;
}
