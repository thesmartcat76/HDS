function move(page){
    window.location.href = String(page)
};

// --- Sign-in handling (simple client-side mock) ---
const HDS_STORAGE_KEY = 'hds_user';

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

function signOut(){
    localStorage.removeItem(HDS_STORAGE_KEY);
    updateAuthUI();
}

function updateAuthUI(){
    const user = localStorage.getItem(HDS_STORAGE_KEY);
    const status = document.getElementById('auth-status');
    const btn = document.getElementById('sign-in-btn');
    if(!status || !btn) return;
    if(user){
        status.textContent = `Signed in as ${user}`;
        btn.textContent = 'Sign Out';
    } else {
        status.textContent = '';
        btn.textContent = 'Sign In';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signin-form');
    const close = document.getElementById('signin-close');
    const btn = document.getElementById('sign-in-btn');

    if(form){
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            if(!username){
                alert('Please enter a username.');
                return;
            }
            // Mock auth: store username only
            localStorage.setItem(HDS_STORAGE_KEY, username);
            hideSignInModal();
            updateAuthUI();
        });
    }

    if(close) close.addEventListener('click', hideSignInModal);

    if(btn){
        btn.addEventListener('click', () => {
            const user = localStorage.getItem(HDS_STORAGE_KEY);
            if(user) signOut();
            else showSignInModal();
            updateAuthUI();
        });
    }

    updateAuthUI();
});
