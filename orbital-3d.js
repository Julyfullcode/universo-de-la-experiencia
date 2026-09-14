/* Real WebGL orbital scene. The CSS/PDF assets remain available as a fallback,
   but this scene uses only meshes: no PNG planes are used as celestial objects. */
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
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 5),
      makeMaterial(THREE, 0xe9fbff, { emissive: 0x6dcfff, emissiveIntensity: 2.5, roughness: .18, metalness: .03 })
    );
    group.add(core);
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 42, 42),
      new THREE.MeshBasicMaterial({ color: 0x8cd9ff, transparent: true, opacity: .16, side: THREE.BackSide })
    );
    group.add(corona);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(THREE, "rgba(255,255,255,1)", "rgb(93,192,255)"),
      color: 0xc6efff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    glow.scale.set(5.6, 5.6, 1);
    group.add(glow);
    const familiarStarTexture = new THREE.TextureLoader().load("assets/estrella-realista.png");
    familiarStarTexture.colorSpace = THREE.SRGBColorSpace;
    const familiarStar = new THREE.Sprite(new THREE.SpriteMaterial({
      map: familiarStarTexture,
      transparent: true,
      opacity: .86,
      depthWrite: false
    }));
    familiarStar.scale.set(3.9, 3.9, 1);
    familiarStar.position.z = 1.25;
    group.add(familiarStar);
    for (let i = 0; i < 3; i += 1) {
      const companion = new THREE.Mesh(
        new THREE.SphereGeometry(.12 + i * .025, 18, 18),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0xdba5ff : 0xd8fbff })
      );
      companion.position.set(Math.cos(i * 2.1) * 1.55, Math.sin(i * 2.1) * .78, .3 * (i - 1));
      group.add(companion);
    }
    group.userData.spin = core;
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
    const band = new THREE.Mesh(new THREE.TorusGeometry(.76, .042, 12, 64), makeMaterial(THREE, 0xf7c675, { emissive: 0x6d3e17, emissiveIntensity: .24 }));
    band.rotation.x = Math.PI / 2;
    group.add(band);
    const rings = new THREE.Mesh(
      new THREE.RingGeometry(.96, 1.52, 96),
      new THREE.MeshBasicMaterial({ color: 0xe3b473, transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false })
    );
    rings.rotation.x = Math.PI / 2;
    group.add(rings);
    group.userData.spin = planet;
    return group;
  }

  function createBeacon(THREE) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.36, 3),
      makeMaterial(THREE, 0xecc9ff, { emissive: 0xa037ff, emissiveIntensity: 2.3, roughness: .16 })
    );
    group.add(core);
    const material = new THREE.MeshBasicMaterial({ color: 0xc172ff, transparent: true, opacity: .82 });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(.7, .034, 12, 48), material);
    ringA.rotation.x = 1.1;
    group.add(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(.59, .027, 12, 48), material.clone());
    ringB.rotation.y = 1.3;
    group.add(ringB);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(THREE, "rgba(255,255,255,1)", "rgb(181,68,255)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(2.65, 2.65, 1);
    group.add(glow);
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

  function makeOrbitLine(THREE, radius, vertical, depth, color) {
    const points = [];
    for (let index = 0; index < 180; index += 1) {
      const angle = index / 180 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * vertical, Math.sin(angle) * radius * depth));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .34, depthWrite: false });
    return new THREE.LineLoop(geometry, material);
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
        material.transparent = originalOpacity < .99 || !available;
        material.opacity = originalOpacity < .99 ? originalOpacity : available ? 1 : .7;
        if (material.emissive) material.emissiveIntensity = available ? material.userData.originalEmissive : Math.max(material.userData.originalEmissive * .42, .14);
      });
    });
    root.scale.setScalar(available ? 1 : .93);
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
      { step: "lanzamiento", title: "Centro de lanzamiento", index: 0, radius: 4.5, vertical: .255, depth: .3, tilt: .48, yaw: -.12, roll: -.18, phase: 4.25, period: 180, spin: .07, color: 0x65dfff, create: createRocket, labelOffset: 28, scale: 1.05 },
      { step: "planetas", title: "Los planetas", index: 2, radius: 7.7, vertical: .214, depth: .36, tilt: .62, yaw: .12, roll: .14, phase: 2.35, period: 248, spin: .05, color: 0xdd9cff, create: createSaturn, labelOffset: 32, scale: 1.18 },
      { step: "coordenadas", title: "Coordenadas", index: 3, radius: 6.3, vertical: .214, depth: .48, tilt: .38, yaw: -.18, roll: -.28, phase: 5.45, period: 226, spin: .08, color: 0xd280ff, create: createBeacon, labelOffset: 30, scale: 1.13 },
      { step: "satelites", title: "Satélites y constelaciones", index: 4, radius: 8.8, vertical: .21, depth: .42, tilt: .7, yaw: .08, roll: .24, phase: .4, period: 300, spin: .04, color: 0x82e7ff, create: createSatellite, labelOffset: 38, scale: 1.55 },
      { step: "observatorio", title: "Observatorio de señales", index: 5, radius: 8.1, vertical: .158, depth: .36, tilt: .32, yaw: -.2, roll: -.1, phase: 3.35, period: 276, spin: .035, color: 0xc6ef7d, create: createObservatory, labelOffset: 39, scale: 1.48 },
      { step: "mision", title: "Misión en la Tierra", index: 6, radius: 5.6, vertical: .223, depth: .3, tilt: .55, yaw: .15, roll: .08, phase: 1.22, period: 238, spin: .055, color: 0x69ceff, create: createEarth, labelOffset: 33, scale: 1.38 }
    ];

    configurations.forEach((config) => {
      const plane = new THREE.Group();
      plane.rotation.set(config.tilt, config.yaw, config.roll);
      system.add(plane);
      plane.add(makeOrbitLine(THREE, config.radius, config.vertical, config.depth, config.color));
      const anchor = new THREE.Group();
      plane.add(anchor);
      const visual = config.create(THREE);
      visual.scale.setScalar(config.scale);
      anchor.add(visual);
      const record = Object.assign(config, { plane, anchor, visual, angle: config.phase, available: config.index <= progress, baseScale: config.scale });
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
      return findRecordFromHit(raycaster.intersectObjects(system.children, true)[0], records);
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
      camera.position.set(0, compact ? 7.2 : 5.3, compact ? 24 : 19.5);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      system.scale.setScalar(compact ? .7 : 1);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(realm);

    const clock = new THREE.Clock();
    function positionLabels(delta) {
      const smoothing = 1 - Math.exp(-delta * 9);
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
      central.visual.rotation.y += delta * .05;
      central.visual.rotation.z += delta * .012;
      configurations.forEach((config) => {
        const record = records.find((entry) => entry.step === config.step);
        record.angle += delta * (Math.PI * 2 / config.period);
        record.anchor.position.set(
          Math.cos(record.angle) * config.radius,
          Math.sin(record.angle) * config.radius * config.vertical,
          Math.sin(record.angle) * config.radius * config.depth
        );
        const spinTarget = record.visual.userData.spin || record.visual;
        spinTarget.rotation.y += delta * config.spin;
        spinTarget.rotation.z += Math.sin(record.angle * 2.1) * delta * .035;
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
