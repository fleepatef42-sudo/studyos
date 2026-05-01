const LOGIN_KEYS = {
    users: "studyos.users",
    currentUser: "studyos.currentUser",
    rememberedEmail: "studyos.rememberedEmail",
};

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const elements = {
        form: document.getElementById("loginForm"),
        email: document.getElementById("email"),
        password: document.getElementById("password"),
        rememberMe: document.getElementById("rememberMe"),
        passwordToggle: document.getElementById("passwordToggle"),
        forgotPassword: document.getElementById("forgotPassword"),
        emailError: document.getElementById("emailError"),
        passwordError: document.getElementById("passwordError"),
        submit: document.getElementById("loginSubmit"),
        notice: document.getElementById("loginNotice"),
        success: document.getElementById("successMessage"),
    };

    const rememberedEmail = localStorage.getItem(LOGIN_KEYS.rememberedEmail);

    if (rememberedEmail) {
        elements.email.value = rememberedEmail;
        elements.rememberMe.checked = true;
    }

    elements.passwordToggle.addEventListener("click", () => {
        const isPassword = elements.password.type === "password";
        elements.password.type = isPassword ? "text" : "password";
        elements.passwordToggle.textContent = isPassword ? "إخفاء" : "إظهار";
    });

    elements.forgotPassword.addEventListener("click", () => {
        elements.notice.textContent =
            "إذا كان الحساب من نسخة قديمة بدون كلمة مرور محفوظة، اكتب كلمة مرور جديدة الآن وسيتم ربطها بالحساب بعد الدخول.";
    });

    elements.form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = elements.email.value.trim();
        const password = elements.password.value.trim();

        const emailValid = validateEmail(email, elements.email, elements.emailError);
        const passwordValid = validatePassword(password, elements.password, elements.passwordError);

        if (!emailValid || !passwordValid) {
            return;
        }

        const users = readUsers();
        const userIndex = users.findIndex((user) => user.email.toLowerCase() === email.toLowerCase());

        if (userIndex === -1) {
            setFieldState(elements.email, elements.emailError, false, "هذا البريد غير مسجل بعد.");
            elements.notice.textContent = "أنشئ حسابًا جديدًا أولًا ثم ارجع لتسجيل الدخول.";
            return;
        }

        const passwordHash = await hashPassword(password);
        const existingUser = users[userIndex];

        if (existingUser.passwordHash && existingUser.passwordHash !== passwordHash) {
            setFieldState(elements.password, elements.passwordError, false, "كلمة المرور غير صحيحة.");
            elements.notice.textContent = "راجع كلمة المرور أو أنشئ حسابًا جديدًا إذا كان هذا أول دخول لك.";
            return;
        }

        const nextUser = {
            ...existingUser,
            passwordHash: existingUser.passwordHash || passwordHash,
            passwordUpdatedAt: existingUser.passwordUpdatedAt || new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
        };

        users[userIndex] = nextUser;
        writeUsers(users);
        persistCurrentUser(nextUser);

        if (elements.rememberMe.checked) {
            localStorage.setItem(LOGIN_KEYS.rememberedEmail, email);
        } else {
            localStorage.removeItem(LOGIN_KEYS.rememberedEmail);
        }

        elements.submit.disabled = true;
        elements.submit.textContent = "جارٍ تجهيز اللوحة...";
        elements.form.hidden = true;
        elements.success.hidden = false;

        window.setTimeout(() => {
            window.location.href = "home.html";
        }, 1200);
    });
});

function validateEmail(value, input, errorNode) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (!value) {
        setFieldState(input, errorNode, false, "اكتب البريد الإلكتروني أولًا.");
        return false;
    }

    if (!valid) {
        setFieldState(input, errorNode, false, "صيغة البريد الإلكتروني غير صحيحة.");
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function validatePassword(value, input, errorNode) {
    if (!value) {
        setFieldState(input, errorNode, false, "اكتب كلمة المرور.");
        return false;
    }

    if (value.length < 6) {
        setFieldState(input, errorNode, false, "كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function setFieldState(input, errorNode, isValid, message) {
    input.classList.toggle("is-valid", isValid);
    input.classList.toggle("is-invalid", !isValid);
    errorNode.textContent = message;
}

function readUsers() {
    try {
        const raw = localStorage.getItem(LOGIN_KEYS.users);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function writeUsers(users) {
    localStorage.setItem(LOGIN_KEYS.users, JSON.stringify(users));
}

function persistCurrentUser(user) {
    const { passwordHash, passwordUpdatedAt, ...safeUser } = user;
    localStorage.setItem(LOGIN_KEYS.currentUser, JSON.stringify(safeUser));
}

async function hashPassword(value) {
    if (window.crypto?.subtle) {
        const encoder = new TextEncoder();
        const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(value));
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    return `plain:${value}`;
}
