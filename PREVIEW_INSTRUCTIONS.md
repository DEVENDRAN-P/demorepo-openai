# Quick Start Guide: How to Run the App & Access the Preview

Follow these simple steps to run the **AI GST & Compliance Buddy** React application locally on your computer and view the preview.

---

## 🔑 Demo Credentials
When you open the login screen, use these credentials to log in:
* **Email**: `demo@shop.com`
* **Password**: `password123`

---

## 🏃 Option 1: Run the Production Build (Recommended)
This runs the highly optimized, built code. We have already compiled this build for you.

1. **Open your terminal** (e.g. PowerShell or Command Prompt) and navigate to the project directory:
   ```bash
   cd c:\Users\LENOVO\OneDrive\Desktop\ALLPROJECTS\demorepo-openai-main\demorepo-openai-main
   ```

2. **Start the local server** using `serve`:
   ```bash
   npx serve -s build -l 3000
   ```

3. **Open the preview**:
   Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## ⚡ Option 2: Run in Development Mode
This starts the hot-reloading development server, which is best for making code changes.

1. **Open your terminal** and navigate to the project directory:
   ```bash
   cd c:\Users\LENOVO\OneDrive\Desktop\ALLPROJECTS\demorepo-openai-main\demorepo-openai-main
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open the preview**:
   The terminal will automatically open a browser window at: **[http://localhost:3000](http://localhost:3000)**
   *(If it doesn't open automatically, you can navigate there manually).*

---

## 🔬 Running Verification Scripts
To verify that all the translation files (English, Hindi, Tamil, Malayalam, Kannada) match correctly:

1. **Navigate** to the project directory:
   ```bash
   cd c:\Users\LENOVO\OneDrive\Desktop\ALLPROJECTS\demorepo-openai-main\demorepo-openai-main
   ```

2. **Run the script**:
   ```bash
   node verify_langs.js
   ```

   *Expected output: `✅ All language files have matching keys!`*
