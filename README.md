Plugin for Azure DevOps that provides

- Extension for the WorkItems pages to show a TestGap badge
- Pipeline Task to upload coverage, findings, and other reports to Teamscale

# Building

We recommend editing with VS Code.

To compile the code:

```bash
npm run build
```

To package as a .vsix:

```bash
npm run package
```

# Testing

To run the unit tests:

```bash
npm test
```

You can test the pipeline task against <https://cqse.visualstudio.com/AzureDevOps-Plugin-Test> which is also hosted on
[our demo instance](https://demo.teamscale.com). This project also contains a pipeline with our build task.

- Run `npm run package` to create a .vsix package
- Go to <https://cqse.visualstudio.com>
- Go to _Organization Settings > Extensions_
- Uninstall the extension and then install your package

# Publishing

To publish the extension publicly, create a file called `token` containing an access token with Marketplace publishing rights (Organization: *All accessible organizations*, all permissions for Marketplace) for our space.

```bash
npm run publish
```

# Distributed Binaries

We distribute both curl and CodeCoverage.exe with this extension to make it work "out of the box" without additional
dependencies.

For curl under Linux, we use the Ermine build which should work under all modern distributions.
For Windows, we use the 32bit variant which works on both 32 and 64bit machines.

