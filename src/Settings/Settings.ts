import {ExtensionDataService} from "VSS/SDK/Services/ExtensionData";
import {Scope} from "./Scope";

export class Settings {
    public static readonly TEAMSCALE_URL = "teamscale-url";
    public static readonly TEAMSCALE_PROJECT = "teamscale-project";

    private readonly scope: Scope;
    private readonly project: string;

    constructor(scope: Scope, project: string) {
        this.scope = scope;
        this.project = project;
    }

    save(key: string, value: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            if (!value) {
                value = undefined;
            }
            return dataService.setValue(`${this.project}-${key}`, value, {scopeType: this.scope});
        });
    }

    get(key: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            return dataService.getValue(`${this.project}-${key}`, {scopeType: this.scope});
        });
    }
}