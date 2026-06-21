// Handles login/signup/session/profile panel logic using backend user APIs.
document.addEventListener("DOMContentLoaded", function () {
  const {
    getSession,
    setSession,
    clearSession,
    getHistoryByUser,
    getUserById,
    loginUser,
    registerUser,
    updateUserProfile,
    formatDate,
    isValidEmail,
    updateSidebarUser,
  } = window.ADS;

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authPanel = document.getElementById("authPanel");
  const profilePanel = document.getElementById("profilePanel");

  const loginMessage = document.getElementById("loginMessage");
  const signupMessage = document.getElementById("signupMessage");
  const profileMessage = document.getElementById("profileMessage");

  const loginTabButton = document.getElementById("showLoginTab");
  const signupTabButton = document.getElementById("showSignupTab");

  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileJoined = document.getElementById("profileJoined");
  const profileCount = document.getElementById("profileCount");

  const editToggleButton = document.getElementById("editProfileBtn");
  const logoutButton = document.getElementById("logoutBtn");
  const openDashboardButton = document.getElementById("openDashboardBtn");

  const editPanel = document.getElementById("editProfilePanel");
  const editForm = document.getElementById("editProfileForm");
  const editNameInput = document.getElementById("editName");
  const editEmailInput = document.getElementById("editEmail");

  const urlParams = new URLSearchParams(window.location.search);
  const nextPath = urlParams.get("next") || "/";

  function showMessage(targetNode, message, isError) {
    targetNode.textContent = message || "";
    targetNode.classList.toggle("error-text", Boolean(isError));
    targetNode.classList.toggle("success-text", !isError && Boolean(message));
  }

  function setButtonsDisabled(isDisabled) {
    const buttons = document.querySelectorAll("button");
    buttons.forEach(function (button) {
      button.disabled = isDisabled;
    });
  }

  function switchAuthTab(tabName) {
    const loginSection = document.getElementById("loginSection");
    const signupSection = document.getElementById("signupSection");

    const showLogin = tabName === "login";
    loginSection.classList.toggle("hidden", !showLogin);
    signupSection.classList.toggle("hidden", showLogin);

    loginTabButton.classList.toggle("active", showLogin);
    signupTabButton.classList.toggle("active", !showLogin);
  }

  async function updatePredictionCount(userId) {
    profileCount.textContent = "...";
    try {
      const history = await getHistoryByUser(userId);
      profileCount.textContent = String(history.length);
    } catch (error) {
      profileCount.textContent = "0";
    }
  }

  async function renderProfile(sessionUser) {
    authPanel.classList.add("hidden");
    profilePanel.classList.remove("hidden");

    profileName.textContent = sessionUser.name;
    profileEmail.textContent = sessionUser.email;
    profileJoined.textContent = formatDate(sessionUser.joinedAt);

    editNameInput.value = sessionUser.name;
    editEmailInput.value = sessionUser.email;

    showMessage(profileMessage, "", false);
    updateSidebarUser();
    await updatePredictionCount(sessionUser.id);
  }

  function showAuthPanel() {
    profilePanel.classList.add("hidden");
    authPanel.classList.remove("hidden");
    switchAuthTab("login");
    updateSidebarUser();
  }

  loginTabButton.addEventListener("click", function () {
    switchAuthTab("login");
  });

  signupTabButton.addEventListener("click", function () {
    switchAuthTab("signup");
  });

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    showMessage(loginMessage, "", false);

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showMessage(loginMessage, "Please fill all login fields.", true);
      return;
    }

    if (!isValidEmail(email)) {
      showMessage(loginMessage, "Please enter a valid email address.", true);
      return;
    }

    if (password.length < 6) {
      showMessage(loginMessage, "Password must be at least 6 characters.", true);
      return;
    }

    try {
      setButtonsDisabled(true);
      const sessionUser = await loginUser({ email, password });
      setSession(sessionUser);

      showMessage(loginMessage, "Login successful.", false);
      await renderProfile(sessionUser);

      if (nextPath && nextPath !== "/profile.html") {
        window.location.replace(nextPath);
      }
    } catch (error) {
      showMessage(loginMessage, error.message || "Login failed.", true);
    } finally {
      setButtonsDisabled(false);
    }
  });

  signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    showMessage(signupMessage, "", false);

    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (!fullName || !email || !password || !confirmPassword) {
      showMessage(signupMessage, "Please fill all signup fields.", true);
      return;
    }

    if (!isValidEmail(email)) {
      showMessage(signupMessage, "Please enter a valid email address.", true);
      return;
    }

    if (password.length < 6) {
      showMessage(signupMessage, "Password must be at least 6 characters.", true);
      return;
    }

    if (password !== confirmPassword) {
      showMessage(signupMessage, "Password and confirm password do not match.", true);
      return;
    }

    try {
      setButtonsDisabled(true);
      const sessionUser = await registerUser({
        name: fullName,
        email,
        password,
      });
      setSession(sessionUser);

      showMessage(signupMessage, "Account created successfully.", false);
      await renderProfile(sessionUser);

      if (nextPath && nextPath !== "/profile.html") {
        window.location.replace(nextPath);
      }
    } catch (error) {
      showMessage(signupMessage, error.message || "Signup failed.", true);
    } finally {
      setButtonsDisabled(false);
    }
  });

  editToggleButton.addEventListener("click", function () {
    editPanel.classList.toggle("hidden");
  });

  editForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    showMessage(profileMessage, "", false);

    const nextName = editNameInput.value.trim();
    const nextEmail = editEmailInput.value.trim().toLowerCase();

    if (!nextName || !nextEmail) {
      showMessage(profileMessage, "Profile fields cannot be empty.", true);
      return;
    }

    if (!isValidEmail(nextEmail)) {
      showMessage(profileMessage, "Please enter a valid email address.", true);
      return;
    }

    const session = getSession();
    if (!session) {
      showAuthPanel();
      return;
    }

    try {
      setButtonsDisabled(true);
      const updatedSession = await updateUserProfile(session.id, {
        name: nextName,
        email: nextEmail,
      });
      setSession(updatedSession);
      await renderProfile(updatedSession);
      showMessage(profileMessage, "Profile updated successfully.", false);
      editPanel.classList.add("hidden");
    } catch (error) {
      showMessage(profileMessage, error.message || "Failed to update profile.", true);
    } finally {
      setButtonsDisabled(false);
    }
  });

  logoutButton.addEventListener("click", function () {
    clearSession();
    showAuthPanel();
    window.location.replace("/profile.html");
  });

  openDashboardButton.addEventListener("click", function () {
    window.location.href = "/";
  });

  async function initProfile() {
    const existingSession = getSession();
    if (!existingSession) {
      showAuthPanel();
      return;
    }

    try {
      const freshSession = await getUserById(existingSession.id);
      setSession(freshSession);
      await renderProfile(freshSession);
    } catch (error) {
      // Keep previous session if backend temporarily unavailable.
      await renderProfile(existingSession);
    }
  }

  initProfile();
});

