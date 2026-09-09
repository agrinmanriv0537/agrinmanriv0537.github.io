(() => {
      const canvas = document.getElementById('ascii-field');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      if (!canvas || reduceMotion || !finePointer) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const denseGlyphs = ['#', '%', '@', '&'];
      const mediumGlyphs = ['+', '*', '=', 'x'];
      const lightGlyphs = ['.', ':', '·', '`'];
      const cells = [];
      const pointer = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, speed: 0, active: false };
      const spacing = 20;
      const radius = 132;
      let width = 0;
      let height = 0;
      let dpr = 1;
      let lastTime = performance.now();

      function seededIndex(x, y, length, offset = 0) {
        const value = Math.abs(Math.sin((x + 17) * 12.9898 + (y + 31) * 78.233 + offset) * 43758.5453);
        return Math.floor((value % 1) * length);
      }

      function buildGrid() {
        cells.length = 0;
        const columns = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const x = column * spacing + (row % 2) * spacing * 0.5;
            const y = row * spacing;
            cells.push({
              x,
              y,
              energy: 0,
              dense: denseGlyphs[seededIndex(column, row, denseGlyphs.length)],
              medium: mediumGlyphs[seededIndex(column, row, mediumGlyphs.length, 11)],
              light: lightGlyphs[seededIndex(column, row, lightGlyphs.length, 23)]
            });
          }
        }
      }

      function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildGrid();
      }

      function handleMove(event) {
        const dx = pointer.active ? event.clientX - pointer.lastX : 0;
        const dy = pointer.active ? event.clientY - pointer.lastY : 0;
        pointer.speed = Math.min(28, Math.hypot(dx, dy));
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;
        pointer.active = true;

        const movementBoost = 0.68 + Math.min(1, pointer.speed / 18) * 0.32;
        for (const cell of cells) {
          const distance = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
          if (distance < radius) {
            const proximity = 1 - distance / radius;
            cell.energy = Math.max(cell.energy, proximity * movementBoost);
          }
        }
      }

      function draw(now) {
        const delta = Math.min(40, now - lastTime);
        lastTime = now;
        ctx.clearRect(0, 0, width, height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const cell of cells) {
          cell.energy = Math.max(0, cell.energy - delta * 0.00062);
          if (cell.energy < 0.015) continue;

          let glyph;
          let size;
          let alpha;

          if (cell.energy > 0.66) {
            glyph = cell.dense;
            size = 12;
            alpha = 0.14 + cell.energy * 0.22;
          } else if (cell.energy > 0.28) {
            glyph = cell.medium;
            size = 10;
            alpha = 0.075 + cell.energy * 0.16;
          } else {
            glyph = cell.light;
            size = 8;
            alpha = 0.028 + cell.energy * 0.13;
          }

          ctx.font = `${size}px ${getComputedStyle(document.documentElement).getPropertyValue('--mono') || 'monospace'}`;
          ctx.fillStyle = `rgba(249, 146, 82, ${alpha})`;
          ctx.fillText(glyph, cell.x, cell.y);
        }

        pointer.speed *= 0.86;
        requestAnimationFrame(draw);
      }

      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', handleMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => {
        pointer.active = false;
        pointer.x = -1000;
        pointer.y = -1000;
      });

      resize();
      requestAnimationFrame(draw);
    })();