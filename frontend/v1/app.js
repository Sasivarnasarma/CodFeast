// Mobile menu toggle
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if(menuBtn){
  menuBtn.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? 'none' : 'flex';
  });
}

// Fake live ticker data
const matches = [
  {a:'GRN', b:'NVX', score:'7-6', status:'Map 1 • Crash'},
  {a:'SND', b:'REZ', score:'3-1', status:'Map 2 • Crossfire'},
  {a:'VTX', b:'BLK', score:'0-0', status:'Warmup • Strike'},
  {a:'ALP', b:'RAV', score:'2-3', status:'Map 3 • Backlot'},
  {a:'FOX', b:'KNG', score:'12-10', status:'FT • District'}
];

const ticker = document.getElementById('ticker');
if(ticker){
  const render = () => {
    ticker.innerHTML = '';
    matches.forEach(m => {
      const el = document.createElement('div');
      el.className = 'tick';
      el.innerHTML = `
        <div class="teams">
          <span class="team">${m.a}</span>
          <span class="sep">vs</span>
          <span class="team">${m.b}</span>
        </div>
        <div class="score">${m.score}</div>
        <div class="status">${m.status}</div>
      `;
      ticker.appendChild(el);
    });
  };
  render();
}

// Simple countdown to next match (today 21:00 local)
(function(){
  const el = document.getElementById('countdown');
  if(!el) return;
  function targetTime(){
    const t = new Date();
    t.setHours(21,0,0,0); // 9 PM local today
    if (t < new Date()) t.setDate(t.getDate()+1);
    return t;
  }
  function update(){
    const now = new Date();
    const diff = targetTime() - now;
    const h = String(Math.floor(diff/3.6e6)).padStart(2,'0');
    const m = String(Math.floor((diff%3.6e6)/6e4)).padStart(2,'0');
    const s = String(Math.floor((diff%6e4)/1e3)).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update,1000);
})();

// Unique id generator
function genId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'team_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const form = document.getElementById('teamRegisterForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('teamName').value.trim();
    const telephone = document.getElementById('teamPhone').value.trim();
    const membersInputs = Array.from(document.querySelectorAll('.member-name'));
    const members = membersInputs.map(i => ({ name: i.value.trim() }));

    // require exactly 5 non-empty names
    if (members.some(m => !m.name) || members.length !== 5) {
      alert('Please enter all 5 member names.');
      return;
    }

    const payload = { id: genId(), name, telephone, members };

    try {
      const res = await fetch('http://127.0.0.1:8080/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      // optional: read response
      // const data = await res.json();
      alert(`Team registered!\nID: ${payload.id}`);
      form.reset();
    } catch (err) {
      console.error(err);
      alert('Registration failed: ' + err.message);
    }
  });
}
