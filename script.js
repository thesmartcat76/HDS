function move(page){
    window.location.href = String(page)
};

// --- Sign-in handling with password protection ---
const HDS_USERS_KEY = 'hds_users';
const HDS_CURRENT_USER_KEY = 'hds_current_user';

async function initializeTHDCCAccount(){
    const users = getUsers();
    if(!users['THDCC']){
        // Create THDCC account with default password 'admin'
        users['THDCC'] = await hashPassword('admin');
        saveUsers(users);
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
    const users = localStorage.getItem(HDS_USERS_KEY);
    return users ? JSON.parse(users) : {};
}

function saveUsers(users) {
    localStorage.setItem(HDS_USERS_KEY, JSON.stringify(users));
}

function showSignInModal(){
    const modal = document.getElementById('signin-modal');
    if(modal) modal.classList.remove('hidden');
    const u = document.getElementById('username');
    if(u) u.focus();
}

function hideSignInModal(){
    const modal = document.getElementById('signin-modal');
    if(modal) modal.classList.add('hidden');
}

function showSignUpModal(){
    const modal = document.getElementById('signup-modal');
    if(modal) modal.classList.remove('hidden');
    const u = document.getElementById('signup-username');
    if(u) u.focus();
}

function hideSignUpModal(){
    const modal = document.getElementById('signup-modal');
    if(modal) modal.classList.add('hidden');
}

function showResetModal(){
    const modal = document.getElementById('reset-modal');
    if(modal) modal.classList.remove('hidden');
    const u = document.getElementById('reset-username');
    if(u) u.focus();
}

function hideResetModal(){
    const modal = document.getElementById('reset-modal');
    if(modal) modal.classList.add('hidden');
}

function signOut(){
    localStorage.removeItem(HDS_CURRENT_USER_KEY);
    updateAuthUI();
}

function clearAllAccounts(){
    const currentUser = localStorage.getItem(HDS_CURRENT_USER_KEY);
    if(currentUser !== 'THDCC'){
        alert('Only the THDCC account can clear all accounts.');
        return;
    }
    if(confirm('Are you sure you want to delete ALL accounts? This cannot be undone.')){
        localStorage.removeItem(HDS_USERS_KEY);
        localStorage.removeItem(HDS_CURRENT_USER_KEY);
        updateAuthUI();
        alert('All accounts cleared.');
    }
}

function updateAuthUI(){
    const user = localStorage.getItem(HDS_CURRENT_USER_KEY);
    const status = document.getElementById('auth-status');
    const btn = document.getElementById('sign-in-btn');
    const clearBtn = document.getElementById('clear-accounts-btn');
    if(!status || !btn) return;
    if(user){
        status.textContent = `Signed in as ${user}`;
        btn.textContent = 'Sign Out';
        if(clearBtn) clearBtn.style.display = (user === 'THDCC') ? 'inline-block' : 'none';
    } else {
        status.textContent = '';
        btn.textContent = 'Sign In';
        if(clearBtn) clearBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeTHDCCAccount();
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const resetForm = document.getElementById('reset-form');
    const signinClose = document.getElementById('signin-close');
    const signupClose = document.getElementById('signup-close');
    const resetClose = document.getElementById('reset-close');
    const signinBtn = document.getElementById('sign-in-btn');
    const signupBtn = document.getElementById('sign-up-btn');
    const forgotLink = document.getElementById('forgot-password-link');
    const clearBtn = document.getElementById('clear-accounts-btn');

    if(signinForm){
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            if(!username || !password){
                alert('Please enter username and password.');
                return;
            }
            const users = getUsers();
            const hashedPassword = await hashPassword(password);
            if(users[username] === hashedPassword){
                localStorage.setItem(HDS_CURRENT_USER_KEY, username);
                hideSignInModal();
                updateAuthUI();
                signinForm.reset();
            } else {
                alert('Invalid username or password.');
            }
        });
    }

    if(signupForm){
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            if(!username || !password){
                alert('Please enter username and password.');
                return;
            }
            if(password !== confirm){
                alert('Passwords do not match.');
                return;
            }
            const users = getUsers();
            if(users[username]){
                alert('Username already exists.');
                return;
            }
            users[username] = await hashPassword(password);
            saveUsers(users);
            localStorage.setItem(HDS_CURRENT_USER_KEY, username);
            hideSignUpModal();
            updateAuthUI();
            signupForm.reset();
        });
    }

    if(resetForm){
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reset-username').value.trim();
            const password = document.getElementById('reset-password').value;
            const confirm = document.getElementById('reset-confirm').value;
            if(!username || !password){
                alert('Please enter username and new password.');
                return;
            }
            if(password !== confirm){
                alert('Passwords do not match.');
                return;
            }
            const users = getUsers();
            if(!users[username]){
                alert('Username not found.');
                return;
            }
            users[username] = await hashPassword(password);
            saveUsers(users);
            alert('Password reset successfully! You can now sign in with your new password.');
            hideResetModal();
            resetForm.reset();
        });
    }

    if(signinClose) signinClose.addEventListener('click', hideSignInModal);
    if(signupClose) signupClose.addEventListener('click', hideSignUpModal);
    if(resetClose) resetClose.addEventListener('click', hideResetModal);

    if(signinBtn){
        signinBtn.addEventListener('click', () => {
            const user = localStorage.getItem(HDS_CURRENT_USER_KEY);
            if(user) signOut();
            else showSignInModal();
        });
    }

    if(signupBtn){
        signupBtn.addEventListener('click', showSignUpModal);
    }

    if(forgotLink){
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideSignInModal();
            showResetModal();
        });
    }

    if(clearBtn){
        clearBtn.addEventListener('click', clearAllAccounts);
    }

    updateAuthUI();
});
