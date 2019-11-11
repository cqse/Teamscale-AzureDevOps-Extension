/**
 * Format of Teamscale TGA summary object.
 */

export interface ITgaSummary {
    testGapRatio: number;
    untestedAddedMethodsRatio: number;
    untestedChangedMethodsRatio: number;
    numberOfTestGaps: number;
    numberOfChangedMethods: number;
}
