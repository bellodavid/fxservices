import { ForexRate, RateWithSpread } from './types';
import { SPREAD_CONFIG } from './constants';

export function calculateCrossRateWithSpread(
  rates: ForexRate['rates'],
  fromCurrency: string,
  toCurrency: string
): RateWithSpread | null {
  try {
    if (rates[fromCurrency] && rates[toCurrency]) {
      const buyRate = rates[toCurrency].buyRate / rates[fromCurrency].sellRate;
      const sellRate = rates[toCurrency].sellRate / rates[fromCurrency].buyRate;
      const spread = sellRate - buyRate;
      const bananaCrystalRate = (buyRate + sellRate) / 2;

      return {
        source: "",
        buyRate,
        sellRate,
        spread,
        bananaCrystalRate,
      };
    }
    return null;
  } catch (error) {
    console.error("Error calculating cross rate with spread:", error);
    return null;
  }
}

export function removeOutliersWithSpread(rates: RateWithSpread[]): RateWithSpread[] {
  if (rates.length <= 2) return rates;

  const buyRateValues = rates.map((r) => r.buyRate);
  const sellRateValues = rates.map((r) => r.sellRate);

  const buyRateMean = calculateMean(buyRateValues);
  const sellRateMean = calculateMean(sellRateValues);

  const buyRateStdDev = calculateStandardDeviation(buyRateValues, buyRateMean);
  const sellRateStdDev = calculateStandardDeviation(sellRateValues, sellRateMean);

  return rates.filter(
    (rate) =>
      Math.abs(rate.buyRate - buyRateMean) <= 2 * buyRateStdDev &&
      Math.abs(rate.sellRate - sellRateMean) <= 2 * sellRateStdDev
  );
}

export function calculateMean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function calculateStandardDeviation(values: number[], mean: number): number {
  return Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );
}

export function calculateSpread(baseRate: number): {
  buyRate: number;
  sellRate: number;
} {
  // Adjust spread based on the magnitude of the rate
  // For currencies with 4 significant digits (like JPY), we need a larger spread
  let spreadPips = SPREAD_CONFIG.DEFAULT_SPREAD_PIPS;
  
  // For smaller rates (higher value currencies), increase the spread
  if (baseRate < 0.01) {
    spreadPips = 10; // Higher spread for very small rates
  } else if (baseRate < 0.1) {
    spreadPips = 7.5; // Higher spread for small rates
  } else if (baseRate < 1) {
    spreadPips = 5; // Medium spread for medium rates
  } else if (baseRate > 100) {
    spreadPips = 15; // Higher spread for very large rates (like JPY)
  }
  
  const halfSpread = spreadPips / 10000 / 2;
  
  // Calculate buy and sell rates
  const buyRate = baseRate * (1 - halfSpread);
  const sellRate = baseRate * (1 + halfSpread);
  
  // Ensure minimum spread for very small values
  const minSpreadValue = Math.max(0.00001, baseRate * 0.001);
  
  // If the spread is too small, adjust it
  if (sellRate - buyRate < minSpreadValue) {
    return {
      buyRate: baseRate * 0.9995, // 0.05% below base
      sellRate: baseRate * 1.0005, // 0.05% above base
    };
  }
  
  return {
    buyRate,
    sellRate,
  };
}

export function formatRate(rate: number): number {
  return Number(rate.toFixed(6));
}

export function calculateConfidenceScore(
  standardDeviation: number,
  mean: number
): number {
  return Number(
    Math.min(100, (1 - standardDeviation / mean) * 100).toFixed(2)
  );
}

export function calculateVolatilityIndex(
  standardDeviation: number,
  mean: number
): number {
  return Number(((standardDeviation / mean) * 100).toFixed(2));
}

export function isValidCurrencyPair(fromCurrency: string, toCurrency: string): boolean {
  return (
    typeof fromCurrency === 'string' &&
    typeof toCurrency === 'string' &&
    fromCurrency.length === 3 &&
    toCurrency.length === 3
  );
}

export function handleApiError(error: unknown, source: string): void {
  if (error instanceof Error) {
    console.error(`Error fetching from ${source}:`, error.message);
  } else {
    console.error(`Unknown error from ${source}:`, error);
  }
}
