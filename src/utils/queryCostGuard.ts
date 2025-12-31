import { env } from '../config/env.js';

export interface QueryCostResult {
  allowed: boolean;
  cost: number;
  maxCost: number;
}

export function calculateQueryCost(filters: any): number {
  let cost = 0;

  if (!filters) {
    return cost;
  }

  const countFilters = (obj: any): void => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      
      if (value !== null && value !== undefined) {
        cost++;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          countFilters(value);
        } else if (Array.isArray(value)) {
          cost += value.length - 1;
        }
      }
    });
  };

  countFilters(filters);

  return cost;
}

export function validateQueryCost(filters: any): QueryCostResult {
  const cost = calculateQueryCost(filters);
  const maxCost = env.MAX_QUERY_COST || 30;

  return {
    allowed: cost <= maxCost,
    cost,
    maxCost,
  };
}
