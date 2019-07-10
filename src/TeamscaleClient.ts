/**
 * Encapsulates calls to Teamscale
 */

import { IFindingsChurnList } from './IFindingsChurnList';
import { ITeamscaleBaseline } from './ITeamscaleBaseline';
import { ITeamscaleBranchesInfo } from './ITeamscaleBranchesInfo';
import { ITgaIssueQueryPercentage } from './ITgaIssueQueryPercentage';

export default class TeamscaleClient {
    constructor(public readonly url: string) {
    }

    /**
     * Gets the test gap badge for an issue from Teamscale.
     *
     * @param project The project in which to search for the issue
     * @param issueId The id of the issue for which to return the test gap badge
     * @returns {PromiseLike} which resolves to a SVG represented as string
     */
    public queryIssueTestGapBadge(project: string, issueId: number): PromiseLike<string> {
        return this.retrieveBadgeForIssue('tga-badge.svg?issueId=', project, issueId);
    }

    /**
     * Gets the badge for the findings churn of an issue from Teamscale.
     *
     * @param project The project in which to search for the issue
     * @param issueId The id of the issue for which to return the test gap badge
     * @returns {PromiseLike} which resolves to a SVG represented as string
     */
    public queryFindingsChurnBadge(project: string, issueId: number): PromiseLike<string> {
        return this.retrieveBadgeForIssue('issue-finding-badge.svg/', project, issueId);
    }

    /**
     * Retrieves a test gap badge using data on the default branch since the specified start timestamp until HEAD.
     */
    public retrieveTestGapDeltaBadge(project: string, startTimestamp: number): PromiseLike<string> {
        const xhr = this.generateRequest(
            'GET', `/p/${project}/tga-badge.svg/?baseline=${startTimestamp}&end=HEAD`);
        const promise = this.generatePromise<string>(xhr).then(badge => {
            const testGapDeltaLink = `${this.url}/delta.html#test-gap/${project}/?from=${startTimestamp}&to=HEAD`;
            return `<a href="${testGapDeltaLink}" target="_top">${badge}</a>`;
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves a findings churn badge using data on the default branch since the specified start timestamp until HEAD.
     */
    public retrieveFindingsDeltaBadge(project: string, startTimestamp: number): PromiseLike<string> {
        const xhr = this.generateRequest(
            'GET', `/p/${project}/finding-badge.svg/?t1=${startTimestamp}&t2=HEAD`);
        const promise = this.generatePromise<string>(xhr).then(badge => {
            const findingsDeltaLink = `${this.url}/delta.html#findings/${project}/?from=${startTimestamp}&to=HEAD`;
            return `<a href="${findingsDeltaLink}" target="_top">${badge}</a>`;
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the findings churn for a single issue.
     */
    public retrieveFindingsChurnListForIssue(project: string, issueId: string): PromiseLike<IFindingsChurnList> {
        const xhr = this.generateRequest(
            'GET', `/p/${project}/issue-finding-churn/${issueId}`);
        const promise = this.generatePromise<string>(xhr).then(findingsChurnList => JSON.parse(findingsChurnList));
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the an TGA issue percentage object for a single issue.
     */
    public retrieveTgaPercentagesForIssue(project: string, issueId: string): PromiseLike<ITgaIssueQueryPercentage> {
        const xhr = this.generateRequest(
            'GET', `/p/${project}/tga-issue-query-percentage/?query=` + encodeURI('id=' + issueId));
        const promise = this.generatePromise<string>(xhr).then(tgaPercentages => JSON.parse(tgaPercentages));
        xhr.send();
        return promise;
    }

    /**
     * Retrieves a list of accessible Teamscale projects from the Teamscale server.
     */
    public retrieveTeamscaleProjects(): PromiseLike<string[]> {
        const xhr = this.generateRequest('GET', '/projects');
        const promise = this.generatePromise<string>(xhr).then(result => {
            return JSON.parse(result);
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the list of baselines configured for a project from the Teamscale server.
     */
    public retrieveBaselinesForProject(teamscaleProject: string): PromiseLike<ITeamscaleBaseline[]> {
        const xhr = this.generateRequest('GET', '/p/' + teamscaleProject + '/baselines/?detail=true');
        const promise = this.generatePromise<string>(xhr).then(result => {
            return JSON.parse(result) as ITeamscaleBaseline[];
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the list of branches of a project from the Teamscale server.
     */
    public retrieveBranchesForProject(teamscaleProject: string): PromiseLike<string[]> {
        const xhr = this.generateRequest('GET', '/p/' + teamscaleProject + '/branches');
        const promise = this.generatePromise<string>(xhr).then(result => {
            const branchesInfo = JSON.parse(result) as ITeamscaleBranchesInfo;
            return branchesInfo.branchNames;
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves an issue specific badge from the Teamscale server.
     */
    private retrieveBadgeForIssue(requestPrefix: string, project: string, issueId: number): PromiseLike<string> {
        const xhr = this.generateRequest(
            'GET', `/p/${project}/` + requestPrefix + issueId);
        const promise = this.generatePromise<string>(xhr).then(badge => {
            // Wrap the svg in a link element pointing to the issue perspective on Teamscale
            const issueUrl = `${this.url}/issues.html#/${project}/${issueId}`;
            return `<a href="${issueUrl}" target="_top">${badge}</a>`;
        });
        xhr.send();
        return promise;
    }

    /**
     * Generate a promise for a XMLHttpRequest which is resolved if the request was successful (status code between 200 and 300)
     * and rejected for other status codes or errors
     */
    private generatePromise<T>(request: XMLHttpRequest): PromiseLike<T> {
        return new Promise((resolve, reject) => {
            request.onload = () => {
                if (request.status >= 200 && request.status < 300) {
                    resolve(request.response);
                } else {
                    reject({
                        status: request.status,
                        statusText: request.statusText,
                    });
                }
            };
            request.onerror = () => {
                reject({
                    // Probably a network problem or a wrong url setting, return a usable status code (-1)
                    // At some point this might have to be replaced with a proper error class...
                    status: -1,
                    statusText: request.statusText,
                });
            };
        });
    }

    /**
     * Generates a XMLHttpRequest for a given HTTP verb and a Teamscale path.
     * The appropriate headers are set automatically.
     */
    private generateRequest(httpVerb: string, path: string) {
        const xhr = new XMLHttpRequest();
        xhr.open(httpVerb, `${this.url}${path}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        return xhr;
    }
}
