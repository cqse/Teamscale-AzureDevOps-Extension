/**
 * Format of branches of a specific project in Teamscale.
 */

export interface ITeamscaleBranchesInfo {
    liveBranches: string[];
    deletedBranches: string[];
    anonymousBranches: string[];
    virtualBranches: string[];
    currentBranchesCount: number;
}
