/**
 * Takes a list of probable Teamscale project names that might map to the Azure DevOps project and
 * returns for a given issue ID the first project in the list for that either has test gap information or a
 * findings churn for the given issue.
 */
import TeamscaleClient from '../TeamscaleClient';

export enum BadgeType { TestGap, FindingsChurn }

export async function resolveProjectNameByIssueId(teamscaleClient: TeamscaleClient, projectCandidates: string[],
                                                  issueId: number, badgeType: BadgeType): Promise<string> {
    let project = projectCandidates[0];

    if (projectCandidates.length === 1) {
        return project;
    }

    for (const projectCandidate of projectCandidates) {
        if (project === '') {
            project = projectCandidate;
        }

        if (badgeType === BadgeType.TestGap) {
            try {
                const testGapPercentages = await teamscaleClient.retrieveTgaPercentagesForIssue(projectCandidate, issueId.toString());
                if (testGapPercentages.summary && testGapPercentages.summary.numberOfChangedMethods > 0) {
                    project = projectCandidate;
                    break;
                }
            } catch (e) {
                project = '';
                // try next (e.g. no project defined on server)
            }
        } else {
            try {
                const findingsChurnList = await teamscaleClient.retrieveFindingsChurnListForIssue(projectCandidate, issueId.toString());

                if (findingsChurnList.addedFindings && findingsChurnList.addedFindings.length > 0 ||
                    findingsChurnList.findingsInChangedCode && findingsChurnList.findingsInChangedCode.length > 0 ||
                    findingsChurnList.removedFindings && findingsChurnList.removedFindings.length > 0) {
                    project = projectCandidate;
                    break;
                }
            } catch (e) {
                project = '';
                // try next (e.g. no project defined on server)
            }
        }
    }

    if (project === '') {
        throw new Error('Error retrieving any project of ' + projectCandidates.join(','));
    }

    return project;
}
