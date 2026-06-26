// frontend.js
(function() {
    'use strict';

    // ============ CONFIGURATION ============
    // Auto-detect API URL for different environments
    const getApiBase = () => {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Production - Vercel (ফ্রন্টএন্ড Vercel-এ, ব্যাকএন্ড Render-এ)
       // Production - Vercel (Frontend on Vercel, Backend on Render)
if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Corrected Render backend URL to exactly match server.js CORS
    return 'https://portfolio-backend-drs2.onrender.com/api';
}
        // Local development - port detection
        if (port === '5000' || port === '') {
            return '/api';
        }
        
        // Live Server (5500) or other local ports
        if (port === '5500' || port === '3000' || port === '8080') {
            return 'http://localhost:5000/api';
        }
        
        // Fallback
        return 'http://localhost:5000/api';
    };

    // ============ API BASE URL ============
    const API_BASE = getApiBase();
    console.log('📡 API Base URL:', API_BASE);
    console.log('🌐 Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
    
    let authToken = localStorage.getItem('authToken') || null;
    let currentUser = null;
    let isAdmin = false;
    let profileData = null;
    let projects = [];

    // ============ DOM REFERENCES ============
    const $ = id => document.getElementById(id);
    const pages = {
        home: $('page-home'),
        resume: $('page-resume'),
        projects: $('page-projects'),
        admin: $('page-admin'),
        contact: $('page-contact')
    };
    const navLinks = document.querySelectorAll('.nav-links a[data-page]');
    const adminNavLink = $('adminNavLink');
    const adminBadge = $('adminBadge');

    // ============ API HELPERS ============
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        try {
            console.log(`📤 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, { 
                ...options, 
                headers,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(data.error || data.message || 'API request failed');
            }
            
            console.log(`📥 API Response:`, data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }

    // ============ AUTH FUNCTIONS ============
    async function login(username, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            console.log('🔐 Login response:', data);
            
            if (data.success && data.token) {
                authToken = data.token;
                currentUser = data.user;
                isAdmin = data.user.role === 'admin';
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUIForAdmin();
                showToast('✅ Welcome back, Admin!', 'success');
                return true;
            } else {
                showToast('❌ ' + (data.error || 'Login failed'), 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            showToast('❌ Network error. Please try again.', 'error');
            return false;
        }
    }

    function logout() {
        authToken = null;
        currentUser = null;
        isAdmin = false;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateUIForAdmin();
        showToast('👋 Logged out successfully', 'info');
        navigateTo('home');
    }

    function checkAuth() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            authToken = token;
            try {
                currentUser = JSON.parse(user);
                isAdmin = currentUser.role === 'admin';
                updateUIForAdmin();
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                return false;
            }
        }
        return false;
    }

    // ============ UI UPDATE FUNCTIONS ============
    function updateUIForAdmin() {
        if (isAdmin) {
            if (adminNavLink) adminNavLink.style.display = 'inline-block';
            if (adminBadge) adminBadge.style.display = 'inline-block';
            document.body.classList.add('admin-mode');
            
            if ($('adminContent')) {
                $('adminContent').style.display = 'block';
            }
            
            // Load admin data if admin
            loadAdminData();
        } else {
            if (adminNavLink) adminNavLink.style.display = 'none';
            if (adminBadge) adminBadge.style.display = 'none';
            document.body.classList.remove('admin-mode');
            
            if ($('adminContent')) {
                $('adminContent').style.display = 'none';
            }
        }
        
        renderProjects();
    }

    // ============ SECRET KEYBOARD SHORTCUT ============
    function setupSecretShortcut() {
        let isWaitingForA = false;
        
        document.addEventListener('keydown', function(e) {
            // Ctrl + Shift + K
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                isWaitingForA = true;
                showToast('🔑 Press "A" to continue...', 'info');
                
                const listener = (event) => {
                    if (event.key.toLowerCase() === 'a' && isWaitingForA) {
                        document.removeEventListener('keydown', listener);
                        isWaitingForA = false;
                        handleSecretShortcut();
                    }
                    // Cancel if any other key is pressed
                    if (event.key !== 'a' && isWaitingForA) {
                        isWaitingForA = false;
                        document.removeEventListener('keydown', listener);
                        showToast('⌨️ Shortcut cancelled', 'info');
                    }
                };
                document.addEventListener('keydown', listener);
            }
        });
    }

    async function handleSecretShortcut() {
        if (isAdmin) {
            logout();
            showToast('👋 Logged out from admin mode', 'info');
        } else {
            showLoginModal();
        }
    }

    // ============ LOGIN MODAL ============
    window.showLoginModal = function() {
        const existingModal = document.querySelector('.login-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'login-modal';
        modal.innerHTML = `
            <div class="login-modal-content">
                <div class="login-header">
                    <h2><i class="fas fa-shield-alt"></i> Admin Login</h2>
                    <button class="close-btn" onclick="this.closest('.login-modal').remove()">&times;</button>
                </div>
                <p style="color: #64748b; margin-bottom: 1.5rem;">Enter your credentials to access the admin panel</p>
                <form id="adminLoginForm">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Username</label>
                        <input type="text" id="loginUsername" value="admin" required autofocus>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> Password</label>
                        <input type="password" id="loginPassword" placeholder="Enter password" required>
                    </div>
                    <div id="loginError" class="error-message" style="display:none;"></div>
                    <button type="submit" class="btn-primary login-btn">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.login-modal').remove()" style="margin-top: 0.5rem; width:100%;">
                        Cancel
                    </button>
                </form>
                <div style="margin-top: 1rem; text-align: center; font-size: 0.8rem; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> Default: admin / admin123
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#adminLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            
            errorEl.style.display = 'none';
            
            const success = await login(username, password);
            
            if (success) {
                modal.remove();
                await loadAdminData();
                navigateTo('admin');
            } else {
                errorEl.textContent = '❌ Invalid credentials. Please try again.';
                errorEl.style.display = 'block';
                document.getElementById('loginPassword').value = '';
                document.getElementById('loginPassword').focus();
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        setTimeout(() => document.getElementById('loginUsername').focus(), 100);
    };

    // ============ NAVIGATION ============
    function navigateTo(page) {
        // Hide all pages
        Object.keys(pages).forEach(key => {
            if (pages[key]) {
                pages[key].classList.remove('active');
            }
        });
        
        // Show selected page
        if (pages[page]) {
            pages[page].classList.add('active');
        }
        
        // Update nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });
        
        // Check if admin page requires login
        if (page === 'admin' && !isAdmin) {
            showLoginModal();
        }
        
        // Update URL hash
        if (page !== 'home') {
            window.location.hash = page;
        } else {
            window.location.hash = '';
        }
    }

    // ============ LOAD DATA ============
    async function loadPublicData() {
        try {
            // Load profile
            const profile = await apiRequest('/public/profile');
            profileData = profile;
            
            // Load projects
            const projectData = await apiRequest('/public/projects');
            projects = projectData;
            
            // Render all sections
            renderProfile();
            renderProjects();
            renderContacts();
            renderSocial();
            renderCVButton();
            renderResume();
            
            console.log('✅ Public data loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load public data:', error);
            showToast('❌ Failed to load data', 'error');
            return false;
        }
    }

    async function loadAdminData() {
        if (!isAdmin) return;
        
        try {
            const profile = await apiRequest('/profile');
            profileData = profile;
            
            const projectData = await apiRequest('/projects');
            projects = projectData;
            
            renderProfile();
            renderProjects();
            renderContacts();
            renderSocial();
            renderAdminForms();
            renderAdminProjectList();
            renderCVButton();
            renderResume();
            
            console.log('✅ Admin data loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load admin data:', error);
            showToast('❌ Failed to load admin data', 'error');
            return false;
        }
    }

    // ============ RENDER FUNCTIONS ============
    function renderProfile() {
        if (!profileData) return;

        // Hero section
        const heroName = $('heroName');
        if (heroName) {
            heroName.innerHTML = profileData.name.replace('Zaman', '<span>Zaman</span>');
        }
        
        const heroTitle = $('heroTitle');
        if (heroTitle) {
            heroTitle.innerHTML = `<i class="fas fa-code" style="color: #2563eb; margin-right: 10px;"></i>${profileData.title || 'Developer'}`;
        }
        
        const heroDesc = $('heroDesc');
        if (heroDesc) heroDesc.textContent = profileData.desc || 'Passionate developer creating awesome things';
        
        const statFollowers = $('statFollowers');
        if (statFollowers) statFollowers.textContent = profileData.followers || 0;
        
        const statContrib = $('statContrib');
        if (statContrib) statContrib.textContent = profileData.contributions || 0;
        
        // Avatar section
        const avatarLocation = $('avatarLocation');
        if (avatarLocation) {
            avatarLocation.innerHTML = `<i class="fas fa-map-pin" style="margin-right: 6px;"></i>${profileData.location || 'Location'}`;
        }
        
        const avatarCompany = $('avatarCompany');
        if (avatarCompany) {
            avatarCompany.innerHTML = `<i class="fas fa-briefcase" style="color: #2563eb;"></i> ${profileData.company || 'Company'}`;
        }

        const initials = profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
        const avatarImage = $('avatarImage');
        const avatarInitials = $('avatarInitials');
        
        if (profileData.profilePic) {
            avatarImage.src = profileData.profilePic;
            avatarImage.style.display = 'block';
            avatarInitials.style.display = 'none';
        } else {
            avatarInitials.textContent = initials;
            avatarInitials.style.display = 'flex';
            avatarImage.style.display = 'none';
        }

        // Resume header
        const resumeName = $('resumeFullName');
        if (resumeName) resumeName.textContent = profileData.name || 'Your Name';
        
        const resumeTitle = $('resumeFullTitle');
        if (resumeTitle) resumeTitle.textContent = profileData.title || 'Developer';
    }

    function renderResume() {
        if (!profileData || !profileData.resumeSections) return;
        
        const container = $('resumeSections');
        if (!container) return;
        
        container.innerHTML = '';
        
        profileData.resumeSections.forEach(section => {
            const div = document.createElement('div');
            div.className = 'resume-section';
            
            let contentHTML = '';
            if (section.content && section.content.includes('\n')) {
                contentHTML = section.content.split('\n').map(line => {
                    if (line.trim().startsWith('-')) {
                        return `<li>${line.trim().substring(1).trim()}</li>`;
                    }
                    return `<p>${line}</p>`;
                }).join('');
                if (contentHTML.includes('<li>')) {
                    contentHTML = `<ul>${contentHTML}</ul>`;
                }
            } else {
                contentHTML = `<p>${section.content || ''}</p>`;
            }
            
            div.innerHTML = `
                <h3>${section.title || 'Section'}</h3>
                ${contentHTML}
            `;
            container.appendChild(div);
        });
    }

    function renderCVButton() {
        const cvLink = $('cvDownloadLink');
        if (!cvLink) return;
        
        if (isAdmin && profileData && profileData.cvFile) {
            cvLink.href = profileData.cvFile;
            cvLink.style.display = 'inline-flex';
            cvLink.download = 'Kamrul_Zaman_CV.pdf';
        } else {
            cvLink.style.display = 'none';
        }
    }

    function renderProjects() {
        const grid = $('projectGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (!projects || projects.length === 0) {
            grid.innerHTML = '<p style="text-align:center;color:#94a3b8;">No projects yet.</p>';
            return;
        }
        
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            let detailsHTML = '';
            if (project.description) {
                detailsHTML += `<p class="project-desc">${project.description}</p>`;
            }
            if (project.link) {
                detailsHTML += `<a href="${project.link}" target="_blank" class="project-link"><i class="fas fa-external-link-alt"></i> View Project</a>`;
            }
            
            if (project.images && project.images.length > 0) {
                detailsHTML += `<div class="project-images">`;
                project.images.forEach(img => {
                    detailsHTML += `<img src="${img}" alt="${project.title}" class="project-image" loading="lazy" />`;
                });
                detailsHTML += `</div>`;
            }
            
            if (project.content) {
                const preview = project.content.split('\n').slice(0, 3).join('\n');
                if (typeof marked !== 'undefined') {
                    detailsHTML += `<div class="project-content-preview">${marked.parse(preview)}</div>`;
                } else {
                    detailsHTML += `<div class="project-content-preview"><p>${preview}</p></div>`;
                }
                detailsHTML += `<button class="read-more-btn" onclick="window.viewProject(${project.id})">Read More</button>`;
            }
            
            let actions = `
                <button class="view-btn" onclick="window.viewProject(${project.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
            
            if (isAdmin) {
                actions += `
                    <button class="edit-btn" onclick="window.openEditModal(${project.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="window.deleteProject(${project.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                `;
            }
            
            card.innerHTML = `
                <div class="icon-big"><i class="fas ${project.icon || 'fa-cloud'}"></i></div>
                <h4>${project.title}</h4>
                ${detailsHTML}
                <div class="actions">${actions}</div>
            `;
            
            grid.appendChild(card);
        });
    }

    function renderContacts() {
        if (!profileData || !profileData.contacts) return;
        
        const containers = ['contactPageList'];
        containers.forEach(id => {
            const container = $(id);
            if (!container) return;
            
            container.innerHTML = '';
            profileData.contacts.forEach(c => {
                const div = document.createElement('div');
                div.className = 'contact-item';
                div.innerHTML = `<i class="fas ${c.icon}"></i> <a href="${c.href}" target="_blank">${c.label}</a>`;
                container.appendChild(div);
            });
        });
    }

    function renderSocial() {
        if (!profileData || !profileData.social) return;
        
        const filteredSocial = profileData.social.filter(s => 
            s.icon !== 'fa-twitter' && s.icon !== 'fa-youtube'
        );
        
        const containers = ['socialPageIcons'];
        containers.forEach(id => {
            const container = $(id);
            if (!container) return;
            
            container.innerHTML = '';
            filteredSocial.forEach(s => {
                const a = document.createElement('a');
                a.href = s.href;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.innerHTML = `<i class="fab ${s.icon}"></i>`;
                container.appendChild(a);
            });
        });
    }

    function renderAdminForms() {
        if (!profileData) return;
        
        const adminName = $('adminName');
        if (adminName) adminName.value = profileData.name || '';
        
        const adminTitle = $('adminTitle');
        if (adminTitle) adminTitle.value = profileData.title || '';
        
        const adminDesc = $('adminDesc');
        if (adminDesc) adminDesc.value = profileData.desc || '';
        
        const adminLocation = $('adminLocation');
        if (adminLocation) adminLocation.value = profileData.location || '';
        
        const adminCompany = $('adminCompany');
        if (adminCompany) adminCompany.value = profileData.company || '';
        
        // Resume sections
        if (profileData.resumeSections) {
            const container = $('resumeSectionsAdmin');
            if (container) {
                container.innerHTML = '';
                profileData.resumeSections.forEach((section, index) => {
                    const div = document.createElement('div');
                    div.className = 'resume-section-edit';
                    div.innerHTML = `
                        <input type="text" class="resume-section-title" value="${section.title || ''}" data-index="${index}" placeholder="Section Title" />
                        <textarea class="resume-section-content" data-index="${index}" rows="4" placeholder="Section content...">${section.content || ''}</textarea>
                        <button class="btn btn-danger btn-sm remove-section-btn" data-index="${index}">Remove</button>
                    `;
                    container.appendChild(div);
                    
                    // Add remove listener
                    div.querySelector('.remove-section-btn').addEventListener('click', function() {
                        div.remove();
                    });
                });
            }
        }
    }

    function renderAdminProjectList() {
        const container = $('projectListAdmin');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8;">No projects yet.</p>';
            return;
        }
        
        projects.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid #e2e8f0;';
            div.innerHTML = `
                <span><i class="fas ${p.icon || 'fa-cloud'}"></i> ${p.title}</span>
                <div>
                    <button class="btn btn-sm" style="background:#dbeafe;color:#1e3a8a;margin-right:0.3rem;" onclick="window.openEditModal(${p.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteProject(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // ============ PROJECT CRUD ============
    window.viewProject = function(id) {
        const project = projects.find(p => p.id === id);
        if (!project) {
            showToast('❌ Project not found', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'login-modal project-view-modal';
        modal.innerHTML = `
            <div class="login-modal-content" style="max-width:800px; max-height:90vh; overflow-y:auto;">
                <div class="login-header">
                    <h2><i class="fas ${project.icon || 'fa-cloud'}"></i> ${project.title}</h2>
                    <button class="close-btn" onclick="this.closest('.login-modal').remove()">&times;</button>
                </div>
                ${project.images && project.images.length > 0 ? `<div class="project-images-full">${project.images.map(img => `<img src="${img}" alt="${project.title}" loading="lazy" />`).join('')}</div>` : ''}
                <div class="project-content-full">${typeof marked !== 'undefined' ? marked.parse(project.content || 'No content available.') : `<p>${project.content || 'No content available.'}</p>`}</div>
                ${project.link ? `<p style="margin-top:1rem;"><a href="${project.link}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:none;"><i class="fas fa-external-link-alt"></i> View Project</a></p>` : ''}
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    };

    window.openEditModal = function(id) {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        
        const modal = $('editModal');
        if (!modal) return;
        
        $('editProjectId').value = id;
        $('editProjectTitle').value = project.title || '';
        $('editProjectDesc').value = project.description || '';
        $('editProjectContent').value = project.content || '';
        $('editProjectIcon').value = project.icon || 'fa-cloud';
        $('editProjectLink').value = project.link || '';
        
        // Show existing images
        const imageContainer = $('editProjectImages');
        if (imageContainer) {
            imageContainer.innerHTML = '';
            if (project.images && project.images.length > 0) {
                project.images.forEach((img) => {
                    const div = document.createElement('div');
                    div.className = 'image-preview-item';
                    div.innerHTML = `
                        <img src="${img}" alt="Project image" loading="lazy" />
                        <button class="remove-image-btn" onclick="this.parentElement.remove()">&times;</button>
                    `;
                    imageContainer.appendChild(div);
                });
            }
        }
        
        // Reset edit images array
        editProjectImages = [];
        
        modal.classList.add('active');
    };

    window.closeEditModal = function() {
        const modal = $('editModal');
        if (modal) modal.classList.remove('active');
        editProjectImages = [];
    };

    window.deleteProject = async function(id) {
        if (!confirm('Delete this project?')) return;
        
        try {
            await apiRequest(`/projects/${id}`, { method: 'DELETE' });
            await loadAdminData();
            showToast('✅ Project deleted!', 'success');
        } catch (error) {
            showToast('❌ Failed to delete project', 'error');
        }
    };

    // ============ EVENT LISTENERS ============
    function setupEventListeners() {
        // Navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) navigateTo(page);
            });
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && pages[hash]) {
                navigateTo(hash);
            }
        });

        // Profile save
        const saveProfileBtn = $('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', saveProfile);
        }

        // Add project
        const addProjectBtn = $('addProjectBtn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', addProject);
        }

        // Save edit
        const saveEditBtn = $('saveEditBtn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', saveEditedProject);
        }

        // Cancel edit
        const cancelEditBtn = $('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', window.closeEditModal);
        }

        // Edit modal close on overlay click
        const editModal = $('editModal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) window.closeEditModal();
            });
        }

        // Add resume section
        const addSectionBtn = $('addSectionBtn');
        if (addSectionBtn) {
            addSectionBtn.addEventListener('click', addResumeSection);
        }

        // Image upload for edit modal
        const editImageInput = $('editProjectImagesInput');
        if (editImageInput) {
            editImageInput.addEventListener('change', handleEditImageUpload);
        }

        // Image upload for add project
        const addImageInput = $('addProjectImagesInput');
        if (addImageInput) {
            addImageInput.addEventListener('change', handleAddImageUpload);
        }
    }

    // ============ IMAGE HANDLING ============
    let addProjectImages = [];
    let editProjectImages = [];

    function handleAddImageUpload(e) {
        const files = e.target.files;
        for (let file of files) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('⚠️ Image too large (max 5MB)', 'error');
                continue;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                addProjectImages.push(event.target.result);
                renderAddImagePreviews();
            };
            reader.readAsDataURL(file);
        }
    }

    function renderAddImagePreviews() {
        const container = $('addProjectImagesPreview');
        if (!container) return;
        container.innerHTML = '';
        addProjectImages.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${img}" alt="Project image" loading="lazy" />
                <button class="remove-image-btn" data-index="${index}" onclick="window.removeAddImage(${index})">&times;</button>
            `;
            container.appendChild(div);
        });
    }

    window.removeAddImage = function(index) {
        addProjectImages.splice(index, 1);
        renderAddImagePreviews();
    };

    function handleEditImageUpload(e) {
        const files = e.target.files;
        for (let file of files) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('⚠️ Image too large (max 5MB)', 'error');
                continue;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                editProjectImages.push(event.target.result);
                renderEditImagePreviews();
            };
            reader.readAsDataURL(file);
        }
    }

    function renderEditImagePreviews() {
        const container = $('editProjectImages');
        if (!container) return;
        
        editProjectImages.forEach((img) => {
            // Check if image already exists in container
            const existingImages = container.querySelectorAll('img');
            let exists = false;
            existingImages.forEach(existingImg => {
                if (existingImg.src === img) exists = true;
            });
            if (!exists) {
                const div = document.createElement('div');
                div.className = 'image-preview-item';
                div.innerHTML = `
                    <img src="${img}" alt="Project image" loading="lazy" />
                    <button class="remove-image-btn" onclick="this.parentElement.remove()">&times;</button>
                `;
                container.appendChild(div);
            }
        });
    }

    // ============ RESUME SECTION MANAGEMENT ============
    function addResumeSection() {
        const container = $('resumeSectionsAdmin');
        if (!container) return;
        
        const index = container.children.length;
        const div = document.createElement('div');
        div.className = 'resume-section-edit';
        div.innerHTML = `
            <input type="text" class="resume-section-title" data-index="${index}" placeholder="Section Title" />
            <textarea class="resume-section-content" data-index="${index}" rows="4" placeholder="Section content..."></textarea>
            <button class="btn btn-danger btn-sm remove-section-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(div);
        
        // Add remove listener
        div.querySelector('.remove-section-btn').addEventListener('click', function() {
            div.remove();
        });
    }

    // ============ ADMIN ACTIONS ============
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsDataURL(file);
        });
    }

    async function saveProfile() {
        const updated = {
            name: $('adminName').value,
            title: $('adminTitle').value,
            desc: $('adminDesc').value,
            location: $('adminLocation').value,
            company: $('adminCompany').value,
        };

        // Get resume sections
        const sectionTitles = document.querySelectorAll('.resume-section-title');
        const sectionContents = document.querySelectorAll('.resume-section-content');
        const resumeSections = [];
        for (let i = 0; i < sectionTitles.length; i++) {
            if (sectionTitles[i]?.value?.trim()) {
                resumeSections.push({
                    title: sectionTitles[i].value.trim(),
                    content: sectionContents[i]?.value?.trim() || ''
                });
            }
        }
        updated.resumeSections = resumeSections;

        // Handle profile pic
        const picInput = $('profilePicInput');
        if (picInput?.files?.[0]) {
            if (picInput.files[0].size > 5 * 1024 * 1024) {
                showToast('⚠️ Image too large (max 5MB)', 'error');
                return;
            }
            updated.profilePic = await readFileAsDataURL(picInput.files[0]);
        }

        // Handle CV
        const cvInput = $('cvFileInput');
        if (cvInput?.files?.[0]) {
            if (cvInput.files[0].size > 10 * 1024 * 1024) {
                showToast('⚠️ CV too large (max 10MB)', 'error');
                return;
            }
            updated.cvFile = await readFileAsDataURL(cvInput.files[0]);
        }

        await saveProfileData(updated);
    }

    async function saveProfileData(data) {
        try {
            await apiRequest('/profile', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            await loadAdminData();
            const status = $('profileStatus');
            if (status) {
                status.textContent = '✅ Profile updated successfully!';
                status.style.color = '#16a34a';
                setTimeout(() => status.textContent = '', 3000);
            }
            showToast('✅ Profile updated!', 'success');
        } catch (error) {
            showToast('❌ Failed to update profile', 'error');
        }
    }

    async function addProject() {
        const title = $('projectTitle').value.trim();
        const description = $('projectDesc').value.trim();
        const icon = $('projectIcon').value.trim() || 'fa-cloud';
        const link = $('projectLink').value.trim();
        const content = $('projectContent')?.value?.trim() || `## ${title}\n\n${description}`;
        
        if (!title || !description) {
            const status = $('projectStatus');
            if (status) {
                status.textContent = '⚠️ Please fill title and description.';
                status.style.color = '#dc2626';
                setTimeout(() => status.textContent = '', 3000);
            }
            return;
        }
        
        const projectData = { 
            title, 
            description, 
            icon, 
            link,
            content: content,
            images: addProjectImages || []
        };
        
        await saveProject(projectData);
    }

    async function saveProject(projectData) {
        try {
            await apiRequest('/projects', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
            
            await loadAdminData();
            
            // Clear form
            $('projectTitle').value = '';
            $('projectDesc').value = '';
            $('projectContent').value = '';
            $('projectIcon').value = 'fa-cloud';
            $('projectLink').value = '';
            $('addProjectImagesInput').value = '';
            addProjectImages = [];
            renderAddImagePreviews();
            
            const status = $('projectStatus');
            if (status) {
                status.textContent = '✅ Project added successfully!';
                status.style.color = '#16a34a';
                setTimeout(() => status.textContent = '', 3000);
            }
            showToast('✅ Project added!', 'success');
        } catch (error) {
            showToast('❌ Failed to add project', 'error');
        }
    }

    async function saveEditedProject() {
        const id = parseInt($('editProjectId').value);
        const title = $('editProjectTitle').value.trim();
        const description = $('editProjectDesc').value.trim();
        const icon = $('editProjectIcon').value.trim() || 'fa-cloud';
        const link = $('editProjectLink').value.trim();
        const content = $('editProjectContent')?.value?.trim() || `## ${title}\n\n${description}`;
        
        if (!title || !description) {
            showToast('⚠️ Please fill all fields', 'error');
            return;
        }
        
        const projectData = { 
            title, 
            description, 
            icon, 
            link,
            content: content,
            images: editProjectImages || []
        };
        
        await updateProject(id, projectData);
    }

    async function updateProject(id, projectData) {
        try {
            await apiRequest(`/projects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
            
            await loadAdminData();
            window.closeEditModal();
            showToast('✅ Project updated!', 'success');
        } catch (error) {
            showToast('❌ Failed to update project', 'error');
        }
    }

    // ============ TOAST NOTIFICATIONS ============
    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============ HANDLE HASH ON LOAD ============
    function handleHashOnLoad() {
        const hash = window.location.hash.replace('#', '');
        if (hash && pages[hash]) {
            setTimeout(() => navigateTo(hash), 100);
        }
    }

    // ============ INITIALIZATION ============
    async function init() {
        console.log('🚀 Portfolio CMS v2.0');
        console.log('📡 API URL:', API_BASE);
        console.log('🌐 Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
        console.log('🔑 Secret shortcut: Ctrl+Shift+K+A');
        console.log('👤 Default: admin / admin123');
        
        // Load marked.js for markdown rendering if not loaded
        if (typeof marked === 'undefined') {
            try {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
                console.log('✅ Marked.js loaded');
            } catch (error) {
                console.warn('⚠️ Marked.js not loaded, using plain text');
            }
        }
        
        // Check authentication
        checkAuth();
        
        // Load public data
        await loadPublicData();
        
        // Setup shortcuts and events
        setupSecretShortcut();
        setupEventListeners();
        
        // Handle hash on load
        handleHashOnLoad();
        
        // Expose functions globally
        window.showToast = showToast;
        window.navigateTo = navigateTo;
        window.deleteProject = window.deleteProject;
        window.openEditModal = window.openEditModal;
        window.closeEditModal = window.closeEditModal;
        window.showLoginModal = showLoginModal;
        window.viewProject = viewProject;
        window.removeAddImage = window.removeAddImage;
        
        console.log('✅ Application ready!');
    }

    // Start the application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
