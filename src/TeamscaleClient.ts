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
        return this.retrieveTestGapBadgeForIssue('tga-badge.svg?issueId=', project, issueId);
    }

    /**
     * Gets the badge for the findings churn of an issue from Teamscale.
     *
     * @param project The project in which to search for the issue
     * @param issueId The id of the issue for which to return the test gap badge
     * @returns {PromiseLike} which resolves to a SVG represented as string
     */
    public queryFindingsChurnBadge(project: string, issueId: number): PromiseLike<string> {
        return this.retrieveTestGapBadgeForIssue('issue-finding-badge.svg/', project, issueId);
    }


    /**
     * Retrieves an issue specific badge from the Teamscale server.
     */
    private retrieveTestGapBadgeForIssue(requestPrefix: string, project: string, issueId: number): PromiseLike<string> {
        let xhr = this.generateRequest(
            'GET', `/p/${project}/` + requestPrefix + issueId);
        let promise = this.generatePromise<string>(xhr).then(badge => {
            // Wrap the svg in a link element pointing to the issue perspective on Teamscale
            let issueUrl = `${this.url}/issues.html#/${project}/${issueId}`;
            return `<a href="${issueUrl}" target="_top">${badge}</a>`
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
            request.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    resolve(request.response);
                } else {
                    reject({
                        status: this.status,
                        statusText: request.statusText
                    });
                }
            };
            request.onerror = function () {
                reject({
                    // Probably a network problem or a wrong url setting, return a usable status code (-1)
                    // At some point this might have to be replaced with a proper error class...
                    status: -1,
                    statusText: request.statusText
                });
            };
        });
    }

    /**
     * Generates a XMLHttpRequest for a given HTTP verb and a Teamscale path.
     * The appropriate headers are set automatically.
     */
    private generateRequest(httpVerb: string, path: string) {
        let xhr = new XMLHttpRequest();
        xhr.open(httpVerb, `${this.url}${path}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        return xhr;
    }
}