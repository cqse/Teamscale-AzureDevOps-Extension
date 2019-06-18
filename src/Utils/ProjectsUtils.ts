/**
 * Takes a list of probable Teamscale project names that might map to the Azure DevOps project and
 * returns for a given issue ID the first project in the list for that either has test gap information or a
 * findings churn for the given issue.
 */
import TeamscaleClient from '../TeamscaleClient';

export enum BadgeType { TestGap, FindingsChurn }

export async function resolveProjectNameByIssueId(teamscaleClient: TeamscaleClient, projectCandidates: string[],
                                                  issueId: number, badgeType: BadgeType): Promise<string> {
    if (projectCandidates.length === 0) {
        throw new Error('No Teamscale Project is configured for this Azure DevOps Project.');
    }

    const validProjects: string[] = [];

    for (const projectCandidate of projectCandidates) {
        try {
            if (badgeType === BadgeType.TestGap) {
                const testGapPercentages = await teamscaleClient.retrieveTgaPercentagesForIssue(projectCandidate, issueId.toString());

                if (testGapPercentages.summary && testGapPercentages.summary.numberOfChangedMethods > 0) {
                    return projectCandidate;
                }
            } else {
                const findingsChurnList = await teamscaleClient.retrieveFindingsChurnListForIssue(projectCandidate, issueId.toString());

                if (findingsChurnList.addedFindings && findingsChurnList.addedFindings.length > 0 ||
                    findingsChurnList.findingsInChangedCode && findingsChurnList.findingsInChangedCode.length > 0 ||
                    findingsChurnList.removedFindings && findingsChurnList.removedFindings.length > 0) {
                    return projectCandidate;
                }
            }

            validProjects.push(projectCandidate);
        } catch (e) {
            // try next (e.g. no project defined on server)
        }
    }

    if (validProjects.length === 0) {
        throw new Error('None of the configured Teamscale projects (' + projectCandidates.join(',') + ') has valid' +
            ' information for issue ' + issueId + '.');
    }

    return validProjects[0];
}
