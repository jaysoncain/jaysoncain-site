/* Simple "coming soon" content wall. Not real security — just hides the site from casual visitors.
   Passcode: change WALL_CODE below. To go public: set WALL_ON = false, or delete this file and its <script> tag. */
(function () {
  var WALL_ON = true;
  var WALL_CODE = 'jayson';
  if (!WALL_ON) return;
  try { if (localStorage.getItem('jcWall') === WALL_CODE) return; } catch (e) {}
  var m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m);
  var st = document.createElement('style');
  st.textContent = 'html.jc-walled body>*:not(#jc-wall){visibility:hidden!important}html.jc-walled{overflow:hidden}';
  document.head.appendChild(st);
  document.documentElement.classList.add('jc-walled');
  function show() {
    if (document.getElementById('jc-wall')) return;
    var w = document.createElement('div');
    w.id = 'jc-wall';
    w.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:#F6F4EF;display:grid;place-items:center;padding:24px;font-family:"Hanken Grotesk",system-ui,sans-serif;color:#16211C');
    w.innerHTML = '<form style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:14px;text-align:center">' +
      '<span style="margin:0 auto;width:48px;height:48px;border-radius:10px;background:#1E4634;color:#F6F4EF;display:grid;place-items:center;font-weight:700;font-size:18px">JC</span>' +
      '<p style="margin:0;font-size:26px;font-weight:700;letter-spacing:-0.02em">Coming soon</p>' +
      '<p style="margin:0;font-size:15px;color:#4E5852">This site is in preview. Enter the access code to continue.</p>' +
      '<input id="jc-wall-code" type="password" autocomplete="off" placeholder="Access code" style="padding:13px 14px;font:inherit;font-size:16px;border:1px solid #CFC9BC;border-radius:8px;outline:none;text-align:center">' +
      '<button type="submit" style="background:#1E4634;color:#fff;border:0;font:inherit;font-weight:600;font-size:16px;padding:13px;border-radius:8px;cursor:pointer">Enter</button>' +
      '<p id="jc-wall-err" style="margin:0;font-size:14px;color:#9A2B1F;display:none">That code didn\u2019t work.</p>' +
      '<p style="margin:0;font-size:12.5px;color:#5A645E">Jayson Cain \u00b7 NMLS #2270200</p></form>';
    document.body.appendChild(w);
    w.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (document.getElementById('jc-wall-code').value.trim().toLowerCase() === WALL_CODE) {
        try { localStorage.setItem('jcWall', WALL_CODE); } catch (x) {}
        document.documentElement.classList.remove('jc-walled'); w.remove();
      } else { document.getElementById('jc-wall-err').style.display = 'block'; }
    });
    document.getElementById('jc-wall-code').focus();
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
