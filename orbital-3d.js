/* Real WebGL orbital scene. The CSS/PDF assets remain available as a fallback.
   Bodies are meshes; the sole approved customer star remains a single sprite. */
(function () {
  "use strict";

  let active = null;

  function makeGlowTexture(THREE, inner, outer) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(128, 128, 2, 128, 128, 126);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.18, outer);
    gradient.addColorStop(0.58, outer.replace(")", ",.24)").replace("rgb", "rgba"));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeEarthTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
    ocean.addColorStop(0, "#0a3268");
    ocean.addColorStop(.28, "#1676af");
    ocean.addColorStop(.72, "#0d527d");
    ocean.addColorStop(1, "#061c46");
    context.fillStyle = ocean;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const continents = [
      [115,112,90,46,-.25],[210,163,74,103,.38],[342,110,92,55,.14],[445,212,93,69,-.22],
      [586,125,105,53,.18],[708,172,125,86,-.16],[874,121,103,51,.28],[943,251,65,100,-.2],
      [33,298,92,43,.1],[518,346,127,48,-.1],[773,361,122,46,.18]
    ];
    continents.forEach(([x, y, w, h, rotation], i) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      const land = context.createRadialGradient(-w * .18, -h * .22, 2, 0, 0, w);
      land.addColorStop(0, i % 3 === 0 ? "#b5ca63" : "#64aa5f");
      land.addColorStop(.65, "#347c55");
      land.addColorStop(1, "#195543");
      context.fillStyle = land;
      context.beginPath();
      context.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
    context.strokeStyle = "rgba(232,250,255,.35)";
    context.lineWidth = 7;
    for (let i = 0; i < 15; i += 1) {
      const y = 32 + ((i * 61) % 440);
      context.beginPath();
      context.moveTo(-20, y);
      context.bezierCurveTo(250, y - 45, 540, y + 58, 1040, y - 12);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function makeMaterial(THREE, color, options) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color,
      roughness: .48,
      metalness: .18
    }, options || {}));
  }

  function createStar(THREE) {
    const group = new THREE.Group();
    const familiarStarTexture = new THREE.TextureLoader().load("assets/estrella-realista.png");
    familiarStarTexture.colorSpace = THREE.SRGBColorSpace;
    const familiarStar = new THREE.Sprite(new THREE.SpriteMaterial({
      map: familiarStarTexture,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false
    }));
    familiarStar.scale.set(4.15, 4.15, 1);
    familiarStar.renderOrder = 20;
    group.add(familiarStar);
    group.renderOrder = 20;
    return group;
  }

  function createRocket(THREE) {
    const group = new THREE.Group();
    const shell = makeMaterial(THREE, 0xe8f5ff, { metalness: .72, roughness: .2 });
    const red = makeMaterial(THREE, 0xff6c45, { emissive: 0x712112, emissiveIntensity: .8, metalness: .42 });
    const dark = makeMaterial(THREE, 0x142849, { metalness: .8, roughness: .23 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 1.1, 24), shell);
    group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.18, .42, 24), red);
    nose.position.y = .76;
    group.add(nose);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(.292, .292, .12, 24), red);
    collar.position.y = -.28;
    group.add(collar);
    for (let i = 0; i < 3; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(.13, .37, .39), red);
      fin.position.set(Math.sin(i * 2.095) * .27, -.48, Math.cos(i * 2.095) * .27);
      fin.rotation.y = i * 2.095;
      group.add(fin);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.16, .54, 20), new THREE.MeshBasicMaterial({ color: 0xffd15a, transparent: true, opacity: .88 }));
    flame.position.y = -.82;
    flame.rotation.x = Math.PI;
    group.add(flame);
    const windowMesh = new THREE.Mesh(new THREE.SphereGeometry(.105, 18, 18), dark);
    windowMesh.position.set(0, .22, .17);
    group.add(windowMesh);
    group.rotation.z = -.58;
    return group;
  }

  function createSaturn(THREE) {
    const group = new THREE.Group();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(.72, 42, 42),
      makeMaterial(THREE, 0xd38b48, { roughness: .62, metalness: .04 })
    );
    group.add(planet);
    [
      [.82, .042, 0xf7d38d],
      [1.08, .036, 0xd99455],
      [1.36, .028, 0xf0bc6e]
    ].forEach(([radius, tube, color]) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 12, 72),
        makeMaterial(THREE, color, { emissive: color, emissiveIntensity: .16, roughness: .36, metalness: .34 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    });
    group.userData.spin = planet;
    return group;
  }

  function createConstellation(THREE) {
    const group = new THREE.Group();
    const points = [
      [-.72, .22, .08], [-.34, .58, -.1], [.16, .34, .12], [.64, .62, -.04],
      [.7, -.18, .1], [.12, -.5, -.08], [-.48, -.34, .04]
    ];
    const starMaterial = makeMaterial(THREE, 0xf5ddff, { emissive: 0xb843ff, emissiveIntensity: 2.1, roughness: .12, metalness: .04 });
    points.forEach(([x, y, z], index) => {
      const star = new THREE.Mesh(new THREE.SphereGeometry(index % 3 === 0 ? .105 : .072, 16, 16), starMaterial.clone());
      star.position.set(x, y, z);
      group.add(star);
    });
    const links = [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [6, 0]];
    const linePoints = [];
    links.forEach(([from, to]) => {
      linePoints.push(new THREE.Vector3(...points[from]), new THREE.Vector3(...points[to]));
    });
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(linePoints),
      new THREE.LineBasicMaterial({ color: 0xc77bff, transparent: false })
    );
    group.add(lines);
    group.userData.spin = group;
    return group;
  }

  function createSatellite(THREE) {
    const group = new THREE.Group();
    const metal = makeMaterial(THREE, 0xc9d8e8, { metalness: .84, roughness: .22 });
    const blue = makeMaterial(THREE, 0x175da8, { emissive: 0x0b387e, emissiveIntensity: .58, metalness: .72, roughness: .16 });
    const bus = new THREE.Mesh(new THREE.BoxGeometry(.48, .39, .46), metal);
    group.add(bus);
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.82, .055, .36), blue);
      arm.position.x = side * .68;
      group.add(arm);
      const panelLines = new THREE.Mesh(new THREE.BoxGeometry(.02, .07, .39), metal);
      panelLines.position.x = side * .68;
      group.add(panelLines);
    });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .48, 12), metal);
    mast.position.y = .38;
    group.add(mast);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(.24, .15, 28, 1, true), metal);
    dish.position.y = .65;
    dish.rotation.x = Math.PI;
    group.add(dish);
    const signal = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(THREE, "rgba(255,255,255,1)", "rgb(61,177,255)"),
      transparent: true,
      opacity: .68,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    signal.position.y = .66;
    signal.scale.set(1.45, 1.45, 1);
    group.add(signal);
    group.userData.spin = group;
    return group;
  }

  function createObservatory(THREE) {
    const group = new THREE.Group();
    const metal = makeMaterial(THREE, 0xd0dfec, { metalness: .88, roughness: .18 });
    const navy = makeMaterial(THREE, 0x123963, { metalness: .66, roughness: .26 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.21, .28, 1.2, 20), metal);
    body.rotation.z = Math.PI / 2;
    group.add(body);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 24), new THREE.MeshStandardMaterial({ color: 0x69ddff, emissive: 0x17668f, emissiveIntensity: 1.3, roughness: .08, metalness: .3 }));
    lens.position.x = .62;
    group.add(lens);
    [-1, 1].forEach((side) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(.76, .04, .35), navy);
      panel.position.set(side * .18, side * .48, 0);
      panel.rotation.z = side * .16;
      group.add(panel);
    });
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(.12, .17, .48, 16), metal);
    mount.position.y = -.42;
    group.add(mount);
    const lensGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(THREE, "rgba(255,255,255,1)", "rgb(121,227,255)"),
      transparent: true,
      opacity: .7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    lensGlow.position.x = .63;
    lensGlow.scale.set(1.35, 1.35, 1);
    group.add(lensGlow);
    group.rotation.z = .27;
    group.userData.spin = group;
    return group;
  }

  function createEarth(THREE) {
    const group = new THREE.Group();
    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(.8, 48, 48),
      makeMaterial(THREE, 0xffffff, { map: makeEarthTexture(THREE), roughness: .66, metalness: .02 })
    );
    group.add(surface);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(.835, 42, 42),
      new THREE.MeshBasicMaterial({ color: 0x9eefff, transparent: true, opacity: .16, side: THREE.BackSide })
    );
    group.add(atmosphere);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(THREE, "rgba(255,255,255,1)", "rgb(56,177,255)"), transparent: true, opacity: .64, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(2.5, 2.5, 1);
    group.add(glow);
    group.userData.spin = surface;
    return group;
  }

  function makeOrbitLine(THREE, radius, depth, color) {
    const group = new THREE.Group();
    const makeArc = (from, to, lineColor, renderOrder) => {
      const points = [];
      for (let index = 0; index <= 84; index += 1) {
        const angle = from + (to - from) * index / 84;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * depth));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: lineColor, transparent: false, depthWrite: true })
      );
      line.renderOrder = renderOrder;
      group.add(line);
    };
    // Camera-facing half: root rotation naturally sends this section beneath the centre.
    makeArc(0, Math.PI, color, 2);
    // Back half: solid but darker, so it recedes without using transparent objects.
    makeArc(Math.PI, Math.PI * 2, 0x263452, 0);
    return group;
  }

  function makeOrbitNode(THREE, config) {
    const root = new THREE.Group();
    root.rotation.set(config.tilt, config.yaw, config.roll);
    const runner = new THREE.Group();
    const anchor = new THREE.Group();
    anchor.position.x = config.radius;
    runner.rotation.y = config.phase;
    runner.add(anchor);
    root.add(makeOrbitLine(THREE, config.radius, config.depth, config.color), runner);
    return { root, runner, anchor };
  }

  function disposeObject(root) {
    root.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
      materials.forEach((material) => {
        ["map", "alphaMap", "emissiveMap"].forEach((key) => material[key] && material[key].dispose());
        material.dispose();
      });
    });
  }

  function stateText(index, progress, central) {
    const state = index < progress ? "COMPLETADO" : index === progress ? "SIGUIENTE SEÑAL" : `MOMENTO ${index + 1}`;
    return central ? `LAS ESTRELLAS · ${state}` : state;
  }

  function addLabel(overlay, entry, progress) {
    const label = document.createElement("button");
    label.type = "button";
    label.className = `three-space-label${entry.central ? " three-space-label-core" : ""}`;
    label.disabled = !entry.available;
    label.style.setProperty("--label-offset", `${entry.labelOffset || 24}px`);
    const small = document.createElement("small");
    small.textContent = stateText(entry.index, progress, entry.central);
    const title = document.createElement("b");
    title.textContent = entry.title;
    label.append(small, title);
    label.addEventListener("click", () => entry.available && window.goStep && window.goStep(entry.step));
    overlay.appendChild(label);
    entry.label = label;
  }

  function setAvailability(root, available) {
    root.traverse((node) => {
      if (!node.material) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (material.userData.originalOpacity === undefined) material.userData.originalOpacity = material.opacity === undefined ? 1 : material.opacity;
        if (material.userData.originalEmissive === undefined && material.emissive) material.userData.originalEmissive = material.emissiveIntensity || 0;
        const originalOpacity = material.userData.originalOpacity;
        material.transparent = originalOpacity < .99;
        material.opacity = originalOpacity;
        if (material.emissive) material.emissiveIntensity = material.userData.originalEmissive;
      });
    });
    root.scale.setScalar(1);
  }

  function findRecordFromHit(hit, records) {
    if (!hit) return null;
    return records.find((record) => {
      let node = hit.object;
      while (node) {
        if (node === record.anchor) return true;
        node = node.parent;
      }
      return false;
    }) || null;
  }

  window.destroyClientOrbitalScene = function () {
    if (!active) return;
    active.cancelAnimationFrame && cancelAnimationFrame(active.cancelAnimationFrame);
    active.resizeObserver && active.resizeObserver.disconnect();
    active.canvas && active.canvas.removeEventListener("pointermove", active.onMove);
    active.canvas && active.canvas.removeEventListener("pointerleave", active.onLeave);
    active.canvas && active.canvas.removeEventListener("click", active.onClick);
    active.scene && disposeObject(active.scene);
    active.renderer && active.renderer.dispose();
    active.renderer && active.renderer.forceContextLoss && active.renderer.forceContextLoss();
    active.host && active.host.remove();
    active.labels && active.labels.remove();
    active.realm && active.realm.classList.remove("webgl-ready");
    active = null;
  };

  window.initClientOrbitalScene = function (progress) {
    const THREE = window.THREE;
    const realm = document.querySelector(".orbital-realm");
    if (!THREE || !realm || active) return;
    const size = realm.getBoundingClientRect();
    if (size.width < 10 || size.height < 10) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch (_) {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    const host = document.createElement("div");
    host.className = "three-orbital-host";
    const labels = document.createElement("div");
    labels.className = "three-orbital-labels";
    host.appendChild(renderer.domElement);
    realm.append(host, labels);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    const system = new THREE.Group();
    scene.add(system);
    scene.add(new THREE.HemisphereLight(0xa7e8ff, 0x11152f, 1.45));
    const customerLight = new THREE.PointLight(0x9cddff, 5.3, 28, 2);
    customerLight.position.set(0, 0, 2);
    scene.add(customerLight);
    const violetLight = new THREE.PointLight(0xa355ff, 2.1, 22, 2);
    violetLight.position.set(-6, 2, 6);
    scene.add(violetLight);
    const keyLight = new THREE.DirectionalLight(0xf2fbff, 3.1);
    keyLight.position.set(5, 7, 10);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9d72ff, 1.35);
    rimLight.position.set(-7, 2, -5);
    scene.add(rimLight);

    const records = [];
    const central = { step: "estrellas", title: "Clientes y usuarios", index: 1, central: true, available: 1 <= progress, labelOffset: 42, baseScale: 1 };
    central.anchor = createStar(THREE);
    central.visual = central.anchor;
    system.add(central.anchor);
    setAvailability(central.anchor, central.available);
    records.push(central);

    const configurations = [
      { step: "lanzamiento", title: "Centro de lanzamiento", index: 0, radius: 11.4, depth: .58, tilt: .52, yaw: -.22, roll: -.15, phase: 4.25, period: 320, spin: .026, color: 0x65dfff, create: createRocket, labelOffset: 28, scale: 1.18 },
      { step: "planetas", title: "Planetas de talento", index: 2, radius: 6.85, depth: .74, tilt: .62, yaw: .12, roll: .14, phase: 2.35, period: 330, spin: .034, color: 0xffba63, create: createSaturn, labelOffset: 32, scale: 1.32 },
      { step: "coordenadas", title: "Roles y competencias", index: 3, parentStep: "planetas", radius: 2.08, depth: .82, tilt: .78, yaw: -.18, roll: -.28, phase: 5.45, period: 190, spin: .018, color: 0xd280ff, create: createConstellation, labelOffset: 30, scale: 1.26 },
      { step: "satelites", title: "Satélites del ecosistema", index: 4, parentStep: "planetas", radius: 3.08, depth: .77, tilt: .72, yaw: .08, roll: .24, phase: .4, period: 220, spin: .018, color: 0x82e7ff, create: createSatellite, labelOffset: 38, scale: 1.55 },
      { step: "observatorio", title: "Observatorio de señales", index: 5, radius: 11.1, depth: .61, tilt: .32, yaw: -.2, roll: -.1, phase: 3.35, period: 370, spin: .022, color: 0xc6ef7d, create: createObservatory, labelOffset: 39, scale: 1.58 },
      { step: "mision", title: "Misión en la Tierra", index: 6, radius: 8.9, depth: .68, tilt: .55, yaw: .15, roll: .08, phase: 1.22, period: 345, spin: .03, color: 0x69ceff, create: createEarth, labelOffset: 33, scale: 1.55 }
    ];

    configurations.forEach((config) => {
      const parentRecord = config.parentStep && records.find((record) => record.step === config.parentStep);
      const orbit = makeOrbitNode(THREE, config);
      (parentRecord ? parentRecord.anchor : system).add(orbit.root);
      const anchor = orbit.anchor;
      const visual = config.create(THREE);
      visual.scale.setScalar(config.scale);
      anchor.add(visual);
      const record = Object.assign(config, { plane: orbit.root, runner: orbit.runner, anchor, visual, available: config.index <= progress, baseScale: config.scale });
      setAvailability(anchor, record.available);
      records.push(record);
    });

    records.forEach((entry) => addLabel(labels, entry, progress));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const worldPoint = new THREE.Vector3();
    let hover = null;

    function setHover(next) {
      if (hover === next) return;
      if (hover && hover.visual) hover.visual.scale.setScalar(hover.baseScale || 1);
      hover = next;
      if (hover && hover.available && hover.visual) hover.visual.scale.setScalar((hover.baseScale || 1) * 1.1);
      renderer.domElement.style.cursor = hover && hover.available ? "pointer" : "default";
    }

    function pick(event) {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(system.children, true);
      return hits.map((hit) => findRecordFromHit(hit, records)).find(Boolean) || null;
    }

    const onMove = (event) => setHover(pick(event));
    const onLeave = () => setHover(null);
    const onClick = (event) => {
      const hit = pick(event);
      if (hit && hit.available && window.goStep) window.goStep(hit.step);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);

    function resize() {
      const bounds = realm.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      const compact = camera.aspect < .78;
      camera.fov = compact ? 34 : 35;
      camera.position.set(0, compact ? 7.2 : 5.3, compact ? 24 : 18.3);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      system.scale.setScalar(compact ? .62 : Math.min(1.08, Math.max(.68, camera.aspect / 2.1)));
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(realm);

    const clock = new THREE.Clock();
    function positionLabels(delta) {
      const smoothing = 1 - Math.exp(-delta * 4);
      records.forEach((entry) => {
        entry.anchor.getWorldPosition(worldPoint);
        worldPoint.project(camera);
        const targetX = (worldPoint.x * .5 + .5) * renderer.domElement.clientWidth;
        const targetY = (-worldPoint.y * .5 + .5) * renderer.domElement.clientHeight;
        entry.screenX = Number.isFinite(entry.screenX) ? entry.screenX + (targetX - entry.screenX) * smoothing : targetX;
        entry.screenY = Number.isFinite(entry.screenY) ? entry.screenY + (targetY - entry.screenY) * smoothing : targetY;
        entry.label.style.setProperty("--label-x", `${entry.screenX}px`);
        entry.label.style.setProperty("--label-y", `${entry.screenY}px`);
      });
    }

    function animate() {
      if (!realm.isConnected) return window.destroyClientOrbitalScene();
      const delta = Math.min(clock.getDelta(), .05);
      configurations.forEach((config) => {
        const record = records.find((entry) => entry.step === config.step);
        record.runner.rotation.y += delta * (Math.PI * 2 / config.period);
        const spinTarget = record.visual.userData.spin || record.visual;
        spinTarget.rotation.y += delta * config.spin;
        spinTarget.rotation.z += Math.sin(record.runner.rotation.y * 2.1) * delta * .012;
      });
      scene.updateMatrixWorld();
      positionLabels(delta);
      renderer.render(scene, camera);
      active.cancelAnimationFrame = requestAnimationFrame(animate);
    }

    realm.classList.add("webgl-ready");
    active = { realm, host, labels, scene, renderer, canvas: renderer.domElement, resizeObserver, onMove, onLeave, onClick, cancelAnimationFrame: 0 };
    active.cancelAnimationFrame = requestAnimationFrame(animate);
  };

  window.dispatchEvent(new Event("orbital3d-ready"));
}());
