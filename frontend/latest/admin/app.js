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

// ===== Helpers =====
async function api(path, opts = {}) {
  const url = API_BASE.replace(/\/$/, "") + path;
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = "";
    try {
      const data = await res.json();
      msg = data.detail || JSON.stringify(data);
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

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return 'None';
}

// ===== Auth Logic =====
async function auth() {
  const keyInput = document.getElementById("secretKeyInput");
  const msgBox = document.getElementById("authMsg");

  if (!keyInput || !msgBox) return;

  const secretKey = keyInput.value.trim();
  if (!secretKey) {
    msgBox.textContent = "Please enter a secret key.";
    msgBox.className = "auth-message error";
    return;
  }

  msgBox.textContent = "Authenticating...";
  msgBox.className = "auth-message";

  try {
    const data = await api(`/auth/${encodeURIComponent(secretKey)}`, {
      method: "GET",
    });

    if (data.ok) {
      document.cookie = `secret_key=${secretKey}; path=/; max-age=${
        60 * 60 * 24 * 7
      };`;
      msgBox.textContent = "Authentication successful!";
      msgBox.className = "auth-message success";
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect") || "./";
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } else {
      msgBox.textContent = "Invalid secret key.";
      msgBox.className = "auth-message error";
    }
  } catch (err) {
    console.error(err);
    msgBox.textContent = "Error contacting server.";
    msgBox.className = "auth-message error";
  }
};

async function initPasswordToggle() {
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("secretKeyInput");

  togglePassword?.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.textContent = type === "password" ? "👁️" : "🙈";
  });
}

if (document.getElementById("authBtn")) {
  document.getElementById("authBtn").addEventListener("click", auth);
  initPasswordToggle();
}

// ===== Teams Admin Logic =====
async function loadTeamsAdmin() {
  const container = document.getElementById("teamsContainer");
  const toast = document.getElementById("teamsError");
  const countEl = document.getElementById("teamCount");
  if (!container) return;

  container.innerHTML =
    '<div class="spinner-container"><div class="spinner"></div></div>';

  try {
    const teams = await api("/teams");
    if (!Array.isArray(teams) || teams.length === 0) {
      container.innerHTML = "<div class='empty'>No teams found.</div>";
      return;
    }
    
    if (countEl) {
      countEl.textContent = `(${teams.length})`;
    }

    container.innerHTML = "";
    let expandedCard = null;

    teams.forEach((team) => {
      const card = document.createElement("div");
      card.className = "team-card";

      const statusClass =
        {
          approved: "status-approved",
          pending: "status-pending",
          rejected: "status-rejected",
        }[team.status.toLowerCase()] || "status-unknown";

      const header = document.createElement("div");
      header.className = "card-header";
      header.innerHTML = `
        <div class="team-name">${team.name}</div>
        <div class="status-pill ${statusClass}">
          ${team.status.charAt(0).toUpperCase() + team.status.slice(1)}
        </div>
      `;
      card.appendChild(header);

      const expanded = document.createElement("div");
      expanded.className = "card-expanded";

      const regDate = team.registered_at
        ? new Date(team.registered_at).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Unknown";

      const detailsInfo = document.createElement("div");
      detailsInfo.className = "details-info";
      detailsInfo.innerHTML = `
        <div class="meta"><strong>Registered At:</strong> ${regDate}</div>
        <div><strong>Telephone:</strong> ${team.telephone}</div>
        <div><strong>Members:</strong><ul>${
          team.members?.map((m) => `<li>${m.name}</li>`).join("") ||
          "<li>None</li>"
        }</ul></div>
      `;

      const actions = document.createElement("div");
      actions.className = "team-actions";
      actions.innerHTML = `
        <select>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="pending">Pending</option>
          <option value="delete">Delete</option>
        </select>
        <button>Take Action</button>
        <button class="details-btn">More Details</button>
      `;

      const select = actions.querySelector("select");
      const actionBtn = actions.querySelector("button");
      const detailsBtn = actions.querySelector(".details-btn");

      actionBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = select.value;
        try {
          const secret = getCookie("secret_key");
          console.log(secret)
          await api(`/teams/${team.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, secret }),
          });
          const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
          showToast(toast, `Action "${capitalizedAction}" applied to ${team.name}`, true);
          loadTeamsAdmin();
        } catch (err) {
          showToast(toast, err.message || "Failed to apply action", false);
        }
      });

      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `../team.html?id=${team.id}`;
      });

      expanded.appendChild(detailsInfo);
      expanded.appendChild(actions);
      card.appendChild(expanded);

      card.addEventListener("click", (e) => {
        if (["SELECT", "OPTION", "BUTTON"].includes(e.target.tagName)) return;

        const allCards = Array.from(container.querySelectorAll(".team-card"));
        const clickedCardTop = card.getBoundingClientRect().top;

        const sameRowCards = allCards.filter((c) => {
          const top = c.getBoundingClientRect().top;
          return Math.abs(top - clickedCardTop) < 5;
        });

        const expanding = !expanded.classList.contains("active");

        allCards.forEach((c) => {
          const exp = c.querySelector(".card-expanded");
          if (exp) exp.classList.remove("active");
        });

        if (expanding) {
          sameRowCards.forEach((c) => {
            const exp = c.querySelector(".card-expanded");
            if (exp) exp.classList.add("active");
          });
        }
      });

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty">Error: ${err.message}</div>`;
  }
}

if (document.getElementById("teamAdminSection")) {
  window.addEventListener("DOMContentLoaded", loadTeamsAdmin);
}
