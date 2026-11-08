import { DebtCalculationMethod, DebtInstallment } from '@/types/debt';

interface GenerateInstallmentsInput {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  firstPaymentDate: string | Date;
  calculationMethod: DebtCalculationMethod;
  currency: string;
}

const roundMoney = (value: number, currency: string) =>
  currency === 'VND' ? Math.round(value) : Math.round(value * 100) / 100;

const addMonthsSafe = (dateValue: string | Date, months: number) => {
  const source = new Date(dateValue);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth() + months;
  const day = source.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), 12));
};

export function generateInstallments({
  principal,
  annualInterestRate,
  termMonths,
  firstPaymentDate,
  calculationMethod,
  currency,
}: GenerateInstallmentsInput): DebtInstallment[] {
  if (!Number.isFinite(principal) || principal <= 0) return [];
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 600) return [];
  const firstDate = new Date(firstPaymentDate);
  if (Number.isNaN(firstDate.getTime())) return [];

  const monthlyRate = calculationMethod === 'no_interest'
    ? 0
    : Math.max(0, annualInterestRate) / 100 / 12;
  const equalPayment = monthlyRate === 0
    ? principal / termMonths
    : principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)
      / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const equalPrincipal = principal / termMonths;
  let remainingPrincipal = principal;

  return Array.from({ length: termMonths }, (_, index) => {
    const interest = calculationMethod === 'no_interest'
      ? 0
      : remainingPrincipal * monthlyRate;
    let principalPart = calculationMethod === 'equal_payment'
      ? equalPayment - interest
      : equalPrincipal;

    if (index === termMonths - 1) principalPart = remainingPrincipal;
    principalPart = roundMoney(Math.max(0, principalPart), currency);
    const interestPart = roundMoney(Math.max(0, interest), currency);
    const totalAmount = roundMoney(principalPart + interestPart, currency);
    remainingPrincipal = Math.max(0, remainingPrincipal - principalPart);

    return {
      id: `${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 9)}`,
      installmentNumber: index + 1,
      dueDate: addMonthsSafe(firstDate, index).toISOString(),
      principalAmount: principalPart,
      interestAmount: interestPart,
      totalAmount,
      paidAmount: 0,
      status: 'pending' as const,
    };
  });
}

export function getDebtScheduleSummary(installments: DebtInstallment[]) {
  const totalPrincipal = installments.reduce((sum, item) => sum + item.principalAmount, 0);
  const totalInterest = installments.reduce((sum, item) => sum + item.interestAmount, 0);
  const totalPayable = installments.reduce((sum, item) => sum + item.totalAmount, 0);
  const paidTotal = installments.reduce((sum, item) => sum + (item.status === 'paid' ? item.paidAmount : 0), 0);
  const remainingPrincipal = installments.reduce(
    (sum, item) => sum + (item.status === 'paid' ? 0 : item.principalAmount),
    0,
  );
  return { totalPrincipal, totalInterest, totalPayable, paidTotal, remainingPrincipal };
}
