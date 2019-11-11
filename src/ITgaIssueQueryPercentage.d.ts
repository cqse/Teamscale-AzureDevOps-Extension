/**
 * Format of Teamscale TGA issue query percentage object.
 */
import { ITgaSummary } from './ITgaSummary';

export interface ITgaIssueQueryPercentage {
    issueIdToStatistics: any;
    summary: ITgaSummary;
}
