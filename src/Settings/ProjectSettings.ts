import {Settings} from "./Settings";
import {Scope} from "./Scope";

export class ProjectSettings extends Settings {

    private readonly project: string;

    constructor(scope: Scope, project: string) {
        super(scope);
        this.project = project;
    }

    save(key: string, value: string): PromiseLike<string> {
        return super.save(`${this.project}-${key}`, value);
    }

    get(key: string): PromiseLike<string> {
        return super.get(`${this.project}-${key}`);
    }
}