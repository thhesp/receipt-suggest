# Installation Guide

## Prerequisites

- **Node.js 20.x LTS** or higher
  - Download from https://nodejs.org/
  - Verify: `node --version` and `npm --version`

- **npm 10.x** or higher (comes with Node.js)

## Installation Steps

### 1. Clone and checkout branch
```bash
git clone https://github.com/thhesp/receipt-suggest.git
cd receipt-suggest
git checkout angular-migration
```

### 2. Install dependencies
```bash
npm install
```

This will install all Angular 22, TypeScript, Bootstrap, and testing dependencies.

**Note**: The first installation may take 2-5 minutes depending on your internet speed.

## Running the Application

### Development Server
```bash
npm start
```

Navigate to `http://localhost:4200/`

The app will automatically reload when you modify source files.

### Production Build
```bash
npm run build:prod
```

Build artifacts will be in `dist/receipt-suggest/`

### Running Tests
```bash
npm test
```

Opens Karma test runner in browser.

### Linting
```bash
npm run lint
```

## Troubleshooting

### "npm: command not found"
- Ensure Node.js is installed: https://nodejs.org/
- Restart your terminal after installing Node.js

### "node is either misspelled or cannot be found" during npm install
- **Root cause**: Node.js is installed but not in your system PATH
- **Solution**:
  1. Add Node.js to PATH:
     - Find your Node.js installation: `where npm` (will show the path)
     - Add the directory to your Windows PATH environment variable
     - Restart PowerShell/CMD
  2. Or reinstall Node.js with "Add to PATH" option checked
  3. Verify: Open new terminal and run `node --version`

### Dependencies conflict warnings
- This is normal - Angular 22 has many peer dependencies
- The `.npmrc` file is configured to handle this with `legacy-peer-deps=true`
- These warnings are safe to ignore and will not affect functionality

## Docker Build

### Local Build
```bash
docker build -t receipt-suggest:local .
docker run -p 8080:80 receipt-suggest:local
```

Navigate to `http://localhost:8080`

### Production Build with Image Optimization
```bash
docker build -t receipt-suggest:prod --target image-compressed .
docker run -p 8080:80 receipt-suggest:prod
```

## Environment Info

Tested and working with:
- Node.js 20.x LTS
- npm 10.x
- Angular 22.0.0
- TypeScript 5.5.0
- Bootstrap 5.3.0

## Next Steps

1. Run `npm install` to set up your environment
2. Run `npm start` to start development
3. Check `README-ANGULAR.md` for architecture and usage details
4. Add your recipes to `public/data/`

---

**Questions?** Check README-ANGULAR.md or the project structure in `src/app/`
