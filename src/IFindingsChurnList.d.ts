/**
 * Format of Teamscale finding churn lists.
 */

export interface IFindingsChurnList {
    commit: any;
    addedFindings: any[];
    findingsAddedInBranch: any[];
    findingsInChangedCode: any[];
    removedFindings: any[];
    findingsRemovedInBranch: any[];
}
