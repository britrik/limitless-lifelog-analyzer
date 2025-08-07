# Limitless Lifelog Analyzer

A React + Vite application for visualising and analysing lifelog data from the Limitless API and Google Gemini (GenAI).
Built for local use, secure by default—no secrets committed.

---

## 🚀 Features

### Core Functionality
- **Real-time Dashboard**: Dynamic analytics with live data from your Limitless AI account.
- **AI-Powered Analysis**: Integrates with Google Gemini (GenAI) for intelligent transcript analysis.
- **Speaker Context Management**: Advanced speaker identification and context management for improved analysis accuracy.
- **Interactive Analytics**: Comprehensive charts, trends, and visualizations for deep data exploration.

### Dashboard Intelligence & Analytics
- **Dynamic Metrics**: Real-time calculation of recordings, hours, analyses, and bookmarks.
- **Time Range Filtering**: View data for 7 days, 30 days, 90 days, or all time.
- **Accurate Duration Metrics**: Utilises precise `startTime` and `endTime` from Limitless API metadata for duration calculations, falling back to content-based estimation if needed.
- **Interactive Charts**: Activity trends, duration analysis, and more. Many charts support configurable data grouping (by Day, Week, or Month).
- **Activity Heatmap**: GitHub-style heatmap showing daily recording patterns.
- **Topics Cloud**: AI-powered topic extraction and visualization (Click topics to filter transcripts).
- **Trend Analysis**: Compare current vs previous periods with growth indicators.
- **Recent Activity Feed**: Live feed of new recordings, completed analyses, and bookmarks.
- **Time Zone Aware Hourly Activity**: Hourly activity patterns are displayed considering time zone context.

### Advanced Features
- **Responsive Design**: Optimized for desktop, tablet, and mobile.
- **Error Handling**: Graceful fallbacks and retry mechanisms for API calls.
- **Loading States**: Smooth loading animations.
- **Dark Theme**: Modern dark UI with a purple/slate color scheme.

---

## ⚡️ Getting Started

### 1. **Clone the repository**

```bash
git clone https://github.com/britrik/limitless-lifelog-analyzer.git
cd limitless-lifelog-analyzer
```

### 2. **Install dependencies**

```bash
npm install
```

### 3. **Configure environment variables**

Create a file named `.env.local` in the project root **(never commit this file!)**:

```env
VITE_LIMITLESS_API_KEY=your_limitless_api_key_here
VITE_API_KEY=your_google_gemini_api_key_here
```

- Get your Limitless API key from your Limitless AI dashboard.
- Get your Google Gemini API key from Google AI Studio (or Google Cloud console).

### 4. **Start the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### 5. **Running Tests**
Unit tests for utility functions (e.g., `dashboardAnalytics.test.ts`) are located in `src/__tests__`. Run using `npm test` (requires Jest/Vitest setup in `package.json`).
E2E tests using Playwright (e.g., `e2e/dashboard.spec.ts`) can be run with `npm run test:e2e`, which uses `start-server-and-test`.

---

## 🛡 Security & Secrets

- **No API keys, secrets, or personal data are ever committed to this repository.**
- `.env.local` and all environment files are listed in `.gitignore` and excluded from version control.
- All contributors must keep API keys out of code, logs, and commit history.
- **Local Processing**: All data processing primarily happens locally in your browser.

---

## 💡 Production Usage Recommendations

- For production deployments, ensure all dependencies, including Tailwind CSS, are installed locally (do not rely on CDNs).
- **Use a secure backend or server-side proxy for API keys.** Never expose `VITE_LIMITLESS_API_KEY` or `VITE_API_KEY` directly to the browser in a production environment. The current setup with Vite proxy is for development convenience.
- Ensure HTTPS is enforced for all API communications in production.

---

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components (AnalyticsChart, ActivityHeatmap, ContextManager etc.)
├── pages/                # Main application pages (Dashboard, Lifelogs, Settings)
├── services/             # API and external services (limitlessApi, geminiService)
├── utils/                # Utility functions (dashboardAnalytics)
├── types.ts              # TypeScript type definitions
└── styles/               # Global styles (globals.css with Tailwind)
```
*(See inline comments in files for more details on specific components like `AnalyticsChart.tsx` regarding its data prop `chartResponse`)*

---

## 🧪 Testing

This project uses Playwright for End-to-End (E2E) smoke tests and Jest for unit tests.

### Running E2E Tests

- To run the dashboard smoke tests in headless mode:
  ```bash
  npm run test:e2e
  ```
- To run the tests in headed mode for local debugging:
  ```bash
  npm run test:e2e:headed
  ```

Playwright will run the tests and provide an HTML report in `playwright-report/index.html` after the tests run.

### Running Unit Tests

```bash
npm run test
```

### Linting and Type Checking

```bash
npm run lint
npm run typecheck
```

### Continuous Integration

```bash
npm run ci
```

---

## 📈 Analytics Components & Features

*(This section summarizes details found in the "Features" and "Analytics Components" sections of the more detailed README version, focusing on user-facing analytics capabilities.)*

- **Dashboard Metrics Overview**: Cards for Total Recordings, Hours Recorded, AI Analyses, Bookmarks, with growth percentages.
- **Chart Visualizations**:
    - **Activity Over Time**: Line chart showing recording frequency.
    - **Recording Duration**: Bar chart for duration patterns.
    - **Conversation Density (WPM)**: Line chart for words per minute trends.
    - **Sentiment Trend**: Line chart showing sentiment scores over time.
    - **Hourly Activity Pattern**: Heatmap for activity by hour of the day.
- **Recent Activity List**: Chronological list of recent transcripts and actions.
- **Speaker Context**: (Managed via `Lifelogs.tsx` and `ContextManager.tsx`) Allows defining speaker profiles to improve AI analysis accuracy for specific individuals or groups.

---

## 🔧 Technical Stack

- **Frontend**: React (v18+) + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **AI Integration**: Google Gemini API
- **API Integration**: Limitless API

---

## 🎨 Design System (Brief)

- **Color Palette**: Primary Purple, Background Slate, Text White/Slate.
- **UI Style**: Glass morphism effects, rounded corners, layered shadows, smooth transitions.

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service, keeping in mind the "Production Usage Recommendations".

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/your-amazing-feature`).
5. Open a Pull Request.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Contact

For questions, issues, or contributions:
1. Check the [Issues](https://github.com/britrik/limitless-lifelog-analyzer/issues) page.
2. Create a new issue with detailed information (error messages, console logs, steps to reproduce).
3. For contributions, please open a Pull Request.

---

## 🎯 Roadmap

### Completed ✅
- [x] Real-time dashboard with dynamic data & multiple chart types.
- [x] Interactive analytics (time range filtering, chart tooltips).
- [x] Activity heatmap and Topics cloud visualizations.
- [x] Trend analysis and recent activity feed.
- [x] Speaker Context Management.
- [x] Responsive design and dark theme.
- [x] Robust error handling and loading states for API data.
- [x] Dev proxy for Limitless API.

### Planned 🚧
- [ ] Data export functionality (CSV, PDF).
- [ ] Advanced filtering options on dashboard/lifelogs page.
- [ ] Custom dashboard layouts.
- [ ] User notification system for long-running analyses.
- [ ] Enhanced performance for very large datasets.

---

**Transform your lifelog data into actionable insights with intelligent analytics and beautiful visualizations!**