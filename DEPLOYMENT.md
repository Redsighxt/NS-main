# Fusion Drawing Studio - Production Deployment Guide

## 🚀 Vercel Deployment

This application is optimized for deployment on Vercel with full touch and mobile support.

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel CLI (optional)

### Environment Variables

Copy `.env.example` to `.env.production` and configure:

```bash
NODE_ENV=production
VITE_APP_TITLE="Fusion Drawing Studio"
VITE_ENABLE_TOUCH_GESTURES=true
VITE_ENABLE_PRESSURE_SENSITIVITY=true
```

### Deployment Steps

#### Option 1: Vercel Dashboard (Recommended)

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build:client`
3. Set output directory: `dist/spa`
4. Deploy

#### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Features Included in Production Build

✅ **Touch Support**

- Single-touch drawing on mobile devices
- Two-finger pinch-to-zoom gestures
- Two-finger panning
- Touch throttling for 60fps performance

✅ **Apple Pencil Support**

- Pressure sensitivity detection
- Stylus-specific optimizations
- Force touch support

✅ **Performance Optimizations**

- Code splitting by feature areas
- Lazy loading of components
- Error boundaries with graceful fallbacks
- Minified bundles with Terser

✅ **Mobile Optimizations**

- Touch-action CSS optimizations
- Webkit touch enhancements
- Prevention of unwanted scrolling during drawing

### Build Configuration

The app builds both client and server:

- **Client**: Static SPA in `dist/spa/`
- **API**: Serverless functions for Vercel

### Browser Support

- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Tablets**: iPad with Safari 14+, Android tablets

### Troubleshooting

**Build Issues:**

- Ensure Node.js 18+ is being used
- Clear `node_modules` and reinstall if needed
- Check Vercel build logs for specific errors

**Touch Issues:**

- Verify `touch-action: none` CSS is applied
- Check mobile viewport meta tag
- Ensure preventDefault is called on touch events

**Performance:**

- Monitor Core Web Vitals in Vercel dashboard
- Enable compression in Vercel settings
- Consider enabling Edge functions for global performance

### Support

For deployment issues:

1. Check Vercel build logs
2. Verify environment variables are set
3. Test locally with `npm run build:client && npm run start`

### Vercel Configuration

The `vercel.json` file includes:

- Static file serving for SPA
- API route handling
- Proper redirects for client-side routing
