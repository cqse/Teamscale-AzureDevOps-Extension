Plugin for Azure DevOps that provides

- Extension for the WorkItems pages to show a TestGap badge
- Pipeline Task to upload coverage, findings, ... reports to Teamscale

# Installation

TODO

# Build and Test

To compile the code:

```bash
npm run build
```

To run the unit tests:

```bash
npm test
```

To package as a .vsix:

```bash
npm run package
```

To publish to our Azure DevOps space for testing:

Create a file called `token` containing an access token with publishing rights for our space.

```bash
npm run test-publish
```

