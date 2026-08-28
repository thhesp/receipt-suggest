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

### 3. Verify installation
```bash
npm run ng -- version
```

You should see Angular CLI and Angular version 22.x.x

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

### Dependencies conflict warnings
- This is normal - Angular 22 has many peer dependencies
- The `.npmrc` file is configured to handle this
- Ignore warnings and proceed

### Port 4200 already in use
```bash
npm start -- --port 4300
```

Use a different port with `--port` flag

### Clear node_modules and reinstall
```bash
rm -r node_modules package-lock.json
npm install
```

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
