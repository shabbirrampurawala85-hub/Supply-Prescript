import {
  ActionOptionName,
  PrescribedAction,
  PrescribeResponse,
  CalibratedCostFactors
} from '../src/types/supplyChain.js';

interface ActionDefinition {
  action: ActionOptionName;
  baseCost: number;
  maxDaysReduced: number;
  description: string;
}

const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    action: 'Air_Freight',
    baseCost: 15000,
    maxDaysReduced: 14,
    description: 'Reroute shipment via expedited chartered Air Freight'
  },
  {
    action: 'Secondary_Supplier',
    baseCost: 8000,
    maxDaysReduced: 8,
    description: 'Procure allocation from secondary regional supplier at contractual premium'
  },
  {
    action: 'Production_Rescheduling',
    baseCost: 3000,
    maxDaysReduced: 4,
    description: 'Adjust assembly line sequence & absorb buffer via overtime labor'
  },
  {
    action: 'Launch_Delay',
    baseCost: 0,
    maxDaysReduced: 0,
    description: 'Accept delay and shift final launch date ($1,200/day commercial penalty)'
  }
];

const PENALTY_PER_DAY = 1200;

export function solveSupplyPrescript(
  predictedDelayDays: number,
  maxBudget: number = 20000,
  calibrationFactors?: CalibratedCostFactors
): PrescribeResponse {
  const factors = calibrationFactors || {
    Air_Freight: 1.0,
    Secondary_Supplier: 1.0,
    Production_Rescheduling: 1.0,
    Launch_Delay: 1.0,
    last_updated: ''
  };

  // 1. Calculate calibrated costs and effective days reduced
  const evaluatedActions: (ActionDefinition & { effectiveCost: number; effectiveDaysReduced: number })[] =
    ACTION_DEFINITIONS.map((def) => {
      const factor = factors[def.action] || 1.0;
      const effectiveCost = Math.round(def.baseCost * factor);
      const effectiveDaysReduced = Math.min(def.maxDaysReduced, predictedDelayDays);
      return {
        ...def,
        effectiveCost,
        effectiveDaysReduced
      };
    });

  // Action maps for easy lookup
  const actMap: Record<string, typeof evaluatedActions[0]> = {};
  evaluatedActions.forEach((a) => {
    actMap[a.action] = a;
  });

  // 2. Binary optimization combinations satisfying:
  // - Capacity constraint: Air_Freight + Secondary_Supplier <= 1
  // - Hard budget limit: total_action_cost <= max_budget
  // Combinations of (AF, SS, PR)
  interface Candidate {
    actions: ActionOptionName[];
    actionCost: number;
    daysReduced: number;
    remainingDelay: number;
    penaltyCost: number;
    totalImpact: number;
  }

  const candidates: Candidate[] = [];

  // Possible subsets of actions (Air_Freight or Secondary_Supplier or Neither) x (Production_Rescheduling on or off)
  const transportOptions: (ActionOptionName | null)[] = [null, 'Air_Freight', 'Secondary_Supplier'];
  const rescheduleOptions: boolean[] = [false, true];

  for (const transport of transportOptions) {
    for (const reschedule of rescheduleOptions) {
      const chosenActions: ActionOptionName[] = [];
      let actionCost = 0;
      let daysReduced = 0;

      if (transport) {
        chosenActions.push(transport);
        actionCost += actMap[transport].effectiveCost;
        daysReduced += actMap[transport].effectiveDaysReduced;
      }

      if (reschedule) {
        chosenActions.push('Production_Rescheduling');
        actionCost += actMap['Production_Rescheduling'].effectiveCost;
        daysReduced += actMap['Production_Rescheduling'].effectiveDaysReduced;
      }

      // If nothing selected, it implicitly represents accepting launch delay
      if (chosenActions.length === 0) {
        chosenActions.push('Launch_Delay');
      }

      // Hard budget check
      if (actionCost <= maxBudget) {
        // days reduced capped at predictedDelayDays
        const effectiveReduction = Math.min(predictedDelayDays, daysReduced);
        const remainingDelay = Math.max(0, predictedDelayDays - effectiveReduction);
        const penaltyCost = remainingDelay * PENALTY_PER_DAY;
        const totalImpact = actionCost + penaltyCost;

        candidates.push({
          actions: chosenActions,
          actionCost,
          daysReduced: effectiveReduction,
          remainingDelay,
          penaltyCost,
          totalImpact
        });
      }
    }
  }

  // Sort candidates by total business impact (LP minimization objective)
  candidates.sort((a, b) => a.totalImpact - b.totalImpact);

  const bestCandidate = candidates[0] || {
    actions: ['Launch_Delay'],
    actionCost: 0,
    daysReduced: 0,
    remainingDelay: predictedDelayDays,
    penaltyCost: predictedDelayDays * PENALTY_PER_DAY,
    totalImpact: predictedDelayDays * PENALTY_PER_DAY
  };

  const selected_actions: PrescribedAction[] = bestCandidate.actions.map((act) => {
    const item = actMap[act];
    return {
      action: act,
      cost: item.baseCost,
      calibrated_cost: item.effectiveCost,
      days_reduced: item.effectiveDaysReduced,
      description: item.description
    };
  });

  // Construct Prescribed Strategic Alternatives (A, B, C)
  const baselineCost = predictedDelayDays * PENALTY_PER_DAY;

  // Option A: Expedited Air Freight (Speed First)
  const optACost = actMap['Air_Freight'].effectiveCost;
  const optADaysSaved = actMap['Air_Freight'].effectiveDaysReduced;
  const optARemain = Math.max(0, predictedDelayDays - optADaysSaved);
  const optAImpact = optACost + optARemain * PENALTY_PER_DAY;

  // Option B: Secondary Regional Supplier (Balanced Cost/Speed)
  const optBCost = actMap['Secondary_Supplier'].effectiveCost;
  const optBDaysSaved = actMap['Secondary_Supplier'].effectiveDaysReduced;
  const optBRemain = Math.max(0, predictedDelayDays - optBDaysSaved);
  const optBImpact = optBCost + optBRemain * PENALTY_PER_DAY;

  // Option C: Production Reschedule + Launch Delay Buffer (Capital Preservation)
  const optCCost = actMap['Production_Rescheduling'].effectiveCost;
  const optCDaysSaved = actMap['Production_Rescheduling'].effectiveDaysReduced;
  const optCRemain = Math.max(0, predictedDelayDays - optCDaysSaved);
  const optCImpact = optCCost + optCRemain * PENALTY_PER_DAY;

  const isBestA = bestCandidate.actions.includes('Air_Freight');
  const isBestB = bestCandidate.actions.includes('Secondary_Supplier');
  const isBestC = !isBestA && !isBestB;

  return {
    shipment_id: '',
    status: candidates.length > 0 ? 'OPTIMAL' : 'INFEASIBLE',
    max_budget: maxBudget,
    predicted_delay_days: predictedDelayDays,
    selected_actions,
    total_action_cost: bestCandidate.actionCost,
    days_saved: bestCandidate.daysReduced,
    remaining_delay_days: bestCandidate.remainingDelay,
    total_business_impact: bestCandidate.totalImpact,
    calibrated_factors_applied: {
      Air_Freight: factors.Air_Freight,
      Secondary_Supplier: factors.Secondary_Supplier,
      Production_Rescheduling: factors.Production_Rescheduling,
      Launch_Delay: factors.Launch_Delay
    },
    alternatives: [
      {
        id: 'A',
        name: 'Expedited Air Freight',
        description: 'Bypasses container ports via direct chartered air freight cargo.',
        action: 'Air_Freight',
        estimated_cost: optACost,
        days_saved: optADaysSaved,
        remaining_delay: optARemain,
        speed_rating: 'Fastest (0 days delay)',
        cost_rating: optACost > maxBudget ? 'Exceeds Budget' : 'High CapEx',
        roi_score: Math.round(((baselineCost - optAImpact) / (optACost || 1)) * 100),
        recommended: isBestA && optACost <= maxBudget
      },
      {
        id: 'B',
        name: 'Secondary Supplier Procurement',
        description: 'Secures redundant manufacturing lot with regional freight routing.',
        action: 'Secondary_Supplier',
        estimated_cost: optBCost,
        days_saved: optBDaysSaved,
        remaining_delay: optBRemain,
        speed_rating: 'Moderate (+6-8 days saved)',
        cost_rating: 'Medium CapEx',
        roi_score: Math.round(((baselineCost - optBImpact) / (optBCost || 1)) * 100),
        recommended: isBestB && optBCost <= maxBudget
      },
      {
        id: 'C',
        name: 'Assembly Reschedule & Buffer Launch',
        description: 'Shift shop-floor cell priority to preserve working capital and accept minor delay.',
        action: 'Production_Rescheduling',
        estimated_cost: optCCost,
        days_saved: optCDaysSaved,
        remaining_delay: optCRemain,
        speed_rating: 'Low (+4 days saved)',
        cost_rating: 'Low CapEx',
        roi_score: Math.round(((baselineCost - optCImpact) / (optCCost || 1)) * 100),
        recommended: isBestC
      }
    ]
  };
}
