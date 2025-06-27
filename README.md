# Limitless Lifelog Analyzer

A React + Vite application for visualising and analysing lifelog data from the Limitless API and Google Gemini (GenAI).  
Built for local use, secure by default—no secrets committed.

---

## 🚀 Features

- Connects to your Limitless AI account to fetch lifelogs
- Integrates with Google Gemini (GenAI) for AI-powered transcript analysis
- Clean, modern UI built with React and Tailwind (CDN for dev)
- Local `.env` file for secret management

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
- Get your Gemini API key from Google Cloud console

### 4. **Start the development server**

```bash
npm run dev
```

- The app runs at [http://localhost:5173/](http://localhost:5173/) by default.

---

## 🛡 Security & Secrets

- **No API keys, secrets, or personal data are ever committed to this repository.**
- `.env.local` and all environment files are listed in `.gitignore` and excluded from version control.
- All contributors must keep API keys out of code, logs, and commit history.

---

## 💡 Production Usage

- For production deployments, install Tailwind and dependencies locally (don’t use CDN).
- Use a secure backend or proxy for API keys—never expose keys to the browser in production.

---

## 🤝 Contributing

1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a Pull Request

---

## 📄 License

[MIT](LICENSE)

---

## ✉️ Contact

For questions or contributions, open an issue or PR at  
[https://github.com/britrik/limitless-lifelog-analyzer](https://github.com/britrik/limitless-lifelog-analyzer)
