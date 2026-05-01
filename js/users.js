const USERS_KEYS = {
    users: "studyos.users",
    currentUser: "studyos.currentUser",
};

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const elements = {
        tableBody: document.getElementById("usersTableBody"),
        cards: document.getElementById("usersCards"),
        empty: document.getElementById("usersEmpty"),
        state: document.getElementById("usersState"),
        exportButton: document.getElementById("exportUsers"),
        totalNode: document.getElementById("usersTotal"),
        tracksNode: document.getElementById("usersTracks"),
        latestNode: document.getElementById("usersLatest"),
        searchInput: document.getElementById("usersSearch"),
        trackFilter: document.getElementById("usersTrackFilter"),
    };

    const currentUser = readCurrentUser();
    const allUsers = readUsers();
    const state = {
        search: "",
        track: "all",
        users: allUsers,
    };

    updateSummary(allUsers, elements);
    populateTrackFilter(allUsers, elements.trackFilter);

    elements.searchInput?.addEventListener("input", () => {
        state.search = elements.searchInput.value.trim().toLowerCase();
        renderUsers(state, elements, currentUser);
    });

    elements.trackFilter?.addEventListener("change", () => {
        state.track = elements.trackFilter.value;
        renderUsers(state, elements, currentUser);
    });

    elements.exportButton?.addEventListener("click", () => {
        const filteredUsers = getFilteredUsers(state.users, state.search, state.track);
        const csv = buildCsv(filteredUsers);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "studyos-users.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });

    renderUsers(state, elements, currentUser);
});

function renderUsers(state, elements, currentUser) {
    const filteredUsers = getFilteredUsers(state.users, state.search, state.track);

    if (!state.users.length) {
        if (elements.state) {
            elements.state.textContent = "لا توجد حسابات مضافة بعد.";
        }

        if (elements.empty) {
            elements.empty.hidden = false;
        }

        if (elements.exportButton) {
            elements.exportButton.disabled = true;
        }

        if (elements.tableBody) {
            elements.tableBody.innerHTML = "";
        }

        if (elements.cards) {
            elements.cards.innerHTML = "";
        }

        return;
    }

    if (elements.exportButton) {
        elements.exportButton.disabled = !filteredUsers.length;
    }

    if (elements.empty) {
        elements.empty.hidden = true;
    }

    if (elements.state) {
        elements.state.textContent = filteredUsers.length
            ? `يظهر الآن ${formatNumber(filteredUsers.length)} طالب من أصل ${formatNumber(state.users.length)}.`
            : "لا توجد نتائج مطابقة للبحث الحالي.";
    }

    if (elements.tableBody) {
        elements.tableBody.innerHTML = filteredUsers
            .map((user, index) => {
                const isCurrent = currentUser?.email?.toLowerCase() === user.email?.toLowerCase();

                return `
                    <tr class="${isCurrent ? "users-row--current" : ""}">
                        <td>${formatNumber(index + 1)}</td>
                        <td>
                            <div class="users-name-cell">
                                <strong>${escapeHtml(user.fullName || "-")}</strong>
                                ${isCurrent ? '<span class="users-badge">الحساب الحالي</span>' : ""}
                            </div>
                        </td>
                        <td>${escapeHtml(user.email || "-")}</td>
                        <td>${escapeHtml(user.studyTrack || "-")}</td>
                        <td>${escapeHtml(user.weeklyGoal || "-")}</td>
                        <td>${escapeHtml(formatDate(user.createdAt))}</td>
                    </tr>
                `;
            })
            .join("");
    }

    if (elements.cards) {
        elements.cards.innerHTML = filteredUsers
            .map((user) => {
                const isCurrent = currentUser?.email?.toLowerCase() === user.email?.toLowerCase();

                return `
                    <article class="user-mini-card ${isCurrent ? "user-mini-card--current" : ""}">
                        <div class="user-mini-card__top">
                            <strong>${escapeHtml(user.fullName || "-")}</strong>
                            ${isCurrent ? '<span class="users-badge">الحساب الحالي</span>' : ""}
                        </div>
                        <span>${escapeHtml(user.email || "-")}</span>
                        <span>المسار: ${escapeHtml(user.studyTrack || "-")}</span>
                        <span>الهدف: ${escapeHtml(user.weeklyGoal || "-")}</span>
                        <span>أضيف في: ${escapeHtml(formatDate(user.createdAt))}</span>
                    </article>
                `;
            })
            .join("");
    }
}

function updateSummary(users, elements) {
    if (elements.totalNode) {
        elements.totalNode.textContent = formatNumber(users.length);
    }

    if (elements.tracksNode) {
        elements.tracksNode.textContent = formatNumber(countTracks(users));
    }

    if (elements.latestNode) {
        elements.latestNode.textContent = users.length ? formatDate(users[0].createdAt) : "-";
    }
}

function populateTrackFilter(users, select) {
    if (!select) {
        return;
    }

    const tracks = [...new Set(users.map((user) => user.studyTrack).filter(Boolean))];
    const options = [
        '<option value="all">كل المسارات</option>',
        ...tracks.map((track) => `<option value="${escapeHtml(track)}">${escapeHtml(track)}</option>`),
    ];

    select.innerHTML = options.join("");
}

function getFilteredUsers(users, search, track) {
    return users.filter((user) => {
        const matchesTrack = track === "all" || user.studyTrack === track;
        const haystack = `${user.fullName || ""} ${user.email || ""} ${user.studyTrack || ""}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        return matchesTrack && matchesSearch;
    });
}

function readUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEYS.users);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function readCurrentUser() {
    try {
        const raw = localStorage.getItem(USERS_KEYS.currentUser);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function countTracks(users) {
    const tracks = new Set(users.map((user) => user.studyTrack).filter(Boolean));
    return tracks.size;
}

function formatNumber(value) {
    return new Intl.NumberFormat("ar-EG").format(value);
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("ar-EG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function buildCsv(users) {
    const rows = [
        ["Full Name", "Email", "Track", "Weekly Goal", "Created At"],
        ...users.map((user) => [
            user.fullName || "",
            user.email || "",
            user.studyTrack || "",
            user.weeklyGoal || "",
            user.createdAt || "",
        ]),
    ];

    return rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
