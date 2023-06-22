/**
 * Takes a list of probable Teamscale project names that might map to the Azure DevOps project and
 * returns for a given issue ID the first project in the list for that either has test gap information or a
 * findings churn for the given issue.
 */
import { ITgaSummary } from '../ITgaSummary';
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from './NotificationUtils';

export enum BadgeType { TestGap, FindingsChurn, TestSmell }

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
        let hasFindings: boolean = false;
        try {
            if (badgeType === BadgeType.TestGap) {
                hasFindings = await hasTestGapFindings(teamscaleClient, projectCandidate, issueId);
            }
            else if (badgeType === BadgeType.TestSmell) {
                hasFindings = await hasTestSmellFindings(teamscaleClient, projectCandidate, issueId);
            } 
            else {
                hasFindings = await hasFindingsChurn(teamscaleClient, projectCandidate, issueId);  
            }
            
            if (hasFindings) {
                return projectCandidate;
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
 * Returns true if the client returns test gap for the given project candidate and issue id.
 */
async function hasTestGapFindings(teamscaleClient: TeamscaleClient, projectCandidate: string, issueId: number): Promise<boolean> {
    const testGapSummary: ITgaSummary = await getTestGapSummary(teamscaleClient, projectCandidate, issueId);

    return testGapSummary && testGapSummary.numberOfChangedMethods > 0;
}

/**
 * Returns true if the client returns test smell findings for the given project candidate and issue id.
 */
async function hasTestSmellFindings(teamscaleClient: TeamscaleClient, projectCandidate: string, issueId: number): Promise<boolean> {
    let connectorId: string = await retrieveRequirementsConnectorId(teamscaleClient, projectCandidate);
    
    const testSmellSummary = await teamscaleClient.retrieveFindingsChurnListForSpecItem(projectCandidate, connectorId, issueId.toString());
    
    return testSmellSummary.addedFindings && testSmellSummary.addedFindings.length > 0 ||
        testSmellSummary.findingsInChangedCode && testSmellSummary.findingsInChangedCode.length > 0 ||
        testSmellSummary.removedFindings && testSmellSummary.removedFindings.length > 0;
}


/**
 * Returns true if the client returns findings churn for the given project candidate and issue id.
 */
async function hasFindingsChurn(teamscaleClient: TeamscaleClient, projectCandidate: string, issueId: number): Promise<boolean> {
    const findingsChurnList = await teamscaleClient.retrieveFindingsChurnListForIssue(projectCandidate, issueId.toString());
    
    return findingsChurnList.addedFindings && findingsChurnList.addedFindings.length > 0 ||
        findingsChurnList.findingsInChangedCode && findingsChurnList.findingsInChangedCode.length > 0 ||
        findingsChurnList.removedFindings && findingsChurnList.removedFindings.length > 0;
}
/**
 * Returns the connector Id of the given project.
 */
export async function retrieveRequirementsConnectorId(teamscaleClient: TeamscaleClient, projectCandidate: string) {
    let connectorId: string = '';
    const projectConnectorList = await teamscaleClient.retrieveProjectConnectorList();
    if (projectConnectorList.hasOwnProperty(projectCandidate)) {
        for (const projectConnector of projectConnectorList[projectCandidate]) {
            if (projectConnector.type !== 'Azure DevOps Boards as Requirement Management Tool') {
                continue;
            }
            connectorId = projectConnector.options['Requirements Connector identifier'];
        }
    }
    return connectorId;
}

/**
 * Wrapper (needed since API changed with TS 5.5) method to get the Test Gap summary for an issue; tries both API calls.
 */
async function getTestGapSummary(teamscaleClient: TeamscaleClient, projectCandidate, issueId: number): Promise<ITgaSummary> {
    try {
        return await teamscaleClient.retrieveTgaSummaryForIssue(projectCandidate, issueId.toString());
    } catch (reason) {
        if (reason && reason.status && reason.status === 404) {
            // reason for 404 can be a non-existing project or Teamscale API with version < 5.5
            return (await teamscaleClient.retrieveTgaPercentagesForIssue(projectCandidate, issueId.toString())).summary;
        }

        throw reason;
    }
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
    let authError: Error = null;
    let numAuthErrors: number = 0;
    for (const projectCandidate of projectCandidates) {
        try {
            const existingProjectBranches: string[] = await teamscaleClient.retrieveBranchesForProject(projectCandidate);

            if (branchesThatShouldExist.every(branch => existingProjectBranches.indexOf(branch) !== -1)) {
                return projectCandidate;
            }
        } catch (error) {
            if (error && error.status && error.status < 100) {
                // not a HTTP status code, connection failed
                throw new Error('Failed to connect to the Teamscale server.');
            }

            if (error && error.message) {
                if (errorMessages.length === 0) {
                    errorMessages = 'Logged error messages per project: ';
                }

                errorMessages += `'${projectCandidate}' → '${error.message}'. `;
            }

            if (error && error.status && (error.status === 401 || error.status === 403)) {
                // don't stop immediately but try the other projects first before redirecting to the login page
                authError = error;
                numAuthErrors += 1;
            }
            // try next (e.g. 404: project not defined on server)
        }
    }

    if (authError && numAuthErrors === projectCandidates.length) {
        // redirect to login as the user could not be authenticated for any of the project candidates
        throw authError;
    }

    throw new Error('None of the Teamscale Projects configured in the Azure DevOps Extension has the branches' +
        ' involved in the viewed Pull Request in analysis. ' + errorMessages);
}