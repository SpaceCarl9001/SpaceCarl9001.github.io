// Shared world constants (metres).
export const ROAD_HALF = 6;      // half the road width
export const LANE = 3;           // we drive in the right-hand lane
export const EYE = 1.45;         // driver eye height
// Total road distance from the start line to the last stop. It stays fixed: stops are spread
// evenly across it, so adding a stop brings them closer together instead of lengthening the drive.
// (1960 m = 14 gaps of 140 m, the length of the route before AuxPulse was added.)
export const ROUTE_LENGTH = 1960;
export const SIDE = 13;          // billboard distance from the road centre
export const SEG = 110;          // distance between road control points
export const ORIGIN = SEG * 2;   // straight run-up behind the start line
export const SEA_LEVEL = -1.2;   // water height on the coastal stretch
