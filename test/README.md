# Lighthouse Performance Tests

This directory contains automated Lighthouse performance tests for the Cordish Leasing website.

## Setup

```bash
cd test
npm install
```

## Running Tests

```bash
npm run test:performance
```

## What It Tests

The script runs Lighthouse performance audits on both **Desktop** and **Mobile** devices for:
- https://cordishleasing.com/
- https://cordishleasing.netlify.app/

### Metrics Measured

- Performance Score (0-100)
- **Core Web Vitals:**
  - Largest Contentful Paint (LCP)
  - Cumulative Layout Shift (CLS)
  - Total Blocking Time (TBT)
- **Additional Metrics:**
  - First Contentful Paint (FCP)
  - Speed Index
  - Time to Interactive (TTI)

## Results

After each test run, two files are generated:

1. **lighthouse-results.json** - Raw JSON data with all test results
2. **lighthouse-results.md** - Human-readable markdown report with:
   - Performance score comparison table
   - Detailed metrics for each site (Desktop & Mobile)
   - Core Web Vitals ratings (Good/Needs Improvement/Poor)
   - Side-by-side site comparison showing which site performs better
