/**
 * Takes a list of probable Teamscale project names that might map to the Azure DevOps project and
 * returns for a given issue ID the first project in the list for that either has test gap information or a
 * findings churn for the given issue.
 */
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from './NotificationUtils';

export enum BadgeType { TestGap, FindingsChurn }

export const NOT_AUTHORIZED_ERROR = 'Not authorized for Teamscale usage. Please log in.';

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
        if (errorCodeSum > 0 && (errorCodeSum % 401 === 0 || errorCodeSum % 403 === 0)) {
            notificationUtils.handleErrorInTeamscaleCommunication({status: 403}, teamscaleClient.url);
            throw new Error(NOT_AUTHORIZED_ERROR);
        }

        notificationUtils.showErrorBanner('None of the configured Teamscale projects (' + projectCandidates.join(',') +
            ') on Server <i>' + teamscaleClient.url + '</i> has valid information for issue ' + issueId + ' (Badge: ' +
            BadgeType[badgeType] + ').');
        return;
    }

    return validProjects[0];
}

/**
 * Loads for each project candidate the existing branches and returns the id of the first project that has the
 * given branches (e.g. source and target branch of a merge request).
 */
export async function getFirstProjectHavingGivenBranches(teamscaleClient: TeamscaleClient, projectCandidates: string[],
                                                         branchesThatShouldExist: string[]) {
    if (projectCandidates.length === 0) {
        throw new Error('No Teamscale Project is configured for this Azure DevOps Project.');
        return;
    }

    let errorMessages: string = '';
    for (const projectCandidate of projectCandidates) {
        try {
            const existingProjectBranches: string[] = await teamscaleClient.retrieveBranchesForProject(projectCandidate);

            if (branchesThatShouldExist.every(branch => existingProjectBranches.indexOf(branch) !== -1)) {
                return projectCandidate;
            }
        } catch (error) {
            if (error && error.status && (error.status === 401 || error.status === 403)) {
                // redirect to login, can not resolve right project
                throw error;
            }

            if (error && error.message) {
                if (errorMessages.length === 0) {
                    errorMessages = 'Logged error messages per project: ';
                }

                errorMessages += `'${projectCandidate}' → '${error.message}'. `;
            }
            // try next (e.g. 404: project not defined on server)
        }
    }

    throw new Error('None of the Teamscale Projects configured in the Azure DevOps Extension has the branches' +
        ' involved in the viewed Pull Request in analysis. ' + errorMessages);
}