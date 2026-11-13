import { queryOptions } from "@tanstack/react-query";
import { get2DHistory, get3DResults, getLive } from "./lottery.functions";

export const liveQuery = queryOptions({ queryKey: ["live"], queryFn: () => getLive() });
export const historyQuery = queryOptions({ queryKey: ["history-2d"], queryFn: () => get2DHistory(), staleTime: 60_000 });
export const threeDQuery = queryOptions({ queryKey: ["results-3d"], queryFn: () => get3DResults(), staleTime: 10 * 60_000 });
