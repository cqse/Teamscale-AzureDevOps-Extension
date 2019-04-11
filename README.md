Plugin for Azure DevOps that provides

- Extension for the WorkItems pages to show a TestGap badge
- Pipeline Task to upload coverage, findings, ... reports to Teamscale

# Build and Test

We recommend editing with VS Code.

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

# Publishing

To publish to our Azure DevOps space for testing:

Create a file called `token` containing an access token with Marketplace publishing rights for our space.

```bash
npm run test-publish
```

