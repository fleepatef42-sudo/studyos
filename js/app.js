const STUDY_OS_KEYS = {
    users: "studyos.users",
    currentUser: "studyos.currentUser",
    dashboardTasks: "studyos.dashboardTasks",
    focusStats: "studyos.focusStats",
    focusHistory: "studyos.focusHistory",
    dailyNote: "studyos.dailyNote",
    dashboardTheme: "studyos.dashboardTheme",
};

const WEEK_DAYS = [
    { index: 6, shortLabel: "س", fullLabel: "السبت" },
    { index: 0, shortLabel: "ح", fullLabel: "الأحد" },
    { index: 1, shortLabel: "ن", fullLabel: "الاثنين" },
    { index: 2, shortLabel: "ث", fullLabel: "الثلاثاء" },
    { index: 3, shortLabel: "ر", fullLabel: "الأربعاء" },
    { index: 4, shortLabel: "خ", fullLabel: "الخميس" },
    { index: 5, shortLabel: "ج", fullLabel: "الجمعة" },
];

document.addEventListener("DOMContentLoaded", () => {
    refreshIcons();
    syncYears();
    initLandingPage();
    initDashboardPage();
});

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function buildScopedKey(baseKey, user) {
    const identifier = String(user?.id || user?.email || "guest")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${baseKey}.${identifier || "guest"}`;
}

function readUserScopedStorage(baseKey, user, fallback) {
    const scopedKey = buildScopedKey(baseKey, user);
    const scopedValue = readStorage(scopedKey, null);

    if (scopedValue !== null) {
        return scopedValue;
    }

    return readStorage(baseKey, fallback);
}

function writeUserScopedStorage(baseKey, user, value) {
    writeStorage(buildScopedKey(baseKey, user), value);
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function syncYears() {
    document.querySelectorAll("[data-current-year]").forEach((node) => {
        node.textContent = String(new Date().getFullYear());
    });
}

function initLandingPage() {
    if (!document.body.classList.contains("landing-body")) {
        return;
    }

    document.querySelectorAll("[data-counter]").forEach((counter) => {
        const target = Number(counter.dataset.counter || 0);
        animateCounter(counter, target);
    });

    setupFaqAccordion();
}

function animateCounter(node, target) {
    const duration = 1400;
    const start = performance.now();

    function frame(time) {
        const progress = Math.min((time - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = formatCounterValue(Math.round(target * eased));

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function setupFaqAccordion() {
    const items = Array.from(document.querySelectorAll(".faq-item"));

    if (!items.length) {
        return;
    }

    items.forEach((item) => {
        const button = item.querySelector("[data-faq-toggle]");

        if (!button) {
            return;
        }

        button.addEventListener("click", () => {
            const nextOpenState = !item.classList.contains("is-open");

            items.forEach((entry) => {
                entry.classList.remove("is-open");
            });

            if (nextOpenState) {
                item.classList.add("is-open");
            }
        });
    });
}

function formatCounterValue(value) {
    return new Intl.NumberFormat("ar-EG").format(value);
}

function initDashboardPage() {
    if (!document.body.classList.contains("dashboard-body")) {
        return;
    }

    const users = readStorage(STUDY_OS_KEYS.users, []);
    const currentUser = getCurrentUser(users);
    const dashboardState = {
        user: currentUser,
        taskPercent: 0,
        completedTasks: 0,
        totalTasks: 0,
        focusStats: normalizeFocusStats(
            readUserScopedStorage(STUDY_OS_KEYS.focusStats, currentUser, {
                completedSessions: 0,
                streak: 0,
                lastCompletedOn: "",
            })
        ),
        focusHistory: normalizeFocusHistory(
            readUserScopedStorage(STUDY_OS_KEYS.focusHistory, currentUser, [])
        ),
    };

    applyUserInfo(currentUser, users.length);
    setupClock();
    setupSidebar();
    setupCourseSearch();
    setupDailyNote(currentUser);
    setupDashboardTheme(currentUser);
    highlightRecommendedCourses(currentUser);

    const syncDashboard = () => {
        renderDashboardInsights(dashboardState);
    };

    setupTasks(currentUser, dashboardState, syncDashboard);
    setupFocusTimer(currentUser, dashboardState, syncDashboard);
    syncDashboard();
}

function getCurrentUser(users) {
    const storedUser = readStorage(STUDY_OS_KEYS.currentUser, null);

    if (storedUser) {
        return storedUser;
    }

    if (users.length) {
        return sanitizeCurrentUser(users[0]);
    }

    return {
        fullName: "طالب جديد",
        email: "guest@studyos.local",
        studyTrack: "المسار العام",
        weeklyGoal: "8 ساعات",
    };
}

function sanitizeCurrentUser(user) {
    const { passwordHash, passwordUpdatedAt, ...safeUser } = user || {};
    return safeUser;
}

function applyUserInfo(user, totalUsers) {
    const firstName = (user.fullName || "طالب").trim().split(/\s+/)[0];
    const initial = firstName.charAt(0) || "S";

    setText("[data-user-name]", user.fullName || "طالب جديد");
    setText("[data-user-firstname]", firstName);
    setText("[data-user-track]", user.studyTrack || "المسار العام");
    setText("[data-user-goal]", user.weeklyGoal || "8 ساعات");
    setText("[data-user-initial]", initial);
    setText("#registeredUsersMetric", formatCounterValue(totalUsers));
}

function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
        node.textContent = value;
    });
}

function setupClock() {
    const clock = document.getElementById("liveClock");

    if (!clock) {
        return;
    }

    const formatter = new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const update = () => {
        clock.textContent = formatter.format(new Date());
    };

    update();
    window.setInterval(update, 1000);
}

function setupSidebar() {
    const sidebar = document.getElementById("dashboardSidebar");
    const overlay = document.getElementById("pageOverlay");
    const openButton = document.getElementById("sidebarToggle");
    const closeButton = document.getElementById("sidebarClose");

    if (!sidebar || !overlay || !openButton || !closeButton) {
        return;
    }

    const openSidebar = () => {
        sidebar.classList.add("is-open");
        overlay.hidden = false;
        document.body.classList.add("is-locked");
    };

    const closeSidebar = () => {
        sidebar.classList.remove("is-open");
        overlay.hidden = true;
        document.body.classList.remove("is-locked");
    };

    openButton.addEventListener("click", openSidebar);
    closeButton.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);
}

function setupCourseSearch() {
    const input = document.getElementById("courseSearch");
    const cards = Array.from(document.querySelectorAll("[data-course-card]"));

    if (!input || !cards.length) {
        return;
    }

    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();

        cards.forEach((card) => {
            const haystack = (card.dataset.courseName || card.textContent || "").toLowerCase();
            const visible = !query || haystack.includes(query);
            card.classList.toggle("is-hidden", !visible);
        });
    });
}

function setupTasks(user, state, onUpdate) {
    const taskInputs = Array.from(document.querySelectorAll("[data-task-id]"));
    const progressBar = document.getElementById("taskProgressBar");
    const progressLabel = document.getElementById("progressLabel");
    const completedCount = document.getElementById("completedTasksCount");
    const remainingCount = document.getElementById("remainingTasksCount");

    if (!taskInputs.length || !progressBar || !progressLabel || !completedCount || !remainingCount) {
        return;
    }

    const savedState = readUserScopedStorage(STUDY_OS_KEYS.dashboardTasks, user, {});

    taskInputs.forEach((input) => {
        const taskId = input.dataset.taskId;

        if (Object.prototype.hasOwnProperty.call(savedState, taskId)) {
            input.checked = Boolean(savedState[taskId]);
        }

        input.closest(".task-item")?.classList.toggle("is-done", input.checked);
        input.addEventListener("change", syncTasks);
    });

    function syncTasks() {
        const nextState = {};
        let completed = 0;

        taskInputs.forEach((input) => {
            nextState[input.dataset.taskId] = input.checked;
            input.closest(".task-item")?.classList.toggle("is-done", input.checked);

            if (input.checked) {
                completed += 1;
            }
        });

        const total = taskInputs.length;
        const remaining = total - completed;
        const percent = total ? Math.round((completed / total) * 100) : 0;

        state.taskPercent = percent;
        state.completedTasks = completed;
        state.totalTasks = total;

        writeUserScopedStorage(STUDY_OS_KEYS.dashboardTasks, user, nextState);
        progressBar.style.width = `${percent}%`;
        progressLabel.textContent = `${percent}%`;
        completedCount.textContent = formatCounterValue(completed);
        remainingCount.textContent = formatCounterValue(remaining);

        onUpdate();
    }

    syncTasks();
}

function setupFocusTimer(user, state, onUpdate) {
    const timerNode = document.getElementById("focusTimer");
    const stateNode = document.getElementById("focusState");
    const startButton = document.getElementById("focusStart");
    const resetButton = document.getElementById("focusReset");
    const sessionsNode = document.getElementById("focusSessionsCount");
    const streakNode = document.getElementById("focusStreakCount");

    if (!timerNode || !stateNode || !startButton || !resetButton || !sessionsNode || !streakNode) {
        return;
    }

    let timeLeft = 25 * 60;
    let timerId = null;
    let isRunning = false;

    const stats = state.focusStats;

    const renderTime = () => {
        const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
        const seconds = String(timeLeft % 60).padStart(2, "0");
        timerNode.textContent = `${minutes}:${seconds}`;
        sessionsNode.textContent = formatCounterValue(stats.completedSessions);
        streakNode.textContent = formatCounterValue(stats.streak);
    };

    const stopTimer = () => {
        window.clearInterval(timerId);
        timerId = null;
        isRunning = false;
    };

    const completeSession = () => {
        stopTimer();
        const todayKey = toDateKey(new Date());

        stats.completedSessions += 1;
        stats.streak = computeNextStreak(stats.lastCompletedOn, todayKey, stats.streak);
        stats.lastCompletedOn = todayKey;
        state.focusHistory = recordFocusDay(state.focusHistory, todayKey);

        writeUserScopedStorage(STUDY_OS_KEYS.focusStats, user, stats);
        writeUserScopedStorage(STUDY_OS_KEYS.focusHistory, user, state.focusHistory);

        stateNode.textContent = "أحسنت، أكملت جلسة تركيز جديدة.";
        startButton.textContent = "ابدأ من جديد";
        timeLeft = 25 * 60;
        renderTime();
        onUpdate();
    };

    startButton.addEventListener("click", () => {
        if (isRunning) {
            stopTimer();
            stateNode.textContent = "تم إيقاف الجلسة مؤقتًا.";
            startButton.textContent = "استئناف";
            return;
        }

        if (timeLeft <= 0) {
            timeLeft = 25 * 60;
        }

        isRunning = true;
        stateNode.textContent = "الجلسة تعمل الآن.";
        startButton.textContent = "إيقاف مؤقت";

        timerId = window.setInterval(() => {
            timeLeft -= 1;
            renderTime();

            if (timeLeft <= 0) {
                completeSession();
            }
        }, 1000);
    });

    resetButton.addEventListener("click", () => {
        stopTimer();
        timeLeft = 25 * 60;
        stateNode.textContent = "جاهز للبدء";
        startButton.textContent = "ابدأ";
        renderTime();
    });

    renderTime();
}

function normalizeFocusStats(value) {
    return {
        completedSessions: Number(value?.completedSessions || 0),
        streak: Number(value?.streak || 0),
        lastCompletedOn: typeof value?.lastCompletedOn === "string" ? value.lastCompletedOn : "",
    };
}

function normalizeFocusHistory(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => ({
            date: typeof entry?.date === "string" ? entry.date : "",
            count: Number(entry?.count || 0),
        }))
        .filter((entry) => entry.date && entry.count > 0)
        .slice(-30);
}

function toDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function computeNextStreak(lastCompletedOn, todayKey, currentStreak) {
    if (!lastCompletedOn) {
        return 1;
    }

    if (lastCompletedOn === todayKey) {
        return Math.max(1, currentStreak);
    }

    const lastDate = new Date(lastCompletedOn);
    const today = new Date(todayKey);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((today - lastDate) / oneDay);

    if (diffDays === 1) {
        return currentStreak + 1;
    }

    return 1;
}

function recordFocusDay(history, todayKey) {
    const nextHistory = [...history];
    const existingEntry = nextHistory.find((entry) => entry.date === todayKey);

    if (existingEntry) {
        existingEntry.count += 1;
    } else {
        nextHistory.push({ date: todayKey, count: 1 });
    }

    return nextHistory
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-30);
}

function setupDailyNote(user) {
    const noteInput = document.getElementById("dailyNote");
    const stateNode = document.getElementById("dailyNoteState");

    if (!noteInput || !stateNode) {
        return;
    }

    const savedNote = readUserScopedStorage(STUDY_OS_KEYS.dailyNote, user, {
        content: "",
        updatedAt: "",
    });

    noteInput.value = typeof savedNote === "string" ? savedNote : savedNote.content || "";
    renderNoteState(stateNode, typeof savedNote === "string" ? "" : savedNote.updatedAt || "");

    let saveTimer = null;

    noteInput.addEventListener("input", () => {
        stateNode.textContent = "جارٍ حفظ الملاحظة...";
        window.clearTimeout(saveTimer);

        saveTimer = window.setTimeout(() => {
            const payload = {
                content: noteInput.value.trim(),
                updatedAt: new Date().toISOString(),
            };

            writeUserScopedStorage(STUDY_OS_KEYS.dailyNote, user, payload);
            renderNoteState(stateNode, payload.updatedAt);
        }, 220);
    });
}

function renderNoteState(node, updatedAt) {
    if (!updatedAt) {
        node.textContent = "يتم حفظ الملاحظة تلقائيًا.";
        return;
    }

    const formatter = new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
    });

    node.textContent = `آخر حفظ ${formatter.format(new Date(updatedAt))}`;
}

function setupDashboardTheme(user) {
    const chips = Array.from(document.querySelectorAll("[data-dashboard-theme]"));

    if (!chips.length) {
        return;
    }

    const allowedThemes = new Set(["teal", "sunset", "ocean"]);
    const storedTheme = readUserScopedStorage(STUDY_OS_KEYS.dashboardTheme, user, "teal");

    const applyTheme = (theme) => {
        const safeTheme = allowedThemes.has(theme) ? theme : "teal";

        document.body.dataset.dashboardTheme = safeTheme;
        chips.forEach((chip) => {
            chip.classList.toggle("is-active", chip.dataset.dashboardTheme === safeTheme);
        });
    };

    applyTheme(storedTheme);

    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            const nextTheme = chip.dataset.dashboardTheme || "teal";
            writeUserScopedStorage(STUDY_OS_KEYS.dashboardTheme, user, nextTheme);
            applyTheme(nextTheme);
        });
    });
}

function highlightRecommendedCourses(user) {
    const cards = Array.from(document.querySelectorAll("[data-course-card]"));
    const track = String(user?.studyTrack || "");
    const trackKeywords = {
        البرمجة: ["بايثون", "برمجة"],
        "الثانوية العامة": ["رياضيات", "الثانوية"],
        اللغات: ["اللغة", "English"],
        "التطوير الذاتي": ["عملية", "مراجعة"],
    };

    const keywords = trackKeywords[track] || [];

    cards.forEach((card) => {
        const haystack = `${card.dataset.courseName || ""} ${card.textContent || ""}`;
        const isRecommended = keywords.some((keyword) => haystack.includes(keyword));
        card.classList.toggle("is-recommended", isRecommended);

        let pill = card.querySelector(".recommendation-pill");

        if (isRecommended && !pill) {
            pill = document.createElement("span");
            pill.className = "recommendation-pill";
            pill.textContent = "مناسب لمسارك";
            card.querySelector(".course-card__top")?.appendChild(pill);
        }

        if (!isRecommended && pill) {
            pill.remove();
        }
    });
}

function renderDashboardInsights(state) {
    const bars = Array.from(document.querySelectorAll("[data-momentum-bar]"));
    const bestDayNode = document.getElementById("bestDayValue");
    const weeklyHoursNode = document.getElementById("weeklyHoursValue");
    const momentumNode = document.getElementById("momentumState");

    if (!bars.length) {
        return;
    }

    const momentum = buildMomentumMetrics(state.focusHistory, state.taskPercent);

    bars.forEach((bar, index) => {
        const metric = momentum[index];

        if (!metric) {
            return;
        }

        const fill = bar.querySelector(".bar-column__fill");
        const shortLabel = bar.querySelector("strong");
        const percentLabel = bar.querySelector("small");

        if (fill) {
            fill.style.height = `${metric.percent}%`;
        }

        if (shortLabel) {
            shortLabel.textContent = metric.shortLabel;
        }

        if (percentLabel) {
            percentLabel.textContent = `${metric.percent}%`;
        }
    });

    const bestDay = momentum.reduce((best, day) => {
        if (!best || day.percent > best.percent) {
            return day;
        }

        return best;
    }, null);

    if (bestDayNode && bestDay) {
        bestDayNode.textContent = bestDay.fullLabel;
    }

    if (weeklyHoursNode) {
        weeklyHoursNode.textContent = formatEstimatedHours(state.focusStats.completedSessions);
    }

    if (momentumNode) {
        momentumNode.textContent = buildMomentumMessage(state);
    }
}

function buildMomentumMetrics(history, taskPercent) {
    const focusByDay = history.reduce((accumulator, entry) => {
        const date = new Date(entry.date);
        const dayIndex = date.getDay();
        accumulator.set(dayIndex, (accumulator.get(dayIndex) || 0) + entry.count);
        return accumulator;
    }, new Map());

    const todayIndex = new Date().getDay();

    return WEEK_DAYS.map((day) => {
        const sessions = focusByDay.get(day.index) || 0;
        const sessionPercent = Math.min(100, sessions * 28 + (sessions ? 12 : 0));
        const taskBoost = day.index === todayIndex ? Math.round(taskPercent * 0.72) : 0;
        const percent = Math.min(100, Math.max(taskBoost, sessionPercent + taskBoost));

        return {
            ...day,
            sessions,
            percent,
        };
    });
}

function formatEstimatedHours(completedSessions) {
    const hours = completedSessions * (25 / 60);

    return new Intl.NumberFormat("ar-EG", {
        maximumFractionDigits: 1,
        minimumFractionDigits: hours > 0 && hours < 1 ? 1 : 0,
    }).format(hours);
}

function buildMomentumMessage(state) {
    if (state.taskPercent >= 100) {
        return "أنهيت خطة اليوم بالكامل، استمر على هذا الإيقاع.";
    }

    if (state.taskPercent >= 70) {
        return "أنت قريب جدًا من إنهاء خطة اليوم. جلسة واحدة إضافية قد تكفي.";
    }

    if (state.focusStats.completedSessions > 0) {
        return "الجلسات المكتملة رفعت مؤشر الأسبوع، والآن أكمل ما تبقى من المهام.";
    }

    if (state.completedTasks > 0) {
        return "بدأت المهام بشكل جيد. شغّل وضع التركيز لرفع المؤشر بسرعة.";
    }

    return "ابدأ بأول مهمة صغيرة أو جلسة تركيز وسيتحرك المؤشر تلقائيًا.";
}
