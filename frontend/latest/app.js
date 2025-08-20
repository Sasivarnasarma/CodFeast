// ===== Config =====
const API_BASE = window.API_BASE || "https://cod-api.sasivarnasarma.eu.org/"; // override by setting localStorage.API_BASE
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
      document.querySelector(".hero-meta").setAttribute("hidden", "");
      // el.textContent = 'Match Started';
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

function showToast(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? "var(--muted)" : "var(--danger)";
  setTimeout(() => {
    el.textContent = "";
  }, 4000);
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
  const toast = document.getElementById("regToast");

  if (!form || !toast) return;

  function showToast(toastEl, message, success = true) {
    toastEl.textContent = message;
    toastEl.className = "toast show " + (success ? "success" : "error");
    setTimeout(() => {
      toastEl.classList.remove("show");
    }, 4000);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const teamName = (document.getElementById("teamName")?.value || "").trim();
    const telephone = (
      document.getElementById("teamPhone")?.value || ""
    ).trim();
    const memberInputs = form.querySelectorAll(".member-name");

    const members = Array.from(memberInputs)
      .map((input) => input.value.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
      }));

    const payload = {
      id:
        "team_" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8),
      name: teamName,
      telephone,
      members,
    };

    if (!payload.name || !payload.telephone || members.length < 5) {
      showToast(toast, "Please fill all fields (5 members required).", false);
      return;
    }

    try {
      await api("/teams/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      showToast(toast, "Team registered successfully.");
      localStorage.setItem("lastTeamName", payload.name);
      form.reset();
    } catch (err) {
      console.error(err);
      showToast(toast, "Registration failed: " + err.message, false);
    }
  });
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
    const matches = await api("/matches", {
      method: "GET",
    });

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

    const teamMap = {};
    await Promise.all(
      Array.from(teamIds).map(async (id) => {
        try {
          const teamData = await api(`/teams/${id}`, {
            method: "GET",
          });
          teamMap[id] = {
            name: teamData.name || id,
            points: teamData.total_points != null ? teamData.total_points : "-",
          };
        } catch (err) {
          console.warn(`Failed to load team ${id}`, err);
          teamMap[id] = {
            name: id,
            points: "-",
          };
        }
      })
    );

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
    const data = await api("/leaderboard", {
      method: "GET",
    });
    const rows = (Array.isArray(data) ? data : data.rankings || []).map(
      (row, i) => {
        const team = row.name || "Unknown";
        const wins = row.wins ?? row.wins ?? 0;
        const losses = row.losses ?? row.losses ?? 0;
        const draws = row.draws ?? row.draws ?? 0;
        const pts = row.total_points ?? row.total_points ?? 0;
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
    tr.innerHTML = `<td colspan="5">Failed to load leaderboard: ${err.message}</td>`;
    tbody.appendChild(tr);
  } finally {
    tableWrap.classList.remove("skeleton");
  }
}
document
  .getElementById("refreshLeaderboard")
  ?.addEventListener("click", loadLeaderboard);

// ===== Boot =====
window.addEventListener("DOMContentLoaded", () => {
  loadMatches();
  loadLeaderboard();
});
