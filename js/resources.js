const RESOURCES_KEYS = {
    favorites: "studyos.resourcesFavorites",
    currentUser: "studyos.currentUser",
};

const RESOURCE_ITEMS = [
    {
        id: "python-start",
        title: "مسار بايثون من الصفر",
        category: "البرمجة",
        level: "مبتدئ",
        duration: "6 وحدات",
        description: "دروس تأسيس + تمارين عملية + مشروع صغير لتثبيت الأساسيات.",
        accent: "#0f766e",
    },
    {
        id: "math-revision",
        title: "مراجعة الرياضيات التطبيقية",
        category: "الثانوية العامة",
        level: "متوسط",
        duration: "12 اختبارًا",
        description: "ملخصات قصيرة مع اختبارات قياس أداء وخطة أسبوعية للمراجعة.",
        accent: "#f59e0b",
    },
    {
        id: "english-routine",
        title: "الإنجليزية العملية اليومية",
        category: "اللغات",
        level: "جميع المستويات",
        duration: "4 أسابيع",
        description: "خطة خفيفة للمفردات والاستماع والتطبيق في مواقف يومية.",
        accent: "#2563eb",
    },
    {
        id: "study-planner",
        title: "نظام تخطيط أسبوعي للطباعة",
        category: "الإنتاجية",
        level: "جاهز للاستخدام",
        duration: "ملف PDF",
        description: "قالب منظم لتوزيع المهام وتتبع جلسات التركيز والمراجعة.",
        accent: "#7c3aed",
    },
    {
        id: "frontend-track",
        title: "بداية تطوير الواجهات",
        category: "البرمجة",
        level: "مبتدئ",
        duration: "5 وحدات",
        description: "HTML وCSS وJavaScript بشكل عملي مع تطبيقات صغيرة.",
        accent: "#ea580c",
    },
    {
        id: "exam-bank",
        title: "بنك اختبارات سريع",
        category: "الثانوية العامة",
        level: "مراجعة",
        duration: "يحدث أسبوعيًا",
        description: "اختبارات قصيرة متجددة تساعدك على قياس المستوى بسرعة.",
        accent: "#0891b2",
    },
    {
        id: "speaking-club",
        title: "روتين المحادثة والظل",
        category: "اللغات",
        level: "متوسط",
        duration: "21 يومًا",
        description: "خطة يومية لتحسين النطق والطلاقة من خلال محاكاة جمل واقعية.",
        accent: "#be185d",
    },
    {
        id: "habit-system",
        title: "نظام بناء العادات الدراسية",
        category: "الإنتاجية",
        level: "عملي",
        duration: "7 خطوات",
        description: "منهج بسيط لتثبيت عادة المذاكرة وتقليل المماطلة.",
        accent: "#4f46e5",
    },
];

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const elements = {
        grid: document.getElementById("resourcesGrid"),
        searchInput: document.getElementById("resourcesSearch"),
        filterBar: document.getElementById("resourcesFilters"),
        resultsState: document.getElementById("resourcesState"),
        favoritesCount: document.getElementById("favoritesCount"),
        currentTrack: document.getElementById("currentTrackValue"),
        favoritesToggle: document.getElementById("favoritesOnly"),
    };

    if (!elements.grid) {
        return;
    }

    const currentUser = readCurrentUser();
    const state = {
        search: "",
        filter: "الكل",
        favoritesOnly: false,
        favorites: readFavorites(),
    };

    if (elements.currentTrack) {
        elements.currentTrack.textContent = currentUser?.studyTrack || "المسار العام";
    }

    renderFavoritesCount(state.favorites, elements.favoritesCount);
    bindFilters(elements.filterBar, state, elements, currentUser);

    elements.searchInput?.addEventListener("input", () => {
        state.search = elements.searchInput.value.trim().toLowerCase();
        renderResources(state, elements, currentUser);
    });

    elements.favoritesToggle?.addEventListener("click", () => {
        state.favoritesOnly = !state.favoritesOnly;
        elements.favoritesToggle.classList.toggle("is-active", state.favoritesOnly);
        elements.favoritesToggle.textContent = state.favoritesOnly ? "عرض الكل" : "المحفوظات فقط";
        renderResources(state, elements, currentUser);
    });

    renderResources(state, elements, currentUser);
});

function bindFilters(container, state, elements, currentUser) {
    if (!container) {
        return;
    }

    const buttons = Array.from(container.querySelectorAll("[data-resource-filter]"));

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            state.filter = button.dataset.resourceFilter || "الكل";
            buttons.forEach((chip) => {
                chip.classList.toggle("is-active", chip === button);
            });
            renderResources(state, elements, currentUser);
        });
    });
}

function renderResources(state, elements, currentUser) {
    const filteredResources = getFilteredResources(state, currentUser);

    elements.grid.innerHTML = filteredResources.length
        ? filteredResources
              .map((resource) => {
                  const isFavorite = state.favorites.includes(resource.id);
                  const isRecommended = isResourceRecommended(resource, currentUser?.studyTrack || "");

                  return `
                      <article class="resource-card" style="--resource-accent: ${resource.accent}">
                          <div class="resource-card__top">
                              <span class="resource-category">${resource.category}</span>
                              <button
                                  class="resource-save ${isFavorite ? "is-active" : ""}"
                                  type="button"
                                  data-save-resource="${resource.id}"
                                  aria-pressed="${isFavorite}"
                              >
                                  ${isFavorite ? "محفوظ" : "حفظ"}
                              </button>
                          </div>

                          <h3>${resource.title}</h3>
                          <p>${resource.description}</p>

                          <div class="resource-meta">
                              <span>${resource.level}</span>
                              <span>${resource.duration}</span>
                              ${isRecommended ? '<span class="resource-recommendation">مناسب لمسارك</span>' : ""}
                          </div>

                          <div class="resource-actions">
                              <a class="btn btn--primary" href="home.html#courses">افتح من اللوحة</a>
                              <a class="btn btn--ghost" href="signup.html">ابدأ بهذا المسار</a>
                          </div>
                      </article>
                  `;
              })
              .join("")
        : `
              <div class="resources-empty">
                  <h3>لا توجد موارد بهذه المواصفات الآن</h3>
                  <p>جرّب إزالة الفلتر أو كتابة كلمة بحث مختلفة.</p>
              </div>
          `;

    if (elements.resultsState) {
        elements.resultsState.textContent = filteredResources.length
            ? `تم العثور على ${toArabicNumber(filteredResources.length)} مورد مناسب.`
            : "لا توجد نتائج مطابقة حاليًا.";
    }

    elements.grid.querySelectorAll("[data-save-resource]").forEach((button) => {
        button.addEventListener("click", () => {
            const resourceId = button.dataset.saveResource;
            state.favorites = toggleFavorite(state.favorites, resourceId);
            writeFavorites(state.favorites);
            renderFavoritesCount(state.favorites, elements.favoritesCount);
            renderResources(state, elements, currentUser);
        });
    });
}

function getFilteredResources(state, currentUser) {
    return RESOURCE_ITEMS.filter((resource) => {
        const haystack = `${resource.title} ${resource.category} ${resource.description}`.toLowerCase();
        const matchesSearch = !state.search || haystack.includes(state.search);
        const matchesFilter = state.filter === "الكل" || resource.category === state.filter;
        const matchesFavorites = !state.favoritesOnly || state.favorites.includes(resource.id);
        return matchesSearch && matchesFilter && matchesFavorites;
    }).sort((left, right) => {
        const leftRecommended = isResourceRecommended(left, currentUser?.studyTrack || "");
        const rightRecommended = isResourceRecommended(right, currentUser?.studyTrack || "");

        if (leftRecommended === rightRecommended) {
            return 0;
        }

        return leftRecommended ? -1 : 1;
    });
}

function isResourceRecommended(resource, track) {
    const map = {
        البرمجة: ["البرمجة"],
        "الثانوية العامة": ["الثانوية العامة"],
        اللغات: ["اللغات"],
        "التطوير الذاتي": ["الإنتاجية"],
    };

    const categories = map[track] || [];
    return categories.includes(resource.category);
}

function toggleFavorite(favorites, resourceId) {
    return favorites.includes(resourceId)
        ? favorites.filter((id) => id !== resourceId)
        : [...favorites, resourceId];
}

function readFavorites() {
    try {
        const raw = localStorage.getItem(RESOURCES_KEYS.favorites);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function writeFavorites(favorites) {
    localStorage.setItem(RESOURCES_KEYS.favorites, JSON.stringify(favorites));
}

function readCurrentUser() {
    try {
        const raw = localStorage.getItem(RESOURCES_KEYS.currentUser);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function renderFavoritesCount(favorites, node) {
    if (!node) {
        return;
    }

    node.textContent = toArabicNumber(favorites.length);
}

function toArabicNumber(value) {
    return new Intl.NumberFormat("ar-EG").format(value);
}
