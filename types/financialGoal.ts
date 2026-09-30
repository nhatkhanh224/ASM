export interface FinancialGoal {
  _id: string;
  name: string;
  userId: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string; // Ngày mục tiêu
  note?: string;
  linkAllAssets?: boolean;
  linkedAssetIds?: string[];
  createdAt: string;
  updatedAt: string;
}
