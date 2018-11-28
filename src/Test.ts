class Test {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    public testMethod() {
        return `Hello ${this.name}`;
    }
}