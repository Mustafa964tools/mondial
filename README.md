# 964 Goal - Live Scores & Match Server

A highly optimized full-stack application built for real-time live score streams, match statistics, and scheduled fixtures, designed to align with Kurdish sports coverage standards.

## 🚀 Overview

The system features an Express-based Node.js backend proxying live soccer coverage directly from high-performance gateways, coupled with an interactive, highly polished, responsive client-side interface built with React and Tailwind CSS.

---

## 📋 System Requirements

To run this application locally or in a cloud-hosted production environment (such as Virtual Private Servers or Container engines), ensure you have the following packages installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the root directory of your project (or set these directly in your deployment container's workspace environment settings):

```env
# Production Environment Flag
NODE_ENV=production

# Third-party soccer data feed credentials (api-football.com)
API_FOOTBALL_KEY="your_api_football_key_here"

# Public Access URL (for routing setup)
APP_URL="https://goal.964.krd"
```

---

## 📦 Installation & Setup

1. **Install required dependencies**:
   ```bash
   npm install
   ```

2. **Run in Development mode**:
   ```bash
   npm run dev
   ```

3. **Compile for Production deployments**:
   ```bash
   npm run build
   ```

4. **Launch the production build**:
   ```bash
   npm start
   ```

---

## 🖥️ Server Deployment Info

- **Container Port Assignment**: The server runs on port `3000` by default.
- **Reverse Proxy**: Set up an NGINX, Cloudflare, or Caddy configuration to route incoming traffic from the subdomain `goal.964.krd` to port `3000`.
- **Rate Limiting**: Built-in request rate limiters protect endpoints from abuse, adjusting automatically under `trust proxy` settings.
