export default class TeamscaleClient {
    public readonly url: string = "";
    public readonly project: string = "";

    constructor(url: string) {
        this.url = url;
    }

    queryIssueTestGapPercentage(project: string, issueId: number) {
        let xhr = this.generateRequest(
            'GET',
            `/p/${project}/tga-issue-query-percentage/?query=id%3D${issueId}`);
        let promise = this.generatePromise(xhr);
        xhr.send();
        return promise;
    }

    queryIssueTestGapBadge(project: string, issueId: number) {
        let xhr = this.generateRequest(
            'GET',
            `/p/${project}/tga-badge.svg?issueId=${issueId}`);
        let promise = this.generatePromise(xhr);
        xhr.send();
        return promise;
    }

    private generatePromise(request: XMLHttpRequest) {
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
                    status: this.status,
                    statusText: request.statusText
                });
            };
        });
    }

    private generateRequest(httpVerb: string, path: string) {
        let xhr = new XMLHttpRequest();
        xhr.open(httpVerb, `${this.url}${path}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        return xhr;
    }
}