export interface GoalTask {
  id: string;
  title: string;
  amount: number;
  currency?: "VND" | "USD";
  completed: boolean;
}

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
  tasks?: GoalTask[];
  createdAt: string;
  updatedAt: string;
}
