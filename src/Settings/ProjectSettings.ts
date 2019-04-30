import {Scope} from './Scope';
import {Settings} from './Settings';

/**
 * Extends the Settings class to be able to save project specific settings.
 * Note that this is done on the scope of this extension and is not supported by VSS, meaning that settings are still
 * visible to all users of the Organization => Do not save sensitive data with this!
 */
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