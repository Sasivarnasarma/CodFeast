// ===== Config =====
const API_BASE = window.API_BASE || "https://cod-api.sasivarnasarma.eu.org/";
const COUNTDOWN = "2025-08-30 08:00";

// ===== Mobile menu =====
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    const open = getComputedStyle(navLinks).display !== "none";
    navLinks.style.display = open ? "none" : "flex";
  });
}

// ===== Countdown =====
(function () {
  const el = document.getElementById("countdown");
  if (!el) return;

  function targetTime() {
    const t = new Date(COUNTDOWN);
    if (t < new Date()) t.setDate(t.getDate() + 1);
    return t;
  }

  function update() {
    const now = new Date();
    const diff = targetTime() - now;
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const h = String(hours).padStart(2, "0");
    const m = String(minutes).padStart(2, "0");
    const s = String(seconds).padStart(2, "0");

    if (diff <= 0) {
      document.querySelector(".hero-meta")?.setAttribute("hidden", "");
      // el.textContent = "The match has started!";
    } else {
      el.textContent = `${days} D ${h} H ${m} M ${s} S`;
    }
  }

  update();
  setInterval(update, 1000);
})();

// ===== Helpers =====
async function api(path, opts = {}) {
  const url = API_BASE.replace(/\/$/, "") + path;
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = "";
    try {
      msg = (await res.json()).detail || (await res.text());
    } catch (_) {
      msg = `HTTP ${res.status}`;
    }
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function showToast(el, msg, ok = true, timeout = 4000) {
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show " + (ok ? "success" : "error");
  setTimeout(() => {
    el.classList.remove("show");
    el.textContent = "";
  }, timeout);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ===== Registration =====
(function () {
  const form = document.getElementById("teamRegisterForm");
  if (!form) return;
  const toast = document.getElementById("regToast");
  const submitBtn = form?.querySelector('button[type="submit"]');
  const btnText = submitBtn?.querySelector(".btn-text");
  const spinner = document.getElementById("submitSpinner");
  const teamNameInput = document.getElementById("teamName");
  const phoneInput = document.getElementById("teamPhone");
  const memberInputs = form?.querySelectorAll(".member-name");

  const nameRegex = /^[A-Za-z0-9 ]{4,30}$/;
  const phoneRegex = /^07\d{8}$/;
  const memberRegex = /^[A-Za-z ]{5,30}$/;

  let turnstileToken = "";
  const touched = new Set();

  function validateField(input, regex, errorEl, msg) {
    const value = input.value.trim();
    const isValid = regex.test(value);
    if (touched.has(input) && !isValid) {
      errorEl.textContent = msg;
    } else {
      errorEl.textContent = "";
    }
    return isValid;
  }

  function validateFormRealtime() {
    const nameError = document.getElementById("teamNameError");
    const phoneError = document.getElementById("teamPhoneError");

    const isTeamNameValid = validateField(
      teamNameInput,
      nameRegex,
      nameError,
      "Team name must be 4-30 letters/numbers"
    );

    const isPhoneValid = validateField(
      phoneInput,
      phoneRegex,
      phoneError,
      "Phone must be 10 digits, must start with 07"
    );

    let areMembersValid = true;
    let allFilled = true;

    memberInputs.forEach((input, i) => {
      const errorEl = form.querySelector(`.member-error[data-index="${i}"]`);
      const value = input.value.trim();
      const isValid = memberRegex.test(value);

      if (touched.has(input) && !isValid) {
        errorEl.textContent = `Member ${i + 1}: 5-30 letters only`;
      } else {
        errorEl.textContent = "";
      }

      if (!isValid) areMembersValid = false;
      if (!value) allFilled = false;
    });

    const formIsValid =
      isTeamNameValid && isPhoneValid && areMembersValid && allFilled;
    if (submitBtn) submitBtn.disabled = !(formIsValid && turnstileToken);
  }

  [teamNameInput, phoneInput, ...memberInputs].forEach((input) => {
    input.addEventListener("input", () => {
      touched.add(input);
      validateFormRealtime();
    });
    input.addEventListener("blur", () => {
      touched.add(input);
      validateFormRealtime();
    });
  });

  validateFormRealtime();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    [teamNameInput, phoneInput, ...memberInputs].forEach((i) => touched.add(i));
    validateFormRealtime();

    const teamName = teamNameInput?.value.trim() || "";
    const telephone = phoneInput?.value.trim() || "";

    const members = Array.from(memberInputs)
      .map((input) => input.value.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    if (!nameRegex.test(teamName)) {
      showToast(toast, "Invalid team name format.", false);
      return;
    }

    if (!phoneRegex.test(telephone)) {
      showToast(toast, "Invalid phone number format.", false);
      return;
    }

    if (members.length !== 5) {
      showToast(toast, "Exactly 5 team members are required.", false);
      return;
    }

    for (let i = 0; i < members.length; i++) {
      if (!memberRegex.test(members[i].name)) {
        showToast(toast, `Invalid name for member ${i + 1}.`, false);
        return;
      }
    }

    if (!turnstileToken) {
      showToast(toast, "Please complete the CAPTCHA verification.", false);
      return;
    }

    const payload = {
      id:
        "team_" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8),
      name: teamName,
      telephone,
      members,
      cf_turnstile: turnstileToken,
    };

    try {
      btnText.hidden = true;
      spinner.hidden = false;

      await api("/teams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      showToast(toast, "Team registered successfully.");
      localStorage.setItem("lastTeamName", payload.name);
      setTimeout(() => {
        window.location.href = `./team.html?id=${payload.id}&stp=1`;
      }, 2000);
    } catch (err) {
      btnText.hidden = false;
      spinner.hidden = true;
      console.error(err);
      turnstileToken = "";
      turnstile.reset();
      validateFormRealtime();
      showToast(toast, "Registration failed: " + err.message, false, 10000);
    }
  });

  window.onTurnstileVerified = function (token) {
    turnstileToken = token;
    validateFormRealtime();
  };

  window.onTurnstileExpired = function () {
    turnstileToken = "";
    validateFormRealtime();
  };
})();

// ===== Matches =====
async function loadMatches() {
  const upList = document.getElementById("upMatchesList");
  const upEmpty = document.getElementById("upMatchesEmpty");
  const fnList = document.getElementById("fnMatchesList");
  const fnEmpty = document.getElementById("fnMatchesEmpty");

  if (!upList || !upEmpty || !fnList || !fnEmpty) return;

  upList.style.display = "block";
  fnList.style.display = "block";
  upList.innerHTML =
    '<div class="spinner-container"><div class="spinner"></div></div>';
  fnList.innerHTML =
    '<div class="spinner-container"><div class="spinner"></div></div>';
  upEmpty.hidden = true;
  fnEmpty.hidden = true;

  try {
    const matches = await api("/matches", { method: "GET" });

    if (!Array.isArray(matches) || matches.length === 0) {
      upList.innerHTML = "";
      fnList.innerHTML = "";
      upEmpty.hidden = false;
      fnEmpty.hidden = false;
      return;
    }

    const teamIds = new Set();
    matches.forEach((m) => {
      if (m.team1_id) teamIds.add(m.team1_id);
      if (m.team2_id) teamIds.add(m.team2_id);
    });

    const allTeams = await api("/teams", { method: "GET" });

    const teamMap = {};
    if (Array.isArray(allTeams)) {
      allTeams.forEach((team) => {
        teamMap[team.id] = {
          name: team.name || team.id,
          points: team.total_points ?? "-",
        };
      });
    }

    const upcomingMatches = matches
      .filter((m) => m.status !== "completed")
      .slice(0, 9);
    const finishedMatches = matches
      .filter((m) => m.status === "completed")
      .slice(0, 9);

    function renderCards(matchArray, showFinalScore = false) {
      return matchArray
        .map((m) => {
          const team1 = teamMap[m.team1_id] || {
            name: m.team1_id,
            points: "-",
          };
          const team2 = teamMap[m.team2_id] || {
            name: m.team2_id,
            points: "-",
          };

          const score =
            showFinalScore && m.team1_score != null && m.team2_score != null
              ? `${m.team1_score} - ${m.team2_score}`
              : "";

          let meta = "";
          if (
            showFinalScore &&
            m.team1_score != null &&
            m.team2_score != null
          ) {
            if (m.team1_score > m.team2_score) {
              meta = `${team1.name} Wins • `;
            } else if (m.team2_score > m.team1_score) {
              meta = `${team2.name} Wins • `;
            } else {
              meta = "Draw • ";
            }
          } else {
            meta = m.scheduled_time ? formatDate(m.scheduled_time) : "";
          }

          const scoreHtml = score ? `<span class="meta">${score}</span>` : "";

          return `<article class="card">
            <div class="row teams">
              <span>${team1.name} (${team1.points} pts)</span>
              <span>vs</span>
              <span>${team2.name} (${team2.points} pts)</span>
            </div>
            <div class="row">
              <span class="meta">${meta}</span>${scoreHtml}
            </div>
          </article>`;
        })
        .join("");
    }

    upList.style.display = "";
    fnList.style.display = "";

    upList.innerHTML =
      upcomingMatches.length > 0 ? renderCards(upcomingMatches) : "";
    fnList.innerHTML =
      finishedMatches.length > 0 ? renderCards(finishedMatches, true) : "";

    upEmpty.hidden = upcomingMatches.length > 0;
    fnEmpty.hidden = finishedMatches.length > 0;
  } catch (err) {
    console.error(err);
    upList.innerHTML = `<div class="empty">Failed to load matches: ${err.message}</div>`;
    fnList.innerHTML = `<div class="empty">Failed to load matches: ${err.message}</div>`;
  }
}

document
  .getElementById("upRefreshMatches")
  ?.addEventListener("click", loadMatches);
document
  .getElementById("fnRefreshMatches")
  ?.addEventListener("click", loadMatches);

// ===== Leaderboard =====
async function loadLeaderboard() {
  const tableWrap = document.getElementById("leaderboardTableWrap");
  const tbody = document.querySelector("#leaderboardTable tbody");
  const empty = document.getElementById("leaderboardEmpty");
  if (!tableWrap || !tbody || !empty) return;

  tbody.innerHTML = "";
  empty.hidden = true;
  tableWrap.classList.add("skeleton");

  try {
    const data = await api("/leaderboard", { method: "GET" });
    const rows = (Array.isArray(data) ? data : data.rankings || []).map(
      (row, i) => {
        const team = row.name || "Unknown";
        const wins = row.wins ?? 0;
        const losses = row.losses ?? 0;
        const draws = row.draws ?? 0;
        const pts = row.total_points ?? 0;
        return `<tr><td>${
          i + 1
        }</td><td>${team}</td><td>${pts}</td><td>${wins}</td><td>${losses}</td><td>${draws}</td></tr>`;
      }
    );
    if (rows.length === 0) {
      empty.hidden = false;
      return;
    }
    tbody.innerHTML = rows.join("");
  } catch (err) {
    console.error(err);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6">Failed to load leaderboard: ${err.message}</td>`;
    tbody.appendChild(tr);
  } finally {
    tableWrap.classList.remove("skeleton");
  }
}

document
  .getElementById("refreshLeaderboard")
  ?.addEventListener("click", loadLeaderboard);

// === Teams List ===
async function loadTeamsList() {
  const loadingEl = document.getElementById("teamsLoading");
  const errorEl = document.getElementById("teamsError");
  const cardsContainer = document.getElementById("teamsCards");
  const countEl = document.getElementById("teamCount");

  if (!loadingEl || !errorEl || !cardsContainer) {
    return;
  }

  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
  cardsContainer.innerHTML = "";

  try {
    const res = await api("/teams", { method: "GET" });

    if (!Array.isArray(res) || res.length === 0) {
      cardsContainer.innerHTML = "<p>No teams found.</p>";
      loadingEl.classList.add("hidden");
      return;
    }

    if (countEl) {
      countEl.textContent = `(${res.length})`;
    }

    res.forEach((team) => {
      const points = team.total_points ?? 0;
      const wins = team.wins ?? 0;
      const draws = team.draws ?? 0;
      const losses = team.losses ?? 0;
      const rawStatus = team.status || "unknown";
      const niceStatus =
        rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

      const card = document.createElement("div");
      card.className = "team-card";
      card.tabIndex = 0;

      card.innerHTML = `
        <h3>${team.name}</h3>
        <span class="team-status-label ${
          rawStatus.toLowerCase() || "unknown"
        }">${niceStatus}</span>
        <div class="team-stats">
          <div>
            <span>${points}</span>
            Points
          </div>
          <div>
            <span>${wins}</span>
            Wins
          </div>
          <div>
            <span>${draws}</span>
            Draws
          </div>
          <div>
            <span>${losses}</span>
            Losses
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        window.location.href = `team.html?id=${encodeURIComponent(team.id)}`;
      });

      card.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          window.location.href = `team.html?id=${encodeURIComponent(team.id)}`;
        }
      });

      cardsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading teams:", error);
    errorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

if (document.getElementById("teamsListSection")) {
  document.addEventListener("DOMContentLoaded", loadTeamsList);
}

// === Team Details ===
async function loadTeamDetails() {
  const queryParams = new URLSearchParams(window.location.search);
  const teamId = queryParams.get("id");
  const showTelephone = queryParams.get("stp") === "1";

  const el = {
    loading: document.getElementById("teamLoading"),
    content: document.getElementById("teamContent"),
    error: document.getElementById("teamError"),
    name: document.getElementById("teamName"),
    status: document.getElementById("teamStatus"),
    phone: document.getElementById("teamPhone"),
    registeredAt: document.getElementById("teamRegisteredAt"),
    points: document.getElementById("teamPoints"),
    record: document.getElementById("teamRecord"),
    memberList: document.getElementById("teamMemberList"),
  };

  el.loading.classList.remove("hidden");
  el.content.classList.add("hidden");
  el.error.classList.add("hidden");

  if (!teamId) {
    el.loading.classList.add("hidden");
    el.error.textContent = "No team ID provided.";
    el.error.classList.remove("hidden");
    return;
  }

  try {
    const team = await api(`/teams/${teamId}`);

    el.name.textContent = team.name || "Unnamed Team";

    const rawStatus = team.status || "unknown";
    const niceStatus =
      rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
    el.status.textContent = `Status: ${niceStatus}`;
    el.status.className = "team-status " + rawStatus.toLowerCase();

    if (showTelephone && team.telephone) {
      el.phone.textContent = team.telephone;
      el.phone.parentElement.classList.remove("hidden");
    } else {
      el.phone.parentElement.classList.add("hidden");
    }

    el.registeredAt.textContent = team.registered_at
      ? formatDate(team.registered_at)
      : "N/A";
    el.points.textContent = team.total_points ?? 0;

    const wins = team.wins ?? 0;
    const losses = team.losses ?? 0;
    const draws = team.draws ?? 0;
    el.record.textContent = `${wins} Wins, ${losses} Losses, ${draws} Draws`;

    if (Array.isArray(team.members) && team.members.length > 0) {
      el.memberList.innerHTML = team.members
        .map((m) => `<li>${m.name}</li>`)
        .join("");
    } else {
      el.memberList.innerHTML = `<li>No members found.</li>`;
    }

    el.loading.classList.add("hidden");
    el.content.classList.remove("hidden");
  } catch (err) {
    console.error("Failed to load team:", err);
    el.loading.classList.add("hidden");
    el.error.textContent = "Team not found.";
    el.error.classList.remove("hidden");
  }
}

if (document.getElementById("teamDetailsSection")) {
  window.addEventListener("DOMContentLoaded", loadTeamDetails);
}

// ===== Boot =====
window.addEventListener("DOMContentLoaded", () => {
  loadMatches();
  loadLeaderboard();
});
