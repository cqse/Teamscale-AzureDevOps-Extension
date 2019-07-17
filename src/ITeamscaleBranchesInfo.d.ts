/**
 * Format of branches of a specific project in Teamscale.
 */

export interface ITeamscaleBranchesInfo {
    mainBranchName: string;
    branchNames: string[];
    deletedBranches: string[];
    anonymousBranches: string[];
    aliases: any;

}
