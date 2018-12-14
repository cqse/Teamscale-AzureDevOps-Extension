import {ExtensionDataService} from "VSS/SDK/Services/ExtensionData";
import {Scope} from "./Scope";

export class Settings {
    private readonly scope: Scope;
    private readonly project: string;

    constructor(scope: Scope, project: string) {
        this.scope = scope;
        this.project = project;
    }

    save(key: string, value: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            return dataService.setValue(`${this.project}-${key}`, value, {scopeType: this.scope});
        });
    }

    get(key: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            return dataService.getValue(`${this.project}-${key}`, {scopeType: this.scope});
        });
    }
}