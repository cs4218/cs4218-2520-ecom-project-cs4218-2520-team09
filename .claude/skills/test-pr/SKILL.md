---
name: test-pr
description: Opens a PR to add new unit tests in this e-commerce Node.js/React project. Use this skill whenever the user wants to write missing unit tests for a file, improve unit test coverage for a controller/component/helper/middleware, or create a branch+PR with unit tests. Triggers on phrases like "write unit tests for X", "add unit tests to X", "test coverage for X", "open a PR with tests", "create tests PR", "missing unit tests", "improve test coverage", "add unit tests". Always use this skill when the task involves writing unit tests AND committing/pushing a PR.
---

This skill guides you through analyzing, writing, and opening a PR for **unit tests** in this e-commerce project (Node.js/Express backend + React frontend, Jest).

Unit tests mock all external dependencies (models, third-party libs) and test a single function in isolation.

## Step 1: Understand the target

Clarify (from context or by asking):
- **What file/module needs unit tests?** (e.g., `controllers/productController.js`, `client/src/components/Header.js`)

Read the source file and any existing test file before writing anything.

## Step 2: Research project patterns

Always read one of these references first so your output matches the project style exactly:

- **Backend controller unit test reference**: `controllers/authController.test.js`
- **Frontend component unit test reference**: `client/src/components/Header.test.js`
- **Helper/middleware unit test reference**: `helpers/authHelper.test.js` or `middlewares/authMiddleware.test.js`

## Step 3: Determine test file placement

| Source location | Unit test location |
|---|---|
| `controllers/*.js` | `controllers/*.test.js` |
| `helpers/*.js` | `helpers/*.test.js` |
| `middlewares/*.js` | `middlewares/*.test.js` |
| `client/src/**/*.jsx?` | Same directory, `*.test.js` |

Check `jest.backend.config.js` or `jest.frontend.config.js` to confirm the path matches the `testMatch` glob.

## Step 4: Create a branch

```bash
git checkout main && git pull
git checkout -b test/<module-name>-unit-tests
```

Examples: `test/productController-unit-tests`, `test/Header-unit-tests`, `test/authMiddleware-unit-tests`

## Step 5: Write the unit tests

This project uses **ES modules** (`import`/`export`), not CommonJS.

### Backend controller/helper/middleware template

```javascript
import { jest } from '@jest/globals';
import { functionToTest } from '../path/to/module.js';
import ModelName from '../models/modelName.js';

jest.mock('../models/modelName.js');
// mock other dependencies (jsonwebtoken, slugify, fs, etc.)

describe('functionToTest', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, user: { _id: 'user123' }, fields: {}, files: {} };
    res = {
      status: jest.fn().mockReturnThis(),  // critical: enables res.status(400).send(...)
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should return 400 if required field is missing', async () => {
    req.body = { /* omit a required field */ };
    await functionToTest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('should succeed when all required fields are provided', async () => {
    ModelName.findOne.mockResolvedValue(null);
    const mockSave = jest.fn().mockResolvedValue({ _id: '123', name: 'Test' });
    ModelName.mockImplementation(() => ({ save: mockSave }));

    req.body = { /* valid payload */ };
    await functionToTest(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should return 500 on unexpected error', async () => {
    ModelName.findOne.mockRejectedValue(new Error('DB failure'));
    await functionToTest(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
```

**Mongoose query chain mock** (when the controller chains `.populate().select().limit()` etc.):
```javascript
const chainMock = {
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
};
ModelName.find.mockReturnValue(chainMock);
chainMock.then = jest.fn((resolve) => resolve([]));
```

**Parametrized validation tests** (for multiple missing-field cases):
```javascript
const validationCases = [
  { field: 'name', errorMsg: 'Name is Required' },
  { field: 'price', errorMsg: 'Price is Required' },
];

validationCases.forEach(({ field, errorMsg }) => {
  it(`should return 400 if ${field} is missing`, async () => {
    req.fields = { name: 'N', description: 'D', price: 1 };
    delete req.fields[field];
    await functionToTest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: errorMsg });
  });
});
```

### Frontend component template

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComponentName from './ComponentName';
import { useAuth } from '../../context/auth';
import { useCart } from '../../context/cart';

jest.mock('../../context/auth');
jest.mock('../../context/cart');
jest.mock('react-hot-toast');

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);
  });

  it('renders correctly when unauthenticated', () => {
    render(<MemoryRouter><ComponentName /></MemoryRouter>);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows user name when authenticated', () => {
    useAuth.mockReturnValue([{ user: { name: 'Alice' }, token: 'tok' }, jest.fn()]);
    render(<MemoryRouter><ComponentName /></MemoryRouter>);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

## Step 6: Coverage priorities

Write tests in this order:
1. **Happy path** — the main success scenario
2. **Validation errors** — missing/invalid required fields (400)
3. **Not found** — resource doesn't exist (404)
4. **Auth errors** — unauthorized access (401/403)
5. **DB/service errors** — simulate failures (500)
6. **Edge cases** — boundary values, empty lists, etc.

## Step 7: Run tests and fix failures

```bash
# Backend unit tests
npm run test:unit:backend

# Frontend unit tests
npm run test:unit:frontend

# Single file (fastest feedback loop)
npx jest path/to/file.test.js --no-coverage
```

Fix all failures before committing. Do not commit broken tests.

## Step 8: Commit

```bash
git add path/to/new-file.test.js
git commit -m "test(<module>): add unit tests for <function/scenario>

<Optional: why these were missing, what gaps they close>"
```

Examples:
- `test(productController): add unit tests for createProduct and deleteProduct`
- `test(Header): add unit tests for authenticated and unauthenticated states`

## Step 9: Push and open the PR

```bash
git push -u origin HEAD

gh pr create \
  --title "test(<module>): add unit tests" \
  --base main \
  --body "$(cat <<'EOF'
## What

<1-2 sentences: what unit tests were added>

## Why

<1-2 sentences: what coverage gap this addresses>

## Test cases added

- `<functionName> — <scenario>`: <what it verifies>
- `<functionName> — <scenario>`: <what it verifies>

## How to verify

\`\`\`bash
<exact npm command to run these tests>
\`\`\`

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

## Key rules for this project

- **ES modules only**: use `import`/`export`, never `require`/`module.exports`
- **Mock all external dependencies**: models, JWT, bcrypt, fs, slugify, braintree — everything outside the function under test
- **`res.status` must chain**: mock as `jest.fn().mockReturnThis()` so `res.status(400).send(...)` doesn't crash
- **`jest.clearAllMocks()` in every `beforeEach`**: prevents state leaking between tests
- **Restore console spies**: call `console.log.mockRestore()` in `afterEach` or `afterAll`
- **Branch off `main`**: always pull latest main before creating your branch
