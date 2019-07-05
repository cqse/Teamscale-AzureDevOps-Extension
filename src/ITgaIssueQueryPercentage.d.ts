/**
 * Format of Teamscale TGA issue query percentage object.
 */

export interface ITgaIssueQueryPercentage {
    issueIdToStatistics: any;
    summary: {
        testGapRatio: number;
        untestedAddedMethodsRatio: number;
        untestedChangedMethodsRatio: number;
        numberOfTestGaps: number;
        numberOfChangedMethods: number;
    };
}
