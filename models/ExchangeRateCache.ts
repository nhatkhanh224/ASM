import { Schema, model, models } from "mongoose";

interface IExchangeRateCache {
  key: string;           // cache key, e.g. "rates" hoặc "rates:TUT,CATWIFMASK"
  rates: Record<string, number>;
  updatedAt: Date;
}

const ExchangeRateCacheSchema = new Schema<IExchangeRateCache>(
  {
    key:       { type: String, required: true, unique: true, index: true },
    rates:     { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const ExchangeRateCache =
  models.ExchangeRateCache ||
  model<IExchangeRateCache>("ExchangeRateCache", ExchangeRateCacheSchema);