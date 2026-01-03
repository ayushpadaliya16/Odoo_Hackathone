
// --- State Management ---
const STATE = {
    currentUser: null,
    currentView: 'login',
    authMode: 'login',
    selectedRole: null, 
    isEditingProfile: false,
    attendanceFilter: { type: 'all', value: null },
    adminSelectedUserId: null, 
    adminIsEditing: false, 
    adminIsAdding: false, // <--- ADD THIS NEW FLAG
    payrollSelectedUserId: null,
    users: [],
    attendance: [],
    leaves: [],
    payroll: []
};

// --- Mock Data ---
const MOCK_USERS = [
    {
        id: 1,
        name: 'Admin User',
        email: 'admin@dayflow.com',
        password: 'admin',
        role: 'admin',
        position: 'HR Manager',
        department: 'Human Resources',
        phone: '123-456-7890',
        joinedDate: '2023-01-01',
        salary: 1200000,
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff'
    },
    {
        id: 2,
        name: 'John Doe',
        email: 'john@dayflow.com',
        password: 'user',
        role: 'employee',
        position: 'Software Engineer',
        department: 'Engineering',
        phone: '987-654-3210',
        joinedDate: '2023-03-15',
        salary: 800000,
        avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=random'
    },
    {
        id: 3,
        name: 'Jane Smith',
        email: 'jane@dayflow.com',
        password: 'user',
        role: 'employee',
        position: 'Product Designer',
        department: 'Design',
        phone: '555-555-5555',
        joinedDate: '2023-04-01',
        salary: 900000,
        avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=random'
    }
];

// --- Init ---
function init() {
    // Load data from LocalStorage or seed
    const storedUsers = localStorage.getItem('dayflow_users');
    if (storedUsers) {
        STATE.users = JSON.parse(storedUsers);
    } else {
        STATE.users = MOCK_USERS;
        localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
    }

    const storedAttendance = localStorage.getItem('dayflow_attendance');
    if (storedAttendance) STATE.attendance = JSON.parse(storedAttendance);

    const storedLeaves = localStorage.getItem('dayflow_leaves');
    if (storedLeaves) STATE.leaves = JSON.parse(storedLeaves);

    // Check if user is logged in
    const sessionUser = localStorage.getItem('dayflow_currentUser');
    if (sessionUser) {
        STATE.currentUser = JSON.parse(sessionUser);
        STATE.currentView = 'dashboard';
    }

    render();
}

// --- Actions ---

function downloadSalarySlip() {
    // 1. Select the element we want to print
    const element = document.getElementById('salary-slip-content');
    const btn = document.getElementById('download-btn');
    
    // 2. Configuration for the PDF
    const opt = {
        margin:       0.5,
        filename:     `Salary_Slip_${STATE.currentUser.name}_${new Date().getMonth()+1}_${new Date().getFullYear()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 }, // Higher scale = better quality
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // 3. User Feedback (Loading state)
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
    btn.disabled = true;

    // 4. Generate and Save
    html2pdf().set(opt).from(element).save().then(() => {
        // Reset button
        btn.innerHTML = originalContent;
        btn.disabled = false;
        showToast('Salary Slip Downloaded', 'success');
    }).catch(err => {
        console.error(err);
        btn.innerHTML = originalContent;
        btn.disabled = false;
        showToast('Error generating PDF', 'error');
    });
}


function updateLeaveStatus(leaveId, status) {
    const leaveIndex = STATE.leaves.findIndex(l => l.id === leaveId);
    if (leaveIndex !== -1) {
        // Update status
        STATE.leaves[leaveIndex].status = status;
        
        // Save to storage
        localStorage.setItem('dayflow_leaves', JSON.stringify(STATE.leaves));
        
        // User Feedback
        if (status === 'Approved') {
            showToast('Request Approved Successfully', 'success');
        } else {
            showToast('Request Rejected', 'info');
        }
        
        render(); // Refresh the workflow view
    }
}


function toggleAttendanceStatus() {
    const today = new Date().toISOString().split('T')[0];
    const user = STATE.currentUser;
    
    // Check if a record already exists for today
    const index = STATE.attendance.findIndex(a => a.userId === user.id && a.date === today);

    if (index !== -1) {
        // CASE: Record exists -> User clicked "Uncheck Now"
        // ACTION: Remove the record so it is "not considered"
        STATE.attendance.splice(index, 1);
        showToast('Attendance Unchecked (Record Removed)', 'info');
    } else {
        // CASE: No record -> User clicked "Check Now"
        // ACTION: Add the record so it is counted
        const newRecord = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            date: today,
            checkIn: new Date().toLocaleTimeString(),
            status: 'Present'
        };
        STATE.attendance.push(newRecord);
        showToast('Checked In Successfully', 'success');
    }

    // Save state and refresh view
    localStorage.setItem('dayflow_attendance', JSON.stringify(STATE.attendance));
    render();
}

function toggleAddEmployee() {
    STATE.adminIsAdding = !STATE.adminIsAdding;
    STATE.adminSelectedUserId = null; // Deselect any user when adding
    STATE.adminIsEditing = false;
    render();
}

function addEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const email = form.email.value;
    
    // Check if email exists
    if (STATE.users.find(u => u.email === email)) {
        showToast('Email already exists', 'error');
        return;
    }

    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: 'password123', // Default password
        role: form.role.value,
        position: form.position.value,
        department: form.department.value,
        salary: parseFloat(form.salary.value) || 0,
        phone: form.phone.value,
        address: form.address.value,
        joinedDate: new Date().toISOString().split('T')[0],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };

    STATE.users.push(newUser);
    localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
    
    showToast('Employee added successfully', 'success');
    STATE.adminIsAdding = false;
    render();
}

function deleteEmployee(userId) {
    const user = STATE.users.find(u => u.id === userId);
    if (!user) return;

    // Prevent deleting yourself
    if (user.id === STATE.currentUser.id) {
        showToast('You cannot delete your own admin account', 'error');
        return;
    }

    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
        // Remove user
        STATE.users = STATE.users.filter(u => u.id !== userId);
        // Clean up their data
        STATE.attendance = STATE.attendance.filter(a => a.userId !== userId);
        STATE.leaves = STATE.leaves.filter(l => l.userId !== userId);

        // Save to storage
        localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
        localStorage.setItem('dayflow_attendance', JSON.stringify(STATE.attendance));
        localStorage.setItem('dayflow_leaves', JSON.stringify(STATE.leaves));

        STATE.adminSelectedUserId = null; // Reset selection
        showToast('Employee deleted successfully', 'success');
        render();
    }
}

function selectPayrollUser(userId) {
    STATE.payrollSelectedUserId = userId;
    render();
}

function updatePayrollSalary(event) {
    event.preventDefault();
    const form = event.target;
    const newAnnualSalary = parseFloat(form.annualSalary.value);
    const userId = STATE.payrollSelectedUserId;

    if (isNaN(newAnnualSalary) || newAnnualSalary < 0) {
        showToast('Invalid salary amount', 'error');
        return;
    }

    const userIndex = STATE.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        // Update the user's salary in the main state
        STATE.users[userIndex].salary = newAnnualSalary;
        localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
        
        // Sync if updating self
        if (STATE.currentUser.id === userId) {
            STATE.currentUser.salary = newAnnualSalary;
            localStorage.setItem('dayflow_currentUser', JSON.stringify(STATE.currentUser));
        }

        showToast('Salary structure updated successfully', 'success');
        render();
    }
}


function selectAdminUser(userId) {
    STATE.adminSelectedUserId = userId;
    STATE.adminIsEditing = false; // Reset edit mode when switching users
    render();
}

function toggleAdminEdit() {
    STATE.adminIsEditing = !STATE.adminIsEditing;
    render();
}

function saveAdminEditUser(event) {
    event.preventDefault();
    const form = event.target;
    const userId = STATE.adminSelectedUserId;
    const userIndex = STATE.users.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
        // Admin can update ALL fields
        const updatedUser = {
            ...STATE.users[userIndex],
            name: form.name.value,
            role: form.role.value,
            position: form.position.value,
            department: form.department.value,
            salary: parseFloat(form.salary.value),
            joinedDate: form.joinedDate.value,
            phone: form.phone.value,
            address: form.address.value,
            avatar: form.avatar.value
        };

        STATE.users[userIndex] = updatedUser;
        localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));

        // Sync if Admin edited themselves
        if (STATE.currentUser.id === userId) {
            STATE.currentUser = updatedUser;
            localStorage.setItem('dayflow_currentUser', JSON.stringify(updatedUser));
        }

        showToast('Employee details updated successfully', 'success');
        STATE.adminIsEditing = false;
        render();
    }
}


function selectAdminUser(userId) {
    STATE.adminSelectedUserId = userId;
    render(); // Re-render to update the dashboard view
}

function login(email, password) {
    const user = STATE.users.find(u => u.email === email && u.password === password);
    if (user) {
        // Enforce Role Check
        if (STATE.selectedRole && user.role !== STATE.selectedRole) {
            showToast(`Access Denied: This account is not a ${STATE.selectedRole} account.`, 'error');
            return;
        }

        STATE.currentUser = user;
        STATE.currentView = 'dashboard';
        localStorage.setItem('dayflow_currentUser', JSON.stringify(user));
        showToast('Login Successful', 'success');
        render();
    } else {
        showToast('Invalid credentials', 'error');
    }
}

function selectRole(role) {
    STATE.selectedRole = role;
    STATE.authMode = 'login'; // Reset to login by default
    render();
}

function toggleAuthMode() {
    STATE.authMode = STATE.authMode === 'login' ? 'signup' : 'login';
    render();
}

function checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.'
        };
    }
    return { valid: true };
}

function generateStrongPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function register(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const strength = checkPasswordStrength(password);
    if (!strength.valid) {
        showToast(strength.message, 'error');
        // Suggest a strong password
        const suggested = generateStrongPassword();
        const suggestionEl = document.getElementById('password-suggestion');
        if (suggestionEl) {
            suggestionEl.innerHTML = `Weak password. Try this strong one: <span class="font-mono bg-gray-100 px-2 py-1 rounded cursor-pointer select-all" onclick="document.querySelector('[name=password]').value='${suggested}'; document.querySelector('[name=confirmPassword]').value='${suggested}';">${suggested}</span>`;
            suggestionEl.classList.remove('hidden');
        }
        return;
    }

    const existingUser = STATE.users.find(u => u.email === email);
    if (existingUser) {
        showToast('Email already registered', 'error');
        return;
    }

    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        role: 'employee', // Default role
        position: 'New Employee',
        department: 'General',
        phone: '',
        joinedDate: new Date().toISOString().split('T')[0],
        salary: 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };

    STATE.users.push(newUser);
    localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
    
    // Auto login
    STATE.currentUser = newUser;
    STATE.currentView = 'dashboard';
    localStorage.setItem('dayflow_currentUser', JSON.stringify(newUser));
    
    showToast('Registration successful! Welcome.', 'success');
    render();
}

function logout() {
    STATE.currentUser = null;
    STATE.currentView = 'login';
    localStorage.removeItem('dayflow_currentUser');
    showToast('Logged out', 'info');
    render();
}

function navigateTo(view) {
    STATE.currentView = view;
    render();
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'bg-blue-500');
    
    if (type === 'success') toast.classList.add('bg-green-500');
    else if (type === 'error') toast.classList.add('bg-red-500');
    else toast.classList.add('bg-blue-500');

    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function checkIn() {
    const today = new Date().toISOString().split('T')[0];
    const existing = STATE.attendance.find(a => a.userId === STATE.currentUser.id && a.date === today);
    
    if (existing) {
        showToast('You have already checked in today', 'error');
        return;
    }

    const newRecord = {
        id: Date.now(),
        userId: STATE.currentUser.id,
        userName: STATE.currentUser.name,
        date: today,
        checkIn: new Date().toLocaleTimeString(),
        status: 'Present'
    };

    STATE.attendance.push(newRecord);
    localStorage.setItem('dayflow_attendance', JSON.stringify(STATE.attendance));
    showToast('Checked in successfully', 'success');
    render();
}

function deleteLeave(leaveId) {
    if (confirm('Are you sure you want to delete this leave request?')) {
        STATE.leaves = STATE.leaves.filter(l => l.id !== leaveId);
        localStorage.setItem('dayflow_leaves', JSON.stringify(STATE.leaves));
        showToast('Leave request deleted', 'success');
        render();
    }
}

function applyLeave(event) {
    event.preventDefault();
    const form = event.target;
    const type = form.type.value;
    const startDate = form.startDate.value;
    const endDate = form.endDate.value;
    const reason = form.reason.value;

    const newLeave = {
        id: Date.now(),
        userId: STATE.currentUser.id,
        userName: STATE.currentUser.name,
        type,
        startDate,
        endDate,
        reason,
        status: 'Pending'
    };

    STATE.leaves.push(newLeave);
    localStorage.setItem('dayflow_leaves', JSON.stringify(STATE.leaves));
    showToast('Leave request submitted', 'success');
    render();
}

function updateLeaveStatus(leaveId, status) {
    const leave = STATE.leaves.find(l => l.id === leaveId);
    if (leave) {
        leave.status = status;
        localStorage.setItem('dayflow_leaves', JSON.stringify(STATE.leaves));
        showToast(`Leave request ${status}`, 'success');
        render();
    }
}

function applyAttendanceFilter(event) {
    event.preventDefault();
    const form = event.target;
    const type = form.filterType.value;
    const dateValue = form.filterDate.value;
    const weekValue = form.filterWeek.value;

    if (type === 'daily') {
        if (!dateValue) {
            showToast('Please select a date', 'error');
            return;
        }
        if (new Date(dateValue) > new Date()) {
            showToast('Cannot view future attendance', 'error');
            return;
        }
        STATE.attendanceFilter = { type, value: dateValue };
    } else if (type === 'weekly') {
        if (!weekValue) {
             showToast('Please select a week', 'error');
             return;
        }
        // Basic check to see if the week is in the future
        // weekValue is "2023-W01"
        const [year, week] = weekValue.split('-W');
        const currentYear = new Date().getFullYear();
        // getWeek() is not standard, let's just approximate check or just trust the input
        // Let's rely on simple string compare for year? No, that's weak.
        // Let's just allow it for now, but we can do better.
        // Actually, let's implement a better check.
        
        // Calculate the date of the start of that week
        const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
        if (simpleDate > new Date()) {
             showToast('Cannot view future attendance', 'error');
             return;
        }

        STATE.attendanceFilter = { type, value: weekValue };
    } else {
        STATE.attendanceFilter = { type: 'all', value: null };
    }
    render();
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

function formatMoney(amount) {
    return Number(amount).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });
}

function editSalary(userId, currentSalary) {
    const newSalary = prompt("Enter new annual salary (INR):", currentSalary);
    if (newSalary !== null && newSalary !== "") {
        const amount = parseFloat(newSalary);
        if (isNaN(amount) || amount < 0) {
            showToast('Invalid salary amount', 'error');
            return;
        }

        const userIndex = STATE.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            STATE.users[userIndex].salary = amount;
            localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
            
            // If updating self
            if (STATE.currentUser.id === userId) {
                STATE.currentUser.salary = amount;
                localStorage.setItem('dayflow_currentUser', JSON.stringify(STATE.currentUser));
            }
            
            showToast('Salary updated successfully', 'success');
            render();
        }
    }
}

function toggleEditProfile() {
    STATE.isEditingProfile = !STATE.isEditingProfile;
    render();
}

function saveProfile(event) {
    event.preventDefault();
    const form = event.target;
    const isAdmin = STATE.currentUser.role === 'admin';

    // 1. Common Fields (Everyone can edit)
    const updatedPhone = form.phone.value;
    const updatedAddress = form.address.value;
    const updatedAvatar = form.avatar.value;

    // 2. Restricted Fields (Only Admin can edit)
    // If user is employee, keep existing values. If Admin, take from form.
    const updatedName = isAdmin ? form.name.value : STATE.currentUser.name;
    const updatedSalary = isAdmin ? parseFloat(form.salary.value) : STATE.currentUser.salary;
    
    // Update Current User Object
    STATE.currentUser.name = updatedName;
    STATE.currentUser.phone = updatedPhone;
    STATE.currentUser.address = updatedAddress;
    STATE.currentUser.avatar = updatedAvatar; 
    STATE.currentUser.salary = updatedSalary;

    // Update Users Array
    const userIndex = STATE.users.findIndex(u => u.id === STATE.currentUser.id);
    if (userIndex !== -1) {
        STATE.users[userIndex] = STATE.currentUser;
        localStorage.setItem('dayflow_users', JSON.stringify(STATE.users));
        localStorage.setItem('dayflow_currentUser', JSON.stringify(STATE.currentUser));
        
        showToast('Profile updated successfully', 'success');
        STATE.isEditingProfile = false;
        render();
    }
}

// --- Render Logic ---
function renderFeedback() {
    return `
        <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-8 border-b border-gray-100 text-center bg-gray-50">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                        <i class="fab fa-google text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800">We Value Your Feedback</h2>
                    <p class="text-gray-500 mt-2">Found a bug? Have a suggestion? Send it directly to the admin via Gmail.</p>
                </div>

                <div class="p-8">
                    <form onsubmit="sendFeedback(event)" class="space-y-6">
                        <div class="bg-gray-50 p-4 rounded-lg flex items-center gap-3 border border-gray-200">
                            <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                ${STATE.currentUser.name.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">From: ${STATE.currentUser.name}</p>
                                <p class="text-xs text-gray-500">${STATE.currentUser.email}</p>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Your Message</label>
                            <textarea name="message" rows="6" class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none" placeholder="Type your feedback here..." required></textarea>
                        </div>

                        <button type="submit" class="w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center">
                            <i class="fab fa-google mr-2"></i> Compose in Gmail
                        </button>
                        
                        <p class="text-xs text-center text-gray-400 mt-4">
                            Clicking this will open a new tab in your Gmail with the message ready to send to <strong>ayushpadaliya1601@gmail.com</strong>.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;
}


function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (!STATE.currentUser) {
        if (!STATE.selectedRole) {
            app.innerHTML = renderRoleSelection();
        } else {
            if (STATE.authMode === 'signup' && STATE.selectedRole === 'employee') {
                app.innerHTML = renderSignup();
            } else {
                app.innerHTML = renderLogin();
            }
        }
    } else {
        // Layout with Sidebar and Main Content
        app.innerHTML = `
            ${renderSidebar()}
            <main class="flex-1 overflow-y-auto bg-gray-50 p-8">
                ${renderHeader()}
                <div class="mt-6">
                    ${renderContent()}
                </div>
            </main>
        `;
    }
}

function renderContent() {
    switch (STATE.currentView) {
        case 'dashboard': return renderDashboard();
        case 'profile': return renderProfile();
        case 'attendance': return renderAttendance();
        case 'leaves': return renderLeaves();
        case 'payroll': return renderPayroll();
        case 'feedback': return renderFeedback(); // <--- ADD THIS LINE
        default: return renderDashboard();
    }
}

// --- Component Views ---

function renderRoleSelection() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 text-center">
                <div>
                    <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
                        Welcome to Dayflow
                    </h2>
                    <p class="mt-2 text-sm text-gray-600">
                        Please select your role to continue
                    </p>
                </div>
                <div class="mt-8 space-y-4">
                    <button onclick="selectRole('employee')" class="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                            <i class="fas fa-user"></i>
                        </span>
                        I am an Employee
                    </button>
                    <button onclick="selectRole('admin')" class="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200">
                        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                            <i class="fas fa-user-shield"></i>
                        </span>
                        I am an Admin
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderLogin() {
    const isEmployee = STATE.selectedRole === 'employee';
    return `
        <div class="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-blue-500 to-purple-600">
            <div class="bg-white p-10 rounded-2xl shadow-2xl w-96">
                <div class="mb-4">
                     <button onclick="STATE.selectedRole = null; render()" class="text-gray-500 hover:text-gray-700 flex items-center text-sm">
                        <i class="fas fa-arrow-left mr-2"></i> Back
                     </button>
                </div>
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-800">Dayflow</h1>
                    <p class="text-gray-500">${isEmployee ? 'Employee Sign In' : 'Admin Sign In'}</p>
                </div>
                <form onsubmit="event.preventDefault(); login(this.email.value, this.password.value)">
                    ${!isEmployee ? `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Username (Name)</label>
                        <input type="text" name="username" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>` : ''}
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" name="password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200">Sign In</button>
                </form>
                 <div class="mt-4 text-center">
                    ${isEmployee ? `<p class="text-sm text-gray-600">Don't have an account? <a href="#" onclick="toggleAuthMode()" class="text-blue-600 hover:underline">Sign Up</a></p>` : ''}
                </div>
                
                </div>
        </div>
    `;
}


function renderSignup() {
    return `
        <div class="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-blue-500 to-purple-600">
            <div class="bg-white p-10 rounded-2xl shadow-2xl w-96">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-800">Dayflow</h1>
                    <p class="text-gray-500">Create a new account</p>
                </div>
                <form onsubmit="register(event)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" name="name" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" name="password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input type="password" name="confirmPassword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    
                    <div id="password-suggestion" class="hidden mb-4 p-2 text-xs text-red-600 bg-red-50 rounded border border-red-100"></div>

                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200">Sign Up</button>
                </form>
                <div class="mt-4 text-center">
                    <p class="text-sm text-gray-600">Already have an account? <a href="#" onclick="toggleAuthMode()" class="text-blue-600 hover:underline">Sign In</a></p>
                </div>
            </div>
        </div>
    `;
}

function renderSidebar() {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-home' },
        { id: 'profile', label: 'Profile', icon: 'fa-user' },
        { id: 'attendance', label: 'Attendance', icon: 'fa-clock' },
        { id: 'leaves', label: 'Leaves', icon: 'fa-calendar-alt' },
        { id: 'payroll', label: 'Payroll', icon: 'fa-money-bill-wave' },
        { id: 'feedback', label: 'Feedback', icon: 'fa-comment-dots' } // <--- ADD THIS LINE
    ];
    // ... rest of the function remains the same
    return `
        <aside class="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
            <div class="p-6 border-b border-gray-200 flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">D</div>
                <span class="text-xl font-bold text-gray-800">Dayflow</span>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                ${menuItems.map(item => `
                    <button onclick="navigateTo('${item.id}')" class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${STATE.currentView === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}">
                        <i class="fas ${item.icon} w-5"></i><span class="font-medium">${item.label}</span>
                    </button>
                `).join('')}
            </nav>
            <div class="p-4 border-t border-gray-200">
                <button onclick="logout()" class="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"><i class="fas fa-sign-out-alt w-5"></i><span>Logout</span></button>
            </div>
        </aside>`;
}


function renderHeader() {
    return `
        <header class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-gray-800 capitalize">${STATE.currentView}</h2>
                <p class="text-sm text-gray-500">Welcome back, ${STATE.currentUser.name}</p>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2">
                    <img src="${STATE.currentUser.avatar}" class="w-10 h-10 rounded-full border border-gray-200">
                    <div class="text-right hidden sm:block">
                        <p class="text-sm font-medium text-gray-900">${STATE.currentUser.name}</p>
                        <p class="text-xs text-gray-500 capitalize">${STATE.currentUser.role}</p>
                    </div>
                </div>
            </div>
        </header>
    `;
}

// --- Placeholder Views (to be implemented next) ---
function renderDashboard() {
    const isAdmin = STATE.currentUser.role === 'admin';
    
    // --- EMPLOYEE DASHBOARD (Collapsing for brevity - reuse your existing code) ---
    // ... inside renderDashboard() ...

if (!isAdmin) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if record exists
    const isCheckedIn = STATE.attendance.find(a => a.userId === STATE.currentUser.id && a.date === today);
    const myLeaves = STATE.leaves.filter(l => l.userId === STATE.currentUser.id && l.status === 'Pending').length;

    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-sm font-medium text-gray-500">Attendance Status</p>
                        <h3 class="text-xl font-bold ${isCheckedIn ? 'text-green-600' : 'text-gray-800'} mt-2">
                            ${isCheckedIn ? 'Present (Counted)' : 'Not Marked'}
                        </h3>
                    </div>
                    <div class="p-3 ${isCheckedIn ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'} rounded-lg">
                        <i class="fas fa-clock text-xl"></i>
                    </div>
                </div>
                
                <button onclick="toggleAttendanceStatus()" 
                    class="mt-4 w-full py-2 text-white rounded-lg text-sm font-medium transition-colors ${isCheckedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}">
                    ${isCheckedIn ? 'Uncheck Now' : 'Check Now'}
                </button>
                
                <p class="text-xs text-center mt-2 text-gray-400">
                    ${isCheckedIn ? 'Click to remove attendance' : 'Click to mark attendance'}
                </p>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-sm font-medium text-gray-500">Pending Leaves</p>
                        <h3 class="text-3xl font-bold text-gray-800 mt-2">${myLeaves}</h3>
                    </div>
                    <div class="p-3 bg-yellow-50 rounded-lg text-yellow-600">
                        <i class="fas fa-calendar-minus text-xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Welcome, ${STATE.currentUser.name}!</h3>
            <p class="text-gray-600">You are logged in as an Employee.</p>
        </div>
    `;
}

// ... rest of Admin logic ...
    // --- ADMIN DASHBOARD (With Add/Delete) ---

    // Filter out only employees for the list (Admin can see employees)
    // Note: You might want to remove `.filter(u => u.role === 'employee')` if you want to see other admins too.
    const employees = STATE.users.filter(u => u.role === 'employee'); 
    const selectedUser = STATE.adminSelectedUserId ? STATE.users.find(u => u.id === STATE.adminSelectedUserId) : null;
    
    // Left Column: Employee List + ADD BUTTON
    const employeeListHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
            <div class="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-gray-700">Employees</h3>
                    <p class="text-xs text-gray-500">Manage Staff</p>
                </div>
                <button onclick="toggleAddEmployee()" class="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm" title="Add New Employee">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="overflow-y-auto flex-1 p-2 space-y-2">
                <div onclick="selectAdminUser(null); STATE.adminIsAdding=false;" class="cursor-pointer p-3 rounded-lg flex items-center gap-3 transition-colors ${!selectedUser && !STATE.adminIsAdding ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'}">
                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><i class="fas fa-chart-pie"></i></div>
                    <div><p class="text-sm font-semibold text-gray-800">Dashboard</p><p class="text-xs text-gray-500">Overview</p></div>
                </div>
                ${employees.map(emp => `
                    <div onclick="selectAdminUser(${emp.id})" class="cursor-pointer p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedUser && selectedUser.id === emp.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'}">
                        <img src="${emp.avatar}" class="w-8 h-8 rounded-full object-cover">
                        <div class="overflow-hidden">
                            <p class="text-sm font-semibold text-gray-800 truncate">${emp.name}</p>
                            <p class="text-xs text-gray-500 truncate">${emp.position}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Right Column: Content Logic
    let mainContentHTML = '';

    if (STATE.adminIsAdding) {
        // --- ADD EMPLOYEE FORM ---
        mainContentHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-800">Add New Employee</h2>
                    <button onclick="toggleAddEmployee()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i> Cancel</button>
                </div>
                <form onsubmit="addEmployee(event)">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="col-span-2 bg-blue-50 p-3 rounded text-sm text-blue-800 mb-2">
                            <i class="fas fa-info-circle mr-2"></i> Default password for new users is <strong>password123</strong>
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" name="name" class="w-full px-3 py-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" class="w-full px-3 py-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select name="role" class="w-full px-3 py-2 border rounded-lg">
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Position</label><input type="text" name="position" placeholder="e.g. Developer" class="w-full px-3 py-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" name="department" placeholder="e.g. Engineering" class="w-full px-3 py-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Annual Salary (INR)</label><input type="number" name="salary" placeholder="0" class="w-full px-3 py-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" name="phone" class="w-full px-3 py-2 border rounded-lg"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" name="address" class="w-full px-3 py-2 border rounded-lg"></div>
                    </div>
                    <div class="mt-6 flex justify-end gap-3">
                        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Employee</button>
                    </div>
                </form>
            </div>
        `;
    } else if (!selectedUser) {
        // --- GLOBAL STATS (Default View) ---
        const totalEmployees = employees.length;
        const pendingLeavesList = STATE.leaves.filter(l => l.status === 'Pending');
        const presentToday = STATE.attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length;

        mainContentHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div><p class="text-xs text-gray-500">Total Employees</p><h3 class="text-2xl font-bold text-gray-800">${totalEmployees}</h3></div>
                    <div class="p-2 bg-blue-50 rounded-lg text-blue-600"><i class="fas fa-users"></i></div>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div><p class="text-xs text-gray-500">Present Today</p><h3 class="text-2xl font-bold text-gray-800">${presentToday}</h3></div>
                    <div class="p-2 bg-green-50 rounded-lg text-green-600"><i class="fas fa-check-circle"></i></div>
                </div>
                 <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div><p class="text-xs text-gray-500">Pending Leaves</p><h3 class="text-2xl font-bold text-gray-800">${pendingLeavesList.length}</h3></div>
                    <div class="p-2 bg-yellow-50 rounded-lg text-yellow-600"><i class="fas fa-clock"></i></div>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100"><h3 class="font-bold text-gray-800">All Pending Approvals</h3></div>
                <div class="divide-y divide-gray-100">
                    ${pendingLeavesList.length ? pendingLeavesList.map(l => `
                        <div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div><span class="font-bold text-gray-900 text-sm">${l.userName}</span> <span class="text-xs text-gray-500">wants ${l.type}</span></div>
                            <div class="flex gap-2">
                                <button onclick="updateLeaveStatus(${l.id}, 'Approved')" class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200">Approve</button>
                                <button onclick="updateLeaveStatus(${l.id}, 'Rejected')" class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">Reject</button>
                            </div>
                        </div>
                    `).join('') : `<div class="p-4 text-center text-sm text-gray-500">No pending requests.</div>`}
                </div>
            </div>
        `;
    } else if (STATE.adminIsEditing) {
        // --- ADMIN EDIT FORM ---
        mainContentHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-800">Edit: ${selectedUser.name}</h2>
                    <button onclick="toggleAdminEdit()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i> Cancel</button>
                </div>
                <form onsubmit="saveAdminEditUser(event)">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                            <input type="text" name="avatar" value="${selectedUser.avatar}" class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" name="name" value="${selectedUser.name}" class="w-full px-3 py-2 border rounded-lg" required></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select name="role" class="w-full px-3 py-2 border rounded-lg">
                                <option value="employee" ${selectedUser.role === 'employee' ? 'selected' : ''}>Employee</option>
                                <option value="admin" ${selectedUser.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Position</label><input type="text" name="position" value="${selectedUser.position}" class="w-full px-3 py-2 border rounded-lg"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" name="department" value="${selectedUser.department}" class="w-full px-3 py-2 border rounded-lg"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Salary (Annual)</label><input type="number" name="salary" value="${selectedUser.salary}" class="w-full px-3 py-2 border rounded-lg"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Joined Date</label><input type="date" name="joinedDate" value="${selectedUser.joinedDate}" class="w-full px-3 py-2 border rounded-lg"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" name="phone" value="${selectedUser.phone || ''}" class="w-full px-3 py-2 border rounded-lg"></div>
                        <div class="col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" name="address" value="${selectedUser.address || ''}" class="w-full px-3 py-2 border rounded-lg"></div>
                    </div>
                    <div class="mt-6 flex justify-end gap-3">
                        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
    } else {
        // --- READ ONLY DETAILS + DELETE BUTTON ---
        mainContentHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <div class="relative flex justify-between items-end mt-8 px-2">
                    <div class="flex items-end gap-4">
                        <img src="${selectedUser.avatar}" class="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white">
                        <div class="mb-1">
                            <h2 class="text-2xl font-bold text-gray-800">${selectedUser.name}</h2>
                            <p class="text-gray-500 font-medium">${selectedUser.position}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 mb-2">
                        <button onclick="toggleAdminEdit()" class="px-4 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-bold">
                            <i class="fas fa-edit mr-2"></i>Edit
                        </button>
                        <button onclick="deleteEmployee(${selectedUser.id})" class="px-4 py-2 bg-red-600 border border-red-600 shadow-sm text-white rounded-lg hover:bg-red-700 text-sm font-bold">
                            <i class="fas fa-trash-alt mr-2"></i>Delete
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="font-bold text-gray-800 mb-4 border-b pb-2">Personal & Job Details</h3>
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div><p class="text-xs text-gray-400">Department</p><p class="text-sm font-medium text-gray-800">${selectedUser.department}</p></div>
                            <div><p class="text-xs text-gray-400">Joined Date</p><p class="text-sm font-medium text-gray-800">${selectedUser.joinedDate}</p></div>
                            <div><p class="text-xs text-gray-400">Email</p><p class="text-sm font-medium text-gray-800 truncate">${selectedUser.email}</p></div>
                            <div><p class="text-xs text-gray-400">Phone</p><p class="text-sm font-medium text-gray-800">${selectedUser.phone || 'N/A'}</p></div>
                            <div class="col-span-2"><p class="text-xs text-gray-400">Address</p><p class="text-sm font-medium text-gray-800">${selectedUser.address || 'No address provided'}</p></div>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="font-bold text-gray-800 mb-4 border-b pb-2">Salary Structure</h3>
                    <div class="flex justify-between items-end mb-4">
                        <div><p class="text-xs text-gray-500">Annual CTC</p><p class="text-xl font-bold text-gray-900">${formatMoney(selectedUser.salary)}</p></div>
                        <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm"><span class="text-gray-500">Basic (50%)</span><span class="font-medium">${formatMoney(selectedUser.salary/24)}/mo</span></div>
                        <div class="border-t pt-2 mt-2 flex justify-between text-sm font-bold"><span class="text-gray-800">Gross Monthly</span><span>${formatMoney(selectedUser.salary/12)}</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="flex flex-col md:flex-row gap-6 h-full">
            <div class="w-full md:w-1/4 shrink-0">${employeeListHTML}</div>
            <div class="flex-1 overflow-y-auto pr-2">${mainContentHTML}</div>
        </div>
    `;
}

function renderProfile() {
    const user = STATE.currentUser;
    const isAdmin = user.role === 'admin';

    if (STATE.isEditingProfile) {
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl mx-auto">
                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-gray-800">Edit My Profile</h2>
                    <button onclick="toggleEditProfile()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i> Cancel</button>
                </div>
                <form onsubmit="saveProfile(event)" class="p-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="md:col-span-2 flex items-center space-x-6 mb-4">
                            <img src="${user.avatar}" class="w-20 h-20 rounded-full border-2 border-gray-200">
                            <div class="flex-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                                <input type="text" name="avatar" value="${user.avatar}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name ${!isAdmin ? '<span class="text-xs text-red-500">(Contact HR to change)</span>' : ''}</label>
                            <input type="text" name="name" value="${user.name}" ${!isAdmin ? 'disabled class="w-full px-4 py-2 border bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"' : 'class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"'} required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input type="text" name="phone" value="${user.phone || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Annual Salary (INR)</label>
                            <input type="number" name="salary" value="${user.salary}" ${!isAdmin ? 'disabled class="w-full px-4 py-2 border bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"' : 'class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"'} required>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input type="text" name="address" value="${user.address || ''}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Street, City, State, Zip">
                        </div>

                        <div><label class="block text-sm font-medium text-gray-400 mb-1">Role</label><input type="text" value="${user.role}" disabled class="w-full px-4 py-2 border bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed capitalize"></div>
                        <div><label class="block text-sm font-medium text-gray-400 mb-1">Department</label><input type="text" value="${user.department}" disabled class="w-full px-4 py-2 border bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"></div>
                    </div>

                    <div class="mt-8 flex justify-end space-x-4">
                        <button type="button" onclick="toggleEditProfile()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
    }

    // Default Profile View (Keep your existing one or simple return here)
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <div class="px-8 pb-8 relative">
                <div class="-mt-12 mb-6"><img src="${user.avatar}" class="w-24 h-24 rounded-full border-4 border-white shadow-md"></div>
                <div class="flex justify-between items-start mb-8">
                    <div><h2 class="text-2xl font-bold text-gray-900">${user.name}</h2><p class="text-gray-500">${user.position} • ${user.department}</p></div>
                    <button onclick="toggleEditProfile()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"><i class="fas fa-pen mr-2"></i>Edit Profile</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h4>
                        <div class="space-y-4">
                            <div><label class="text-xs text-gray-400">Email Address</label><p class="text-gray-900 font-medium">${user.email}</p></div>
                            <div><label class="text-xs text-gray-400">Phone</label><p class="text-gray-900 font-medium">${user.phone || 'Not provided'}</p></div>
                            <div><label class="text-xs text-gray-400">Address</label><p class="text-gray-900 font-medium">${user.address || 'Not provided'}</p></div>
                        </div>
                    </div>
                     <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Employment Details</h4>
                        <div class="space-y-4">
                            <div><label class="text-xs text-gray-400">Employee ID</label><p class="text-gray-900 font-medium">EMP-${user.id.toString().padStart(4, '0')}</p></div>
                            <div><label class="text-xs text-gray-400">Role</label><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">${user.role}</span></div>
                              <div><label class="text-xs text-gray-400">Annual Salary</label><p class="text-gray-900 font-medium">${formatMoney(user.salary)}</p></div>
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    `;
}


function renderAttendance() {
    const isAdmin = STATE.currentUser.role === 'admin';
    let records = isAdmin ? STATE.attendance : STATE.attendance.filter(a => a.userId === STATE.currentUser.id);

    // Apply Filter
    if (STATE.attendanceFilter.type === 'daily' && STATE.attendanceFilter.value) {
        records = records.filter(r => r.date === STATE.attendanceFilter.value);
    } else if (STATE.attendanceFilter.type === 'weekly' && STATE.attendanceFilter.value) {
        // weekValue is "2023-W01"
        const [year, week] = STATE.attendanceFilter.value.split('-W');
        records = records.filter(r => {
            const d = new Date(r.date);
            const rYear = d.getFullYear();
            const rWeek = getWeekNumber(d);
            return rYear == year && rWeek == week;
        });
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
             <div class="p-6 border-b border-gray-100">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Filter Attendance</h3>
                <form onsubmit="applyAttendanceFilter(event)" class="flex flex-col md:flex-row gap-4 items-end">
                    <div class="w-full md:w-auto">
                        <label class="block text-sm font-medium text-gray-700 mb-1">View Type</label>
                        <select name="filterType" onchange="document.getElementById('dailyInput').classList.toggle('hidden', this.value !== 'daily'); document.getElementById('weeklyInput').classList.toggle('hidden', this.value !== 'weekly');" class="w-full md:w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all" ${STATE.attendanceFilter.type === 'all' ? 'selected' : ''}>All History</option>
                            <option value="daily" ${STATE.attendanceFilter.type === 'daily' ? 'selected' : ''}>Daily View</option>
                            <option value="weekly" ${STATE.attendanceFilter.type === 'weekly' ? 'selected' : ''}>Weekly View</option>
                        </select>
                    </div>
                    
                    <div id="dailyInput" class="w-full md:w-auto ${STATE.attendanceFilter.type !== 'daily' ? 'hidden' : ''}">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                        <input type="date" name="filterDate" value="${STATE.attendanceFilter.type === 'daily' ? STATE.attendanceFilter.value : ''}" class="w-full md:w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div id="weeklyInput" class="w-full md:w-auto ${STATE.attendanceFilter.type !== 'weekly' ? 'hidden' : ''}">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Select Week</label>
                        <input type="week" name="filterWeek" value="${STATE.attendanceFilter.type === 'weekly' ? STATE.attendanceFilter.value : ''}" class="w-full md:w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <button type="submit" class="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply Filter</button>
                    ${STATE.attendanceFilter.type !== 'all' ? `<button type="button" onclick="STATE.attendanceFilter = {type:'all', value:null}; render();" class="w-full md:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Clear</button>` : ''}
                </form>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 class="text-lg font-bold text-gray-800">Attendance Records (${records.length})</h3>
                ${!isAdmin ? `<button onclick="checkIn()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Check In Today</button>` : ''}
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th class="px-6 py-3 font-medium">Date</th>
                            <th class="px-6 py-3 font-medium">Employee</th>
                            <th class="px-6 py-3 font-medium">Check In</th>
                            <th class="px-6 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${records.length ? records.map(r => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 text-sm text-gray-900">${r.date}</td>
                                <td class="px-6 py-4 text-sm text-gray-600">${r.userName}</td>
                                <td class="px-6 py-4 text-sm text-gray-600">${r.checkIn}</td>
                                <td class="px-6 py-4">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        ${r.status}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No attendance records found for this selection.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}


function renderLeaves() {
    const isAdmin = STATE.currentUser.role === 'admin';
    
    // --- ADMIN APPROVAL WORKFLOW DASHBOARD ---
    if (isAdmin) {
        // 1. Sort Data
        const pendingRequests = STATE.leaves.filter(l => l.status === 'Pending').sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
        const historyRequests = STATE.leaves.filter(l => l.status !== 'Pending').sort((a,b) => new Date(b.startDate) - new Date(a.startDate)); // Newest first

        return `
            <div class="space-y-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-blue-600 text-white p-6 rounded-xl shadow-md">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-blue-100 text-sm font-medium">Action Required</p>
                                <h3 class="text-3xl font-bold mt-1">${pendingRequests.length}</h3>
                            </div>
                            <div class="p-3 bg-blue-500 rounded-lg"><i class="fas fa-inbox text-2xl"></i></div>
                        </div>
                        <p class="text-xs text-blue-200 mt-4">Pending Leave Requests</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-gray-500 text-sm font-medium">Total Processed</p>
                                <h3 class="text-3xl font-bold text-gray-800 mt-1">${historyRequests.length}</h3>
                            </div>
                            <div class="p-3 bg-gray-50 rounded-lg text-gray-400"><i class="fas fa-history text-2xl"></i></div>
                        </div>
                        <p class="text-xs text-gray-400 mt-4">All time history</p>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="p-6 border-b border-gray-100 bg-blue-50">
                        <h3 class="text-lg font-bold text-gray-800 flex items-center">
                            <i class="fas fa-tasks mr-2 text-blue-600"></i> Approval Queue
                        </h3>
                        <p class="text-sm text-gray-500">Review and act on employee leave applications.</p>
                    </div>
                    
                    <div class="divide-y divide-gray-100">
                        ${pendingRequests.length ? pendingRequests.map(l => `
                            <div class="p-6 hover:bg-gray-50 transition-colors">
                                <div class="flex flex-col md:flex-row justify-between gap-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                ${l.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 class="font-bold text-gray-900">${l.userName}</h4>
                                                <p class="text-xs text-gray-500">Applied on: ${new Date(l.id).toLocaleDateString()}</p>
                                            </div>
                                            <span class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
                                                <i class="fas fa-clock mr-1"></i> Awaiting Action
                                            </span>
                                        </div>
                                        
                                        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <div>
                                                <p class="text-xs text-gray-400 uppercase">Leave Type</p>
                                                <p class="font-medium text-gray-800">${l.type}</p>
                                            </div>
                                            <div>
                                                <p class="text-xs text-gray-400 uppercase">Duration</p>
                                                <p class="font-medium text-gray-800">${l.startDate} <span class="text-gray-400">to</span> ${l.endDate}</p>
                                            </div>
                                            <div class="md:col-span-2">
                                                <p class="text-xs text-gray-400 uppercase">Reason</p>
                                                <p class="text-sm text-gray-600 italic">"${l.reason}"</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex flex-col justify-center gap-2 min-w-[140px]">
                                        <button onclick="updateLeaveStatus(${l.id}, 'Approved')" class="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm text-sm font-bold transition-transform active:scale-95 flex items-center justify-center">
                                            <i class="fas fa-check mr-2"></i> Approve
                                        </button>
                                        <button onclick="updateLeaveStatus(${l.id}, 'Rejected')" class="w-full py-2 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors flex items-center justify-center">
                                            <i class="fas fa-times mr-2"></i> Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="p-12 text-center">
                                <div class="inline-block p-4 rounded-full bg-green-50 text-green-500 mb-3">
                                    <i class="fas fa-check-double text-3xl"></i>
                                </div>
                                <h3 class="text-gray-900 font-medium">All Caught Up!</h3>
                                <p class="text-gray-500 text-sm">There are no pending leave requests to review.</p>
                            </div>
                        `}
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800">History Log</h3>
                        <span class="text-xs text-gray-500">Past decisions</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th class="px-6 py-3 font-medium">Employee</th>
                                    <th class="px-6 py-3 font-medium">Details</th>
                                    <th class="px-6 py-3 font-medium">Dates</th>
                                    <th class="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${historyRequests.map(l => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-bold text-gray-900">${l.userName}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <span class="text-sm text-gray-800">${l.type}</span>
                                            <p class="text-xs text-gray-400 truncate max-w-xs">${l.reason}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-xs text-gray-500">${l.startDate}</p>
                                            <p class="text-xs text-gray-500">to ${l.endDate}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${l.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                <i class="fas ${l.status === 'Approved' ? 'fa-check' : 'fa-ban'} mr-1.5"></i> ${l.status}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } 

    // --- EMPLOYEE VIEW (My Applications) ---
    else {
        const myLeaves = STATE.leaves.filter(l => l.userId === STATE.currentUser.id).sort((a,b) => b.id - a.id);

        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="p-2 bg-blue-50 rounded text-blue-600"><i class="fas fa-paper-plane"></i></div>
                            <h3 class="text-lg font-bold text-gray-800">Apply for Leave</h3>
                        </div>
                        <form onsubmit="applyLeave(event)" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                <select name="type" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Privilege Leave">Privilege Leave</option>
                                    <option value="Unpaid Leave">Unpaid Leave</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">From</label>
                                    <input type="date" name="startDate" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">To</label>
                                    <input type="date" name="endDate" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <textarea name="reason" rows="3" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Please describe briefly..." required></textarea>
                            </div>
                            <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-bold shadow-md shadow-blue-200">Submit Application</button>
                        </form>
                    </div>
                </div>

                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div class="p-6 border-b border-gray-100 bg-gray-50">
                            <h3 class="text-lg font-bold text-gray-800">My Application History</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-white text-gray-500 text-xs uppercase border-b">
                                    <tr>
                                        <th class="px-6 py-4 font-medium">Type / Reason</th>
                                        <th class="px-6 py-4 font-medium">Duration</th>
                                        <th class="px-6 py-4 font-medium">Workflow Status</th>
                                        <th class="px-6 py-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${myLeaves.length ? myLeaves.map(l => `
                                        <tr class="hover:bg-gray-50 group transition-colors">
                                            <td class="px-6 py-4">
                                                <p class="text-sm font-bold text-gray-900">${l.type}</p>
                                                <p class="text-xs text-gray-500 italic truncate max-w-[150px]">${l.reason}</p>
                                            </td>
                                            <td class="px-6 py-4">
                                                <p class="text-sm text-gray-600 whitespace-nowrap">${l.startDate}</p>
                                                <p class="text-xs text-gray-400">to ${l.endDate}</p>
                                            </td>
                                            <td class="px-6 py-4">
                                                ${l.status === 'Pending' 
                                                    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><span class="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5 animate-pulse"></span> Pending Approval</span>` 
                                                    : l.status === 'Approved'
                                                    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1.5"></i> Approved</span>`
                                                    : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><i class="fas fa-times-circle mr-1.5"></i> Rejected</span>`
                                                }
                                            </td>
                                            <td class="px-6 py-4 text-right">
                                                ${l.status === 'Pending' ? `
                                                    <button onclick="deleteLeave(${l.id})" class="text-gray-400 hover:text-red-600 transition-colors p-2" title="Withdraw Request">
                                                        <i class="fas fa-trash-alt"></i>
                                                    </button>
                                                ` : '<span class="text-xs text-gray-300">Closed</span>'}
                                            </td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="4" class="px-6 py-12 text-center text-gray-400 italic">You haven't applied for any leaves yet.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderPayroll() {
    const isAdmin = STATE.currentUser.role === 'admin';

    // --- EMPLOYEE VIEW (With Download Logic) ---
    if (!isAdmin) {
        const user = STATE.currentUser;
        const monthlySalary = user.salary / 12;
        const basic = monthlySalary * 0.5;
        const hra = monthlySalary * 0.3;
        const allowances = monthlySalary * 0.2;

        return `
            <div class="max-w-4xl mx-auto">
                <div id="salary-slip-content" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div class="p-8 border-b border-gray-200 bg-gray-50">
                        <div class="flex justify-between items-start">
                            <div>
                                <h2 class="text-2xl font-bold text-gray-900">Salary Slip</h2>
                                <p class="text-gray-500">View Only • ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div class="text-right">
                                <h3 class="text-xl font-bold text-gray-900">Dayflow Inc.</h3>
                                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">PAID</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-8">
                        <div class="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee Details</h4>
                                <p class="text-gray-900 font-medium text-lg">${user.name}</p>
                                <p class="text-sm text-gray-600">${user.position}</p>
                                <p class="text-sm text-gray-600">EMP-${user.id.toString().padStart(4, '0')}</p>
                            </div>
                             <div class="text-right">
                                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Details</h4>
                                <p class="text-gray-900 font-medium">Bank Transfer</p>
                                <p class="text-sm text-gray-600">HDFC Bank • **** 1234</p>
                            </div>
                        </div>

                        <div class="border rounded-lg overflow-hidden mb-8">
                            <table class="w-full">
                                <thead class="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th class="px-6 py-3 text-left">Earnings</th>
                                        <th class="px-6 py-3 text-right">Amount (INR)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <tr><td class="px-6 py-4 text-sm text-gray-900">Basic Salary</td><td class="px-6 py-4 text-sm text-gray-900 text-right">${formatMoney(basic)}</td></tr>
                                    <tr><td class="px-6 py-4 text-sm text-gray-900">House Rent Allowance (HRA)</td><td class="px-6 py-4 text-sm text-gray-900 text-right">${formatMoney(hra)}</td></tr>
                                    <tr><td class="px-6 py-4 text-sm text-gray-900">Special Allowances</td><td class="px-6 py-4 text-sm text-gray-900 text-right">${formatMoney(allowances)}</td></tr>
                                    <tr class="bg-blue-50 font-bold">
                                        <td class="px-6 py-4 text-gray-900">Net Payable</td>
                                        <td class="px-6 py-4 text-gray-900 text-right">${formatMoney(monthlySalary)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="text-center text-xs text-gray-400">
                            System generated slip. Signature not required.
                        </div>
                    </div>
                </div>

                <div class="text-center">
                    <button id="download-btn" onclick="downloadSalarySlip()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium flex items-center justify-center mx-auto">
                        <i class="fas fa-file-pdf mr-2"></i> Download PDF
                    </button>
                </div>
            </div>
        `;
    }

    // --- ADMIN VIEW (Payroll Control) ---
    
    const employees = STATE.users.filter(u => u.role === 'employee');
    const selectedUser = STATE.payrollSelectedUserId ? STATE.users.find(u => u.id === STATE.payrollSelectedUserId) : null;

    // 1. Sidebar List
    const employeeListHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
            <div class="p-4 border-b border-gray-100 bg-gray-50">
                <h3 class="font-bold text-gray-700">Payroll Directory</h3>
                <p class="text-xs text-gray-500">Select to manage salary</p>
            </div>
            <div class="overflow-y-auto flex-1 p-2 space-y-2">
                <div onclick="selectPayrollUser(null)" class="cursor-pointer p-3 rounded-lg flex items-center gap-3 transition-colors ${!selectedUser ? 'bg-green-50 border-green-200 border' : 'hover:bg-gray-50 border border-transparent'}">
                    <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><i class="fas fa-money-bill-wave"></i></div>
                    <div><p class="text-sm font-semibold text-gray-800">Overview</p><p class="text-xs text-gray-500">Company Wide</p></div>
                </div>
                ${employees.map(emp => `
                    <div onclick="selectPayrollUser(${emp.id})" class="cursor-pointer p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedUser && selectedUser.id === emp.id ? 'bg-green-50 border-green-200 border' : 'hover:bg-gray-50 border border-transparent'}">
                        <img src="${emp.avatar}" class="w-8 h-8 rounded-full object-cover">
                        <div class="overflow-hidden">
                            <p class="text-sm font-semibold text-gray-800 truncate">${emp.name}</p>
                            <p class="text-xs text-gray-500 truncate">${formatMoney(emp.salary/12)}/mo</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // 2. Main Content Logic
    let mainContentHTML = '';

    if (!selectedUser) {
        // --- GLOBAL PAYROLL STATS ---
        const totalAnnual = employees.reduce((sum, emp) => sum + emp.salary, 0);
        const totalMonthly = totalAnnual / 12;
        const avgSalary = employees.length ? (totalAnnual / employees.length) : 0;

        mainContentHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm font-medium text-gray-500">Total Monthly Payout</p>
                    <h3 class="text-3xl font-bold text-gray-800 mt-2">${formatMoney(totalMonthly)}</h3>
                    <div class="mt-4 w-full bg-gray-200 rounded-full h-1.5"><div class="bg-green-500 h-1.5 rounded-full" style="width: 70%"></div></div>
                    <p class="text-xs text-gray-400 mt-2">Projection for next month</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm font-medium text-gray-500">Average Annual Salary</p>
                    <h3 class="text-3xl font-bold text-gray-800 mt-2">${formatMoney(avgSalary)}</h3>
                    <p class="text-xs text-gray-400 mt-2">Across ${employees.length} employees</p>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-gray-800">Payroll Rollout Status</h3>
                    <button class="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">Process All</button>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr><th class="px-6 py-3">Employee</th><th class="px-6 py-3">Salary</th><th class="px-6 py-3">Status</th></tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${employees.map(u => `
                            <tr>
                                <td class="px-6 py-4 text-sm font-medium text-gray-900">${u.name}</td>
                                <td class="px-6 py-4 text-sm text-gray-500">${formatMoney(u.salary)}</td>
                                <td class="px-6 py-4"><span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Ready</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // --- INDIVIDUAL PAYROLL EDIT ---
        const monthly = selectedUser.salary / 12;
        const basic = monthly * 0.5;
        const hra = monthly * 0.3;
        const allowances = monthly * 0.2;

        mainContentHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <div class="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
                    <img src="${selectedUser.avatar}" class="w-16 h-16 rounded-full border border-gray-200">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">${selectedUser.name}</h2>
                        <p class="text-gray-500 text-sm">${selectedUser.position}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 class="font-bold text-gray-800 mb-4">Update Salary Structure</h3>
                        <form onsubmit="updatePayrollSalary(event)" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Annual CTC (INR)</label>
                                <div class="relative rounded-md shadow-sm">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-500 sm:text-sm">₹</span>
                                    </div>
                                    <input type="number" name="annualSalary" value="${selectedUser.salary}" class="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 py-3 border-gray-300 rounded-md bg-gray-50 border" placeholder="0.00">
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Updating this will auto-calculate Basic, HRA & Allowances.</p>
                            </div>
                            <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Update Structure</button>
                        </form>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-4">Monthly Breakdown</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Basic Salary (50%)</span>
                                <span class="font-medium text-gray-900">${formatMoney(basic)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">HRA (30%)</span>
                                <span class="font-medium text-gray-900">${formatMoney(hra)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Special Allowances (20%)</span>
                                <span class="font-medium text-gray-900">${formatMoney(allowances)}</span>
                            </div>
                            <div class="border-t border-gray-300 pt-3 mt-3 flex justify-between items-center">
                                <span class="font-bold text-gray-800">Gross Monthly</span>
                                <span class="text-lg font-bold text-green-600">${formatMoney(monthly)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
             <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div class="flex">
                    <div class="flex-shrink-0"><i class="fas fa-exclamation-triangle text-yellow-400"></i></div>
                    <div class="ml-3">
                        <p class="text-sm text-yellow-700">
                            Ensure all tax deductions and provident fund calculations are reviewed before processing the final payroll batch.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    // --- FINAL ADMIN LAYOUT ---
    return `
        <div class="flex flex-col md:flex-row gap-6 h-full">
            <div class="w-full md:w-1/4 shrink-0">${employeeListHTML}</div>
            <div class="flex-1 overflow-y-auto pr-2">${mainContentHTML}</div>
        </div>
    `;
}

// --- Feedback ---
// --- Feedback ---
function sendFeedback(event) {
    event.preventDefault();
    const form = event.target;
    const message = form.message.value;
    
    // 1. Prepare Data
    const targetEmail = "ayushpadaliya1601@gmail.com";
    const subject = encodeURIComponent("Dayflow App Feedback");
    
    // Create a structured body
    const bodyContent = `Feedback submitted by:
Name: ${STATE.currentUser.name}
Email: ${STATE.currentUser.email}
Role: ${STATE.currentUser.role}

--- Message ---
${message}`;
    
    const body = encodeURIComponent(bodyContent);

    // 2. Open Gmail Web Compose Window
    // This URL specifically targets Gmail's compose screen
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${targetEmail}&su=${subject}&body=${body}`;
    
    // 3. Open in new tab
    window.open(gmailUrl, '_blank');
    
    showToast('Redirecting to Gmail...', 'info');
    form.reset();
}

// Start App
init();
