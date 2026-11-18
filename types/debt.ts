export type DebtType = 'borrowed' | 'lent';
export type RepaymentMode = 'single' | 'installment' | 'interest_only';
export type DebtCalculationMethod = 'equal_payment' | 'equal_principal' | 'no_interest';

export interface DebtInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  note?: string;
}

export interface Debt {
  _id: string;
  name: string;
  userId: string;
  type: DebtType; // 'borrowed' = Đi vay (phải trả), 'lent' = Cho mượn (phải thu)
  amount: number;
  currency: string;
  interestRate?: number; // Lãi suất % năm
  dueDate?: string; // Ngày đáo hạn
  status: 'active' | 'paid';
  repaymentMode?: RepaymentMode;
  calculationMethod?: DebtCalculationMethod;
  firstPaymentDate?: string;
  termMonths?: number;
  installments?: DebtInstallment[];
  purpose?: 'general' | 'investment';
  linkedAssetId?: string;
  linkedAssetName?: string;
  interestRateUnit?: 'annual' | 'monthly';
  investmentFee?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
