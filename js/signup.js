const SIGNUP_KEYS = {
    users: "studyos.users",
    currentUser: "studyos.currentUser",
};

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const elements = {
        form: document.getElementById("signupForm"),
        fullName: document.getElementById("fullName"),
        email: document.getElementById("email"),
        studyTrack: document.getElementById("studyTrack"),
        weeklyGoal: document.getElementById("weeklyGoal"),
        password: document.getElementById("password"),
        confirmPassword: document.getElementById("confirmPassword"),
        terms: document.getElementById("terms"),
        passwordToggle: document.getElementById("passwordToggle"),
        confirmPasswordToggle: document.getElementById("confirmPasswordToggle"),
        notice: document.getElementById("signupNotice"),
        submit: document.getElementById("signupSubmit"),
        success: document.getElementById("successMessage"),
        fullNameError: document.getElementById("fullNameError"),
        emailError: document.getElementById("emailError"),
        studyTrackError: document.getElementById("studyTrackError"),
        weeklyGoalError: document.getElementById("weeklyGoalError"),
        passwordError: document.getElementById("passwordError"),
        confirmPasswordError: document.getElementById("confirmPasswordError"),
        termsError: document.getElementById("termsError"),
    };

    bindToggle(elements.password, elements.passwordToggle);
    bindToggle(elements.confirmPassword, elements.confirmPasswordToggle);

    elements.form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = normalizeName(elements.fullName.value);
        const email = elements.email.value.trim();
        const studyTrack = elements.studyTrack.value.trim();
        const weeklyGoal = elements.weeklyGoal.value.trim();
        const password = elements.password.value;
        const confirmPassword = elements.confirmPassword.value;
        const users = readUsers();

        const fullNameValid = validateName(fullName, elements.fullName, elements.fullNameError);
        const emailValid = validateEmail(email, users, elements.email, elements.emailError);
        const trackValid = validateSelect(studyTrack, elements.studyTrack, elements.studyTrackError, "اختر مسارًا دراسيًا.");
        const goalValid = validateSelect(weeklyGoal, elements.weeklyGoal, elements.weeklyGoalError, "اختر هدفًا أسبوعيًا.");
        const passwordValid = validatePassword(password, elements.password, elements.passwordError);
        const confirmValid = validateConfirm(password, confirmPassword, elements.confirmPassword, elements.confirmPasswordError);
        const termsValid = validateTerms(elements.terms.checked, elements.termsError);

        if (!fullNameValid || !emailValid || !trackValid || !goalValid || !passwordValid || !confirmValid || !termsValid) {
            return;
        }

        const passwordHash = await hashPassword(password);
        const user = {
            id: buildId(),
            fullName,
            email,
            studyTrack,
            weeklyGoal,
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            passwordHash,
            passwordUpdatedAt: new Date().toISOString(),
        };

        users.unshift(user);
        localStorage.setItem(SIGNUP_KEYS.users, JSON.stringify(users));
        persistCurrentUser(user);

        elements.notice.textContent = "تم إنشاء الحساب بنجاح، ونجهز لك الآن لوحة متابعة خاصة بمسارك.";
        elements.submit.disabled = true;
        elements.submit.textContent = "جارٍ تجهيز اللوحة...";
        elements.form.hidden = true;
        elements.success.hidden = false;

        window.setTimeout(() => {
            window.location.href = "home.html";
        }, 1400);
    });
});

function bindToggle(input, button) {
    button.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        button.textContent = isPassword ? "إخفاء" : "إظهار";
    });
}

function normalizeName(value) {
    return value.trim().replace(/\s+/g, " ");
}

function validateName(value, input, errorNode) {
    if (value.length < 3) {
        setFieldState(input, errorNode, false, "الاسم يجب أن يكون 3 أحرف على الأقل.");
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function validateEmail(value, users, input, errorNode) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (!valid) {
        setFieldState(input, errorNode, false, "صيغة البريد الإلكتروني غير صحيحة.");
        return false;
    }

    const exists = users.some((user) => user.email.toLowerCase() === value.toLowerCase());

    if (exists) {
        setFieldState(input, errorNode, false, "هذا البريد مستخدم بالفعل.");
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function validateSelect(value, input, errorNode, message) {
    if (!value) {
        setFieldState(input, errorNode, false, message);
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function validatePassword(value, input, errorNode) {
    const hasNumber = /\d/.test(value);

    if (value.length < 8) {
        setFieldState(input, errorNode, false, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
        return false;
    }

    if (!hasNumber) {
        setFieldState(input, errorNode, false, "أضف رقمًا واحدًا على الأقل لكلمة المرور.");
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function validateConfirm(password, confirmPassword, input, errorNode) {
    if (!confirmPassword) {
        setFieldState(input, errorNode, false, "أكد كلمة المرور.");
        return false;
    }

    if (password !== confirmPassword) {
        setFieldState(input, errorNode, false, "كلمتا المرور غير متطابقتين.");
        return false;
    }

    setFieldState(input, errorNode, true, "");
    return true;
}

function validateTerms(checked, errorNode) {
    errorNode.textContent = checked ? "" : "يجب الموافقة للاستمرار.";
    return checked;
}

function setFieldState(input, errorNode, isValid, message) {
    input.classList.toggle("is-valid", isValid);
    input.classList.toggle("is-invalid", !isValid);
    errorNode.textContent = message;
}

function readUsers() {
    try {
        const raw = localStorage.getItem(SIGNUP_KEYS.users);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function persistCurrentUser(user) {
    const { passwordHash, passwordUpdatedAt, ...safeUser } = user;
    localStorage.setItem(SIGNUP_KEYS.currentUser, JSON.stringify(safeUser));
}

function buildId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `user-${Date.now()}`;
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
