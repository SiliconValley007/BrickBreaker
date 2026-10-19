export function paintSphere(c, fire, cb) {
  var g = c.getContext && c.getContext("2d");
  if (!g) return;
  var s = c.width,
    m = s * 0.5,
    R = m * 0.78;
  g.clearRect(0, 0, s, s);
  g.save();
  g.beginPath();
  g.arc(m, m, R, 0, 6.283);
  g.clip();
  var core = fire ? (cb ? "#e69f00" : "#ff7a18") : cb ? "#56b4e9" : "#00d8ff";
  var mid = fire ? (cb ? "#d55e00" : "#ff4a00") : cb ? "#0072b2" : "#0a6aa8";
  var rim = fire ? "#3a1200" : "#031018";
  var body = g.createRadialGradient(
    m - R * 0.28,
    m - R * 0.34,
    R * 0.08,
    m + R * 0.12,
    m + R * 0.18,
    R,
  );
  body.addColorStop(0, fire ? "#fff6d0" : "#f4ffff");
  body.addColorStop(0.18, core);
  body.addColorStop(0.55, mid);
  body.addColorStop(0.86, rim);
  body.addColorStop(1, "#000");
  g.fillStyle = body;
  g.fillRect(0, 0, s, s);
  var fres = g.createRadialGradient(m, m, R * 0.62, m, m, R);
  fres.addColorStop(0, "rgba(0,0,0,0)");
  fres.addColorStop(0.7, "rgba(0,0,0,0)");
  fres.addColorStop(
    1,
    fire
      ? "rgba(255,180,60,.55)"
      : cb
        ? "rgba(240,228,66,.4)"
        : "rgba(120,240,255,.55)",
  );
  g.fillStyle = fres;
  g.fillRect(0, 0, s, s);
  var spec = g.createRadialGradient(
    m - R * 0.32,
    m - R * 0.38,
    0,
    m - R * 0.32,
    m - R * 0.38,
    R * 0.42,
  );
  spec.addColorStop(0, "rgba(255,255,255,.95)");
  spec.addColorStop(
    0.35,
    fire ? "rgba(255,230,160,.45)" : "rgba(200,255,255,.4)",
  );
  spec.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = spec;
  g.fillRect(0, 0, s, s);
  g.restore();
}
export function paintHalo(c, fire, cb) {
  var g = c.getContext && c.getContext("2d");
  if (!g) return;
  var s = c.width,
    m = s * 0.5;
  g.clearRect(0, 0, s, s);
  var tight = g.createRadialGradient(m, m, 0, m, m, m);
  tight.addColorStop(
    0,
    fire
      ? "rgba(255,200,80,.55)"
      : cb
        ? "rgba(86,180,233,.5)"
        : "rgba(80,245,255,.5)",
  );
  tight.addColorStop(
    0.22,
    fire ? "rgba(255,120,20,.22)" : "rgba(0,180,255,.18)",
  );
  tight.addColorStop(
    0.55,
    fire ? "rgba(255,80,0,.06)" : "rgba(0,120,180,.06)",
  );
  tight.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = tight;
  g.fillRect(0, 0, s, s);
}
