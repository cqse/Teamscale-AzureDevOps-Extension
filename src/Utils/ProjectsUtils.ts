/**
 * Takes a list of probable Teamscale project names that might map to the Azure DevOps project and
 * returns for a given issue ID the first project in the list for that either has test gap information or a
 * findings churn for the given issue.
 */
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from './NotificationUtils';

export enum BadgeType { TestGap, FindingsChurn }

export async function resolveProjectNameByIssueId(teamscaleClient: TeamscaleClient, projectCandidates: string[],
                                                  issueId: number, notificationUtils: NotificationUtils,
                                                  badgeType: BadgeType): Promise<string> {
    if (projectCandidates.length === 0) {
        notificationUtils.showErrorBanner('No Teamscale Project is configured for this Azure DevOps Project (Badge: ' +
            BadgeType[badgeType] + ').');
        return;
    }

    const validProjects: string[] = [];
    let errorCodeSum: number = 0;

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
        } catch (reason) {
            if (reason && reason.status) {
                errorCodeSum += reason.status;
            }
            // try next (e.g. no project defined on server)
        }
    }

    if (validProjects.length === 0) {
        if (errorCodeSum > 0 && errorCodeSum % 403 === 0) {
            notificationUtils.handleErrorInTeamscaleCommunication({status: 403}, teamscaleClient.url);
            return;
        }

        notificationUtils.showErrorBanner('None of the configured Teamscale projects (' + projectCandidates.join(',') +
            ') on Server <i>' + teamscaleClient.url + '</i> has valid information for issue ' + issueId + ' (Badge: ' +
            BadgeType[badgeType] + ').');
        return;
    }

    return validProjects[0];
}
