/*
 * Vela starfield — a lightweight animated canvas backdrop.
 * Parallax star layers drifting toward the viewer, plus the odd shooting star.
 */
(function () {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w, h, dpr, stars, shootingStars;

    const LAYERS = [
        { count: 90, speed: 0.02, size: [0.4, 1.0], alpha: 0.5 },
        { count: 55, speed: 0.05, size: [0.7, 1.6], alpha: 0.75 },
        { count: 25, speed: 0.10, size: [1.0, 2.2], alpha: 1.0 },
    ];
    const TINTS = ["#ffffff", "#cdd7ff", "#a78bff", "#4de0ff", "#ff9ae0"];

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.width = Math.floor(innerWidth * dpr);
        h = canvas.height = Math.floor(innerHeight * dpr);
        canvas.style.width = innerWidth + "px";
        canvas.style.height = innerHeight + "px";
        build();
    }

    function build() {
        stars = [];
        for (const layer of LAYERS) {
            for (let i = 0; i < layer.count; i++) {
                stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: rand(layer.size[0], layer.size[1]) * dpr,
                    a: layer.alpha * rand(0.5, 1),
                    tw: rand(0, Math.PI * 2),
                    twSpeed: rand(0.008, 0.03),
                    vx: -layer.speed * dpr,
                    color: TINTS[(Math.random() * TINTS.length) | 0],
                });
            }
        }
        shootingStars = [];
    }

    function spawnShooting() {
        const y = rand(0, h * 0.5);
        shootingStars.push({
            x: rand(w * 0.3, w),
            y,
            len: rand(120, 260) * dpr,
            vx: -rand(6, 11) * dpr,
            vy: rand(2, 4) * dpr,
            life: 1,
        });
    }

    function tick() {
        ctx.clearRect(0, 0, w, h);

        for (const s of stars) {
            s.x += s.vx;
            if (s.x < -2) s.x = w + 2;
            s.tw += s.twSpeed;
            const twinkle = 0.6 + 0.4 * Math.sin(s.tw);
            ctx.globalAlpha = s.a * twinkle;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const m = shootingStars[i];
            m.x += m.vx;
            m.y += m.vy;
            m.life -= 0.012;
            if (m.life <= 0 || m.x < -m.len) { shootingStars.splice(i, 1); continue; }
            const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 6, m.y - m.vy * 6);
            grad.addColorStop(0, `rgba(255,255,255,${m.life})`);
            grad.addColorStop(1, "rgba(139,123,255,0)");
            ctx.globalAlpha = 1;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.6 * dpr;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        if (Math.random() < 0.004) spawnShooting();
        requestAnimationFrame(tick);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    addEventListener("resize", resize);
    resize();
    if (reduce) {
        // Draw one static frame, no animation.
        for (const s of stars) {
            ctx.globalAlpha = s.a;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        requestAnimationFrame(tick);
    }
})();
