import { IFindingsChurnList } from './IFindingsChurnList';
import { ITeamscaleBaseline } from './ITeamscaleBaseline';
import { ITgaSummary } from './ITgaSummary';
import { IProjectConnectorList } from './IProjectConnectorList';

/**
 * Media type to use when requesting a badge.
 */
const IMAGE_SVG = "image/svg+xml";

/**
 * Encapsulates calls to Teamscale
 */
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
        project = encodeURIComponent(project);
        const xhr = this.generateRequest(
            'GET', `/api/projects/${project}/test-gaps/badge?all-partitions=true&issue-id=${issueId}`, IMAGE_SVG);
        return this.wrapWithIssueIdLink(xhr, project, issueId);
    }

    /**
     * Gets the badge for the findings churn of an issue from Teamscale.
     *
     * @param project The project in which to search for the issue
     * @param issueId The id of the issue for which to return the test gap badge
     * @returns {PromiseLike} which resolves to a SVG represented as string
     */
    public queryFindingsChurnBadge(project: string, issueId: number): PromiseLike<string> {
        project = encodeURIComponent(project);
        const xhr = this.generateRequest(
            'GET', `/api/v5.9/projects/${project}/issues/${issueId}/findings-badge`, IMAGE_SVG);
        return this.wrapWithIssueIdLink(xhr, project, issueId);
    }

    /**
     * Retrieves a test gap badge using data on the default branch since the specified start timestamp until HEAD.
     */
    public retrieveTestGapDeltaBadge(project: string, startTimestamp: number): PromiseLike<string> {
        project = encodeURIComponent(project);
        const xhr = this.generateRequest(
            'GET', `/api/projects/${project}/test-gaps/badge?baseline=${startTimestamp}&end=HEAD`, IMAGE_SVG);
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
        project = encodeURIComponent(project);
        const xhr = this.generateRequest(
            'GET', `/api/v5.9/projects/${project}/findings/delta/badge?t1=${startTimestamp}&t2=HEAD`, IMAGE_SVG);
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
    public retrieveFindingsChurnListForIssue(project: string, issueId: number): PromiseLike<IFindingsChurnList> {
        project = encodeURIComponent(project);
        const xhr = this.generateRequest(
            'GET', `/api/v5.9/projects/${project}/issues/${issueId}/finding-churn`);
        const promise = this.generatePromise<string>(xhr).then(findingsChurnList => JSON.parse(findingsChurnList));
        xhr.send();
        return promise;
    }

    /**
     * Gets the test smell badge for a spec item from Teamscale.
     *
     * @param project The project in which to search for the issue
     * @param connectorId The id of the requirements connector
     * @param specItemId The id of the spec item for which to return the test smell badge
     * @returns {PromiseLike} which resolves to a SVG represented as string
     */
    public retrieveFindingsChurnListForSpecItem(project: string, connectorId: string, specItemId: string):
        PromiseLike<IFindingsChurnList> {
        project = encodeURIComponent(project);
        connectorId = encodeURIComponent(connectorId);
        specItemId = encodeURIComponent(specItemId);
        const xhr = this.generateRequest(
            'GET', `/api/projects/${project}/findings/delta/?t1=1&t2=HEAD&only-spec-item-findings=true&uniform-path=-spec-item-/${connectorId}/${specItemId}`);
        const promise = this.generatePromise<string>(xhr).then(findingsChurnList => JSON.parse(findingsChurnList));
        xhr.send();
        return promise;
    }

    /**
     * Gets the test smell badge for a spec item from Teamscale.
     *
     * @param project The project in which to search for the issue
     * @param specItemId The id of the spec item for which to return the test smell badge
     * @param connectorId The id of the requirements connector
     * @returns {PromiseLike} which resolves to a SVG represented as string
     */
    public retrieveBadgeForSpecItem(project: string, connectorId: string, specItemId: string): PromiseLike<string> {
        project = encodeURIComponent(project);
        connectorId = encodeURIComponent(connectorId);
        specItemId = encodeURIComponent(specItemId);
        const xhr = this.generateRequest(
            'GET', `/api/projects/${project}/findings/delta/badge/?t1=1&t2=HEAD&only-spec-item-findings=true&uniform-path=-spec-item-/${connectorId}/${specItemId}`);
        xhr.setRequestHeader('Accept', 'image/svg+xml');
        const promise = this.generatePromise<string>(xhr).then(badge => {
            // Wrap the svg in a link element pointing to the spec item perspective on Teamscale 
            const specItemUrl = `${this.url}/requirements-tracing.html#details/${project}/?id=${connectorId}|${specItemId}&t=AHEAD`;
            return `<a href="${specItemUrl}" target="_top">${badge}</a>`;
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the project connector list.
     */
    public retrieveProjectConnectorList(): PromiseLike<IProjectConnectorList> {
        const xhr = this.generateRequest(
            'GET', `/api/project-connectors`);
        const promise = this.generatePromise<string>(xhr).then(projectConnectorList => JSON.parse(projectConnectorList));
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the an TGA issue percentage object for a single issue.
     */
    public retrieveTgaSummaryForIssue(project: string, issueId: number): PromiseLike<ITgaSummary> {
        const xhr = this.generateRequest(
            'GET', `/api/projects/${project}/issues/${issueId}/tga-summary`);
        const promise = this.generatePromise<string>(xhr).then(tgaSummary => JSON.parse(tgaSummary));
        xhr.send();
        return promise;
    }

    /**
     * Retrieves a list of accessible Teamscale projects from the Teamscale server.
     */
    public retrieveTeamscaleProjects(): PromiseLike<string[]> {
        const xhr = this.generateRequest('GET', '/api/v7.1/projects/ids');
        const promise = this.generatePromise<string>(xhr).then(result => {
            return JSON.parse(result);
        });
        xhr.send();
        return promise;
    }

    /**
     * Retrieves the list of baselines configured for a project from the Teamscale server.
     */
    public retrieveBaselinesForProject(project: string): PromiseLike<ITeamscaleBaseline[]> {
        project = encodeURIComponent(project);
        const xhr = this.generateRequest('GET', `/api/v5.2/projects/${project}/baselines`);
        const promise = this.generatePromise<string>(xhr).then(result => {
            return JSON.parse(result) as ITeamscaleBaseline[];
        });
        xhr.send();
        return promise;
    }

    /**
     * Wraps the response of a badge request with a link to the issue perspective.
     */
    private wrapWithIssueIdLink(xhr: XMLHttpRequest, project: string, issueId: number) {
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
    private generateRequest(httpVerb: string, path: string, acceptMediaType: string = "application/json") {
        const xhr = new XMLHttpRequest();
        xhr.open(httpVerb, `${this.url}${path}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', acceptMediaType);
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        return xhr;
    }
}
