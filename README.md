# Dayflow HRMS 🏢

**Dayflow** is a lightweight, browser-based Human Resource Management System (HRMS). Built entirely with **Vanilla JavaScript** and **Tailwind CSS**, it features a fully functional simulated backend using `localStorage`.

It provides distinct interfaces for **Admins** (to manage staff, payroll, and approvals) and **Employees** (to mark attendance, apply for leave, and view salary slips).

---

## 🚀 Features

### 🔐 Authentication & Roles
* **Role-Based Access Control:** Separate login flows for **Admins** and **Employees**.
* **Secure Signup:** Password strength validation and auto-login upon registration.
* **Persistent Session:** Keeps users logged in via LocalStorage.

### 👨‍💼 Admin Portal
* **Dashboard:** Quick stats on total employees, present staff, and pending requests.
* **Employee Management:** Add, Edit, and Delete employee records.
* **Leave Management:** Approve or Reject leave requests with a single click.
* **Payroll Control:** Define salary structures (CTC) which auto-calculates Basic, HRA, and Allowances.
* **Attendance Monitoring:** Filter attendance logs by Date or Week.

### 👷 Employee Portal
* **One-Click Attendance:** Check-in/Uncheck logic (simulated).
* **Leave Application:** Apply for various leave types with date ranges and reasons.
* **Payroll Viewer:** View detailed monthly salary breakdown.
* **PDF Download:** Generate and download professional Salary Slips (powered by `html2pdf.js`).
* **Profile:** View details and edit contact information.

### 📧 Feedback System
* Integrated form that redirects to **Gmail** to send bug reports or suggestions directly to the administrator.

---

## 🛠️ Tech Stack

* **Core:** HTML5, JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN)
* **Icons:** FontAwesome 5
* **Data Persistence:** Browser `localStorage` (No database required)
* **Utilities:** `html2pdf.js` for PDF generation.

---

## ⚡ Quick Start

Since this project requires no build tools (like Webpack or Node.js), you can run it immediately in your browser.

1.  **Create an `index.html` file.**
2.  **Paste the code.** (Ensure you include the HTML skeleton with the required CDN links in the `<head>` tag, see *Setup Structure* below).
3.  **Open `index.html`** in Chrome, Firefox, or Edge.

### Recommended HTML Structure
If you are pasting the JavaScript code into a file, ensure your HTML head looks like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dayflow HRMS</title>
    <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
    <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)">
    <script src="[https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js](https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js)"></script>
</head>
<body class="bg-gray-50 text-gray-800 h-screen flex flex-col overflow-hidden">
    <div id="toast" class="fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white hidden transition-all duration-300 transform translate-y-0"></div>
    <div id="app" class="h-full flex flex-col md:flex-row"></div>

    <script>
       // PASTE YOUR JAVASCRIPT CODE HERE
    </script>
</body>
</html>