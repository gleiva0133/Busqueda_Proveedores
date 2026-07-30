import { MatchedResultItem, CategoryReassignment, ItemReassignment, WorkloadBalance } from '../types';

export function calculateReassignment(matchedItems: MatchedResultItem[]): {
  categoryReassignments: CategoryReassignment[];
  itemReassignments: ItemReassignment[];
  workloadBalance: WorkloadBalance[];
} {
  if (!matchedItems || matchedItems.length === 0) {
    return { categoryReassignments: [], itemReassignments: [], workloadBalance: [] };
  }

  // Count items and average delays per Category and Buyer
  const categoryBuyerStats: Record<string, Record<string, { count: number; totalDelay: number }>> = {};
  const totalCategoryItems: Record<string, number> = {};
  const allBuyersSet = new Set<string>();

  matchedItems.forEach(item => {
    const cat = item.categoria;
    const buyer = item.comprador || 'Sin asignar';
    allBuyersSet.add(buyer);

    totalCategoryItems[cat] = (totalCategoryItems[cat] || 0) + 1;

    if (!categoryBuyerStats[cat]) categoryBuyerStats[cat] = {};
    if (!categoryBuyerStats[cat][buyer]) categoryBuyerStats[cat][buyer] = { count: 0, totalDelay: 0 };

    categoryBuyerStats[cat][buyer].count += 1;
    if (item.retrasoDias && item.retrasoDias > 0) {
      categoryBuyerStats[cat][buyer].totalDelay += item.retrasoDias;
    }
  });

  const buyersList = Array.from(allBuyersSet).sort();

  // Sort categories by total size descending
  const sortedCategories = Object.keys(totalCategoryItems).sort(
    (a, b) => totalCategoryItems[b] - totalCategoryItems[a]
  );

  const currentWorkload: Record<string, number> = {};
  buyersList.forEach(b => (currentWorkload[b] = 0));

  const categoryOwners: Record<string, string> = {};
  const categoryReassignments: CategoryReassignment[] = [];

  // Assign category owners to balance total items
  sortedCategories.forEach(cat => {
    const groupSize = totalCategoryItems[cat];

    // Rank buyers by: 1) Lowest current total workload, 2) Most existing items in this category, 3) Higher avg delay
    const rankedBuyers = [...buyersList].sort((b1, b2) => {
      if (currentWorkload[b1] !== currentWorkload[b2]) {
        return currentWorkload[b1] - currentWorkload[b2]; // Lowest current load first
      }

      const count1 = categoryBuyerStats[cat]?.[b1]?.count || 0;
      const count2 = categoryBuyerStats[cat]?.[b2]?.count || 0;
      if (count1 !== count2) {
        return count2 - count1; // More items in category preferred
      }

      const delay1 = count1 > 0 ? (categoryBuyerStats[cat][b1].totalDelay / count1) : 0;
      const delay2 = count2 > 0 ? (categoryBuyerStats[cat][b2].totalDelay / count2) : 0;
      return delay2 - delay1;
    });

    const chosenOwner = rankedBuyers[0] || 'Sin asignar';
    categoryOwners[cat] = chosenOwner;
    currentWorkload[chosenOwner] += groupSize;

    const existingCount = categoryBuyerStats[cat]?.[chosenOwner]?.count || 0;
    const existingDelay = existingCount > 0 ? (categoryBuyerStats[cat][chosenOwner].totalDelay / existingCount) : null;

    categoryReassignments.push({
      categoria: cat,
      compradorAsignado: chosenOwner,
      itemsPreviosEnCategoria: existingCount,
      retrasoPromedioOwner: existingDelay ? Math.round(existingDelay * 10) / 10 : null,
      totalItemsCategoria: groupSize
    });
  });

  // Calculate item-level reassignments
  const itemReassignments: ItemReassignment[] = matchedItems.map(item => {
    const newBuyer = categoryOwners[item.categoria] || item.comprador;
    return {
      numItem: item.numItem,
      categoria: item.categoria,
      material: item.material,
      compradorOriginal: item.comprador,
      compradorReasignado: newBuyer,
      cambioComprador: item.comprador !== newBuyer,
      retrasoDias: item.retrasoDias
    };
  });

  // Calculate Workload balance before vs after
  const beforeCounts: Record<string, number> = {};
  const afterCounts: Record<string, number> = {};

  buyersList.forEach(b => {
    beforeCounts[b] = 0;
    afterCounts[b] = 0;
  });

  itemReassignments.forEach(ir => {
    if (ir.compradorOriginal && beforeCounts[ir.compradorOriginal] !== undefined) {
      beforeCounts[ir.compradorOriginal] += 1;
    }
    if (ir.compradorReasignado && afterCounts[ir.compradorReasignado] !== undefined) {
      afterCounts[ir.compradorReasignado] += 1;
    }
  });

  const workloadBalance: WorkloadBalance[] = buyersList.map(b => ({
    comprador: b,
    itemsAntes: beforeCounts[b] || 0,
    itemsDespues: afterCounts[b] || 0,
    diferencia: (afterCounts[b] || 0) - (beforeCounts[b] || 0)
  }));

  return { categoryReassignments, itemReassignments, workloadBalance };
}
