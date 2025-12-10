/**
 * Takes a list of probable Teamscale project names that might map to the Azure DevOps project and
 * returns for a given issue ID the first project in the list for that either has test gap information or a
 * findings churn for the given issue.
 */
import { ITgaSummary } from '../ITgaSummary';
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from './NotificationUtils';

export enum BadgeType { TestGap = 'Test Gap', FindingsChurn = 'Findings Churn', TestSmell = 'Test Smell' }

export async function resolveProjectNameByIssueId(teamscaleClient: TeamscaleClient, projectCandidates: string[],
                                                  issueId: number, notificationUtils: NotificationUtils,
                                                  badgeType: BadgeType): Promise<string> {
    if (projectCandidates.length === 0) {
        showProjectResolutionError(notificationUtils, badgeType, 'No Teamscale Project is configured for this Azure DevOps Project.');
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
            return;
        }

        showProjectResolutionError(notificationUtils, badgeType, 'None of the configured Teamscale projects (' +
            projectCandidates.join(',') + ') on Server <i>' + teamscaleClient.url + '</i> has valid ' +
            badgeType + ' information for issue ' + issueId + '.');
        return;
    }

    return validProjects[0];
}

function showProjectResolutionError(notificationUtils: NotificationUtils,
                                    badgeType: BadgeType, errorMessage: string): void {
    const message: string = 'Error resolving project for ' + badgeType + ' Badge: ' + errorMessage +
        ' Please make sure that the Teamscale project option is properly set for ' +
        badgeType + ' Badges in the Azure DevOps Project settings.'
    notificationUtils.showErrorBanner(message);
}

/**
 * Returns true if the client returns test gap for the given project candidate and issue id.
 */
async function hasTestGapFindings(teamscaleClient: TeamscaleClient, projectCandidate: string, issueId: number): Promise<boolean> {
    const testGapSummary: ITgaSummary = await teamscaleClient.retrieveTgaSummaryForIssue(projectCandidate, issueId);

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
    const findingsChurnList = await teamscaleClient.retrieveFindingsChurnListForIssue(projectCandidate, issueId);
    
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