# Limitless Lifelog Analyzer

A React + Vite application for visualising and analysing lifelog data from the Limitless API and Google Gemini (GenAI).  
Built for local use, secure by default—no secrets committed.

---

## 🚀 Features

### Core Functionality
- **Real-time Dashboard**: Dynamic analytics with live data from your Limitless AI account
- **AI-Powered Analysis**: Integrates with Google Gemini (GenAI) for intelligent transcript analysis
- **Speaker Context Management**: Advanced speaker identification and context management
- **Interactive Analytics**: Comprehensive charts, trends, and visualizations

### Dashboard Intelligence & Analytics
- **Dynamic Metrics**: Real-time calculation of recordings, hours, analyses, and bookmarks
- **Time Range Filtering**: View data for 7 days, 30 days, 90 days, or all time
- **Accurate Duration Metrics**: Utilises precise `startTime` and `endTime` from Limitless API metadata (e.g., `{ "startTime": "2023-10-26T10:00:00Z", "endTime": "2023-10-26T11:00:00Z" }`) for duration calculations, falling back to content-based estimation if needed.
- **Interactive Charts**: Activity trends, duration analysis, and completion rates. Many charts now support configurable data grouping (by Day, Week, or Month) via a dropdown selector. Selecting a specific grouping period (e.g., 'Week') overrides the default grouping logic which is otherwise based on the selected time range (e.g., 7-day and 30-day views default to 'Day' grouping, 90-day to 'Week', and All time to 'Month'). The parent component managing the chart would pass the selected `customGroupBy` option to the chart data generation functions (e.g., `generateActivityChartData(transcripts, '7d', 'week')`).
- **Activity Heatmap**: GitHub-style heatmap showing daily recording patterns
- **Topics Cloud**: AI-powered topic extraction and visualization
- **Trend Analysis**: Compare current vs previous periods with growth indicators
- **Recent Activity Feed**: Live feed of recordings, analyses, and bookmarks
- **Time Zone Aware Hourly Activity**: Hourly activity patterns are displayed in your local time zone.

### Advanced Features
- **Topic Filtering**: Click topics in the cloud to filter transcripts
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Error Handling**: Graceful fallbacks and retry mechanisms
- **Loading States**: Smooth loading animations and skeleton screens
- **Dark Theme**: Modern dark UI with purple/slate color scheme

---

## 📊 Analytics Components

### AnalyticsChart
- **Multiple Chart Types**: Line, bar, and area charts
- **Interactive Tooltips**: Hover for detailed information
- **Responsive Design**: Adapts to container size
- **Dark Theme Compatible**: Styled for the application theme

### ActivityHeatmap
- **Daily Activity Visualization**: Shows recording frequency over time
- **Color-coded Intensity**: Visual representation of activity levels
- **Hover Information**: Detailed tooltips with date and count
- **Time Range Support**: Adapts to selected time range

### TrendAnalysis
- **Metric Comparison**: Compare current vs previous periods
- **Growth Indicators**: Visual trend arrows and percentages
- **Multiple Metrics**: Recordings, duration, and analysis counts
- **Trend Classification**: Up, down, or stable trend identification

### TopicsCloud
- **AI Topic Extraction**: Automatically extracts topics from transcripts
- **Visual Word Cloud**: Size-based frequency representation
- **Interactive Filtering**: Click topics to filter transcripts
- **Color-coded Display**: Multiple colors for visual appeal

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

- Get your Limitless API key from your Limitless AI dashboard
- Get your Google Gemini API key from Google AI Studio

### 4. **Start the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### 5. **Running Tests**

Unit tests for utility functions are located in the `src/__tests__` directory (e.g., `dashboardAnalytics.test.ts`). These tests are written using Jest/Vitest conventions. To run them, you would typically use a test runner command configured in `package.json` (e.g., `npm test`). As standard test scripts are not currently configured in `package.json`, you may need to set up a test runner or run tests via your IDE's testing tools if available.

### 6. **Running End-to-End (E2E) Tests**

E2E tests using Playwright would typically be located in a separate directory (e.g., `e2e/` or `tests/e2e/`) and contain spec files (e.g., `dashboard.spec.ts`). These tests often rely on deterministic datasets, sometimes referred to as fixtures (e.g., a demo data fixture like `tests/fixtures/transcripts-demo.json`, though the exact path should be verified within the project's E2E test setup). To run them, you would use a command configured in `package.json` (e.g., `npm run test:e2e`). The `test:e2e` script is configured to use `start-server-and-test` to launch the development server and then run Playwright tests.

---

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── AnalyticsChart.tsx    # Chart visualization component
│   ├── ActivityHeatmap.tsx   # Activity heatmap component
│   ├── TrendAnalysis.tsx     # Trend analysis component
│   ├── TopicsCloud.tsx       # Topics visualization component
│   ├── AnalysisCard.tsx      # Analysis results display
│   ├── ContextManager.tsx    # Speaker context management
│   ├── LoadingSpinner.tsx    # Loading animation
│   ├── ErrorDisplay.tsx      # Error handling display
│   └── ...
├── pages/               # Main application pages
│   ├── Dashboard.tsx        # Main dashboard with analytics
│   ├── Lifelogs.tsx        # Transcript management
│   ├── Settings.tsx        # Application settings
│   └── ...
├── services/            # API and external services
│   ├── limitlessApi.ts     # Limitless API integration
│   ├── geminiService.ts    # Google Gemini AI service
│   └── ...
├── utils/               # Utility functions
│   ├── dashboardAnalytics.ts # Analytics calculations (chart data functions now return ChartDataResponse objects: { data, status, message })
│   └── ...
├── types.ts             # TypeScript type definitions
└── styles/
    └── globals.css      # Global styles and Tailwind config
```

---

## 📈 Analytics Features

### Dashboard Metrics
- **Total Recordings**: Count of all transcripts in selected time range
- **Hours Recorded**: Estimated total duration based on content length
- **AI Analyses**: Number of transcripts with completed analysis
- **Bookmarks**: Count of starred/favorited transcripts
- **Growth Percentages**: Comparison with previous period

### Chart Visualizations
- **Activity Chart**: Daily/weekly recording activity over time (hourly data is time zone aware).
- **Duration Trends**: Recording duration patterns and trends
- **Analysis Completion**: Rate of AI analysis completion

### Interactive Features
- **Time Range Selection**: Filter data by 7d, 30d, 90d, or all time
- **Topic Filtering**: Click topics to filter relevant transcripts
- **Hover Tooltips**: Detailed information on chart interactions
- **Responsive Design**: Adapts to different screen sizes

---

## 🔧 Technical Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **AI Integration**: Google Gemini API
- **API Integration**: Limitless API

---

## 🎨 Design System

### Color Palette
- **Primary**: Purple (#8b5cf6, #a855f7)
- **Background**: Slate (#0f172a, #1e293b, #334155)
- **Text**: White/Slate (#ffffff, #f1f5f9, #94a3b8)
- **Accents**: Blue, Green, Yellow, Red for different data types

### Components
- **Glass Morphism**: Backdrop blur effects with transparency
- **Rounded Corners**: Consistent border radius (xl = 12px)
- **Shadows**: Layered shadow system for depth
- **Animations**: Smooth transitions and hover effects

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

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

---

## 🔒 Security & Privacy

- **Local Processing**: All data processing happens locally in your browser
- **No Data Storage**: No user data is stored on external servers
- **Environment Variables**: API keys stored securely in local environment
- **HTTPS Required**: Secure connections for all API communications

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/britrik/limitless-lifelog-analyzer/issues) page
2. Create a new issue with detailed information
3. Include error messages, browser console logs, and steps to reproduce

---

## 🎯 Roadmap

### Completed ✅
- [x] Real-time dashboard with dynamic data
- [x] Interactive analytics charts
- [x] Activity heatmap visualization
- [x] Topics cloud with filtering
- [x] Trend analysis with growth indicators
- [x] Responsive design and dark theme
- [x] Error handling and loading states

### Planned 🚧
- [ ] Data export functionality (CSV, PDF)
- [ ] Advanced filtering options
- [ ] Custom dashboard layouts
- [ ] Notification system
- [ ] Offline mode support
- [ ] Performance optimizations

---

**Transform your lifelog data into actionable insights with intelligent analytics and beautiful visualizations!**