import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    SphereGeometry,
    MeshBasicMaterial,
    Color,
    Mesh,
    Group,
    InstancedMesh,
    Matrix4,
    Raycaster,
    Vector2,
    LineSegments,
    BufferGeometry,
    Float32BufferAttribute,
    LineBasicMaterial,
} from "three";

/* ------------------------------------------------------------------ *
 * Precomputed land data.
 *
 * scripts/build-globe-data.mjs bakes the Natural Earth land mask into
 * public/globe/land.bin (dot grid + coastline rings, int16 lat/lng).
 * The browser therefore never downloads the ~2.7MB GeoJSON nor
 * rasterizes / triangulates it on the main thread.
 * ------------------------------------------------------------------ */

interface LandData {
    dots: Int16Array; // pairs of lat*100, lng*100
    rings: Int16Array[]; // per ring: pairs of lat*100, lng*100 (closed)
}

function parseLand(buffer: ArrayBuffer): LandData {
    const view = new DataView(buffer);
    let o = 0;
    const dotCount = view.getUint32(o, true);
    o += 4;
    const dots = new Int16Array(buffer, o, dotCount * 2);
    o += dotCount * 4;
    const ringCount = view.getUint32(o, true);
    o += 4;
    const rings: Int16Array[] = [];
    for (let i = 0; i < ringCount; i++) {
        const n = view.getUint32(o, true);
        o += 4;
        rings.push(new Int16Array(buffer, o, n * 2));
        o += n * 4;
    }
    return { dots, rings };
}

let landCache: Promise<LandData> | null = null;
function loadLand(): Promise<LandData> {
    if (!landCache) {
        landCache = fetch("/globe/land.bin")
            .then((r) => {
                if (!r.ok) throw new Error(`land.bin ${r.status}`);
                return r.arrayBuffer();
            })
            .then(parseLand);
        landCache.catch(() => {
            landCache = null;
        });
    }
    return landCache;
}

/* ---------------------------- helpers ----------------------------- */

type Rgba = { r: number; g: number; b: number; a: number };

function parseColorToRgba(input: string): Rgba {
    if (!input || input.trim() === "") return { r: 0, g: 0, b: 0, a: 0 };
    const str = input.trim();
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    );
    if (rgbaMatch) {
        return {
            r: Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255,
            g: Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255,
            b: Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255,
            a:
                rgbaMatch[4] !== undefined
                    ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                    : 1,
        };
    }
    const hexMatch = str.match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const hex = hexMatch[1];
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
        };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
}

const mapLinear = (v: number, a: number, b: number, c: number, d: number) =>
    c + ((v - a) / (b - a)) * (d - c);
const mapSpeedUiToInternal = (ui: number) =>
    ui === 0 ? 0 : mapLinear(Math.max(0, Math.min(10, ui)), 0, 10, 0, 0.9);
const mapScaleUiToMultiplier = (ui: number) =>
    mapLinear(Math.max(1, Math.min(20, ui)), 1, 20, 0.2, 2);
const mapDotSizeUiToMultiplier = (ui: number) =>
    mapLinear(Math.max(1, Math.min(10, ui)), 1, 10, 0.1, 0.5);
const mapMarkerSizeUiToMultiplier = (ui: number) =>
    mapLinear(Math.max(0, Math.min(100, ui)), 0, 100, 0.1, 2.5);
const normalizeSmoothing = (ui: number) =>
    Math.max(0, Math.min(1, ui / 10));
const mapDragSpeedUiToSensitivity = (ui: number) =>
    mapLinear(Math.max(0, Math.min(10, ui)), 0, 10, 0.001, 0.02);

function latLngToPosition(lat: number, lng: number) {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    return {
        x: Math.cos(latRad) * Math.sin(lngRad),
        y: Math.sin(latRad),
        z: Math.cos(latRad) * Math.cos(lngRad),
    };
}

export interface GlobeSceneOptions {
    speed: number;
    smoothing: number;
    dotColor: string;
    dotSize: number;
    scale: number;
    stopOnHover: boolean;
    markers: { lat: number; lng: number }[];
    markerColor: string;
    markerSize: number;
    direction: "left" | "right";
    initialLatitude: number;
    initialLongitude: number;
    oceanColor: string;
    outlineColor: string;
    showOutline: boolean;
    dragSpeed: number;
}

export function initGlobe(
    container: HTMLElement,
    o: GlobeSceneOptions,
    onReady: () => void
): () => void {
    const containerWidth =
        container.clientWidth || container.offsetWidth || 800;
    const containerHeight =
        container.clientHeight || container.offsetHeight || 600;

    const scene = new Scene();
    const camera = new PerspectiveCamera(
        50,
        containerWidth / containerHeight,
        0.1,
        1e3
    );
    const scaleMultiplier = mapScaleUiToMultiplier(o.scale);
    const globeRadius = scaleMultiplier;
    const cameraDistance = 2.5 / scaleMultiplier;
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
    });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = "srgb";
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.opacity = "0";
    canvas.style.visibility = "hidden";
    canvas.style.transition = "opacity 450ms ease";
    container.appendChild(canvas);

    const oceanRgba = parseColorToRgba(o.oceanColor);
    const outlineRgba = parseColorToRgba(o.outlineColor);
    const dotRgba = parseColorToRgba(o.dotColor);

    const globeGroup = new Group();
    const initialLongitudeRad = (o.initialLongitude * Math.PI) / 180;
    const initialLatitudeRad = (o.initialLatitude * Math.PI) / 180;
    globeGroup.rotation.y = initialLongitudeRad;
    globeGroup.rotation.x = initialLatitudeRad;
    scene.add(globeGroup);

    const oceanMesh = new Mesh(
        new SphereGeometry(globeRadius, 64, 64),
        new MeshBasicMaterial({
            color: new Color(o.oceanColor),
            transparent: oceanRgba.a < 1,
            opacity: oceanRgba.a,
        })
    );
    globeGroup.add(oceanMesh);

    if (o.markers.length > 0) {
        const markerGeometry = new SphereGeometry(
            0.01 * mapMarkerSizeUiToMultiplier(o.markerSize),
            16,
            16
        );
        for (const marker of o.markers) {
            if (
                !marker ||
                typeof marker.lat !== "number" ||
                typeof marker.lng !== "number"
            )
                continue;
            const pos = latLngToPosition(marker.lat, marker.lng);
            const mesh = new Mesh(
                markerGeometry,
                new MeshBasicMaterial({ color: new Color(o.markerColor) })
            );
            mesh.position.set(
                pos.x * globeRadius,
                pos.y * globeRadius,
                pos.z * globeRadius
            );
            globeGroup.add(mesh);
        }
    }

    /* ---------------- interaction / animation ---------------- */
    const baseRotationSpeed = mapSpeedUiToInternal(o.speed);
    const rotationSpeed =
        o.direction === "left" ? -baseRotationSpeed : baseRotationSpeed;
    const smoothingN = normalizeSmoothing(o.smoothing);
    const lerpFactor =
        smoothingN === 0 ? 1 : mapLinear(smoothingN, 0, 1, 0.4, 0.03);
    const velocityDecay = mapLinear(smoothingN, 0, 1, 0.7, 0.96);
    const rotation = { x: initialLongitudeRad, y: initialLatitudeRad };
    const targetRotation = { x: initialLongitudeRad, y: initialLatitudeRad };
    const velocity = { x: 0, y: 0 };
    let isDragging = false;
    let isHovering = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let animationFrameId: number | null = null;

    const animate = () => {
        let needsRender = false;
        const threshold = 0.01;
        if (!isDragging && rotationSpeed !== 0 && (!o.stopOnHover || !isHovering)) {
            targetRotation.x += rotationSpeed * 0.01;
        }
        if (!isDragging && smoothingN > 0) {
            if (
                Math.abs(velocity.x) > threshold ||
                Math.abs(velocity.y) > threshold
            ) {
                targetRotation.x += velocity.x;
                targetRotation.y += velocity.y;
                targetRotation.y = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, targetRotation.y)
                );
                velocity.x *= velocityDecay;
                velocity.y *= velocityDecay;
            } else {
                velocity.x = 0;
                velocity.y = 0;
            }
        }
        const dx = targetRotation.x - rotation.x;
        const dy = targetRotation.y - rotation.y;
        if (
            Math.abs(dx) > threshold ||
            Math.abs(dy) > threshold ||
            rotationSpeed !== 0 ||
            isDragging
        ) {
            rotation.x += dx * lerpFactor;
            rotation.y += dy * lerpFactor;
            rotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.y));
            needsRender = true;
        }
        if (needsRender || rotationSpeed !== 0 || isDragging) {
            globeGroup.rotation.y = rotation.x;
            globeGroup.rotation.x = rotation.y;
            renderer.render(scene, camera);
        }
        const hasVelocity =
            Math.abs(velocity.x) > threshold || Math.abs(velocity.y) > threshold;
        const hasLerpDelta = Math.abs(dx) > threshold || Math.abs(dy) > threshold;
        if (isDragging || rotationSpeed !== 0 || hasVelocity || hasLerpDelta) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            animationFrameId = null;
        }
    };
    const startAnimation = () => {
        if (animationFrameId === null)
            animationFrameId = requestAnimationFrame(animate);
    };
    if (rotationSpeed !== 0) startAnimation();

    const handleMouseDown = (event: MouseEvent) => {
        isDragging = true;
        velocity.x = 0;
        velocity.y = 0;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        startAnimation();
        const sensitivity = mapDragSpeedUiToSensitivity(o.dragSpeed);
        const handleMouseMoveDrag = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - lastMouseX;
            const dy = moveEvent.clientY - lastMouseY;
            targetRotation.x += dx * sensitivity;
            targetRotation.y += dy * sensitivity;
            targetRotation.y = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, targetRotation.y)
            );
            velocity.x = dx * sensitivity * 0.3;
            velocity.y = dy * sensitivity * 0.3;
            lastMouseX = moveEvent.clientX;
            lastMouseY = moveEvent.clientY;
        };
        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMoveDrag);
            document.removeEventListener("mouseup", handleMouseUp);
            isDragging = false;
        };
        document.addEventListener("mousemove", handleMouseMoveDrag);
        document.addEventListener("mouseup", handleMouseUp);
    };
    canvas.addEventListener("mousedown", handleMouseDown);

    const raycaster = new Raycaster();
    const mouse = new Vector2();
    const handleMouseMove = (event: MouseEvent) => {
        if (!o.stopOnHover) return;
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        isHovering = raycaster.intersectObject(oceanMesh).length > 0;
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    const resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth || container.offsetWidth || 800;
        const h = container.clientHeight || container.offsetHeight || 600;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        camera.position.set(0, 0, 2.5 / scaleMultiplier);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    /* ------------- build land from precomputed binary ------------- */
    let cancelled = false;
    loadLand()
        .then((land) => {
            if (cancelled) return;

            const dotCount = land.dots.length / 2;
            if (dotCount > 0) {
                const instanced = new InstancedMesh(
                    new SphereGeometry(
                        0.01 * mapDotSizeUiToMultiplier(o.dotSize),
                        4,
                        4
                    ),
                    new MeshBasicMaterial({
                        color: new Color(o.dotColor),
                        transparent: dotRgba.a < 1,
                        opacity: dotRgba.a,
                    }),
                    dotCount
                );
                const matrix = new Matrix4();
                for (let i = 0; i < dotCount; i++) {
                    const pos = latLngToPosition(
                        land.dots[i * 2] / 100,
                        land.dots[i * 2 + 1] / 100
                    );
                    matrix.makeScale(1, 1, 1);
                    matrix.setPosition(
                        pos.x * globeRadius,
                        pos.y * globeRadius,
                        pos.z * globeRadius
                    );
                    instanced.setMatrixAt(i, matrix);
                }
                instanced.instanceMatrix.needsUpdate = true;
                globeGroup.add(instanced);
            }

            if (o.showOutline && outlineRgba.a > 0) {
                let segmentPoints = 0;
                for (const ring of land.rings) segmentPoints += ring.length;
                const positions = new Float32Array(segmentPoints * 6);
                let p = 0;
                for (const ring of land.rings) {
                    const n = ring.length / 2;
                    for (let i = 0; i < n; i++) {
                        const a = latLngToPosition(
                            ring[i * 2] / 100,
                            ring[i * 2 + 1] / 100
                        );
                        const j = (i + 1) % n;
                        const b = latLngToPosition(
                            ring[j * 2] / 100,
                            ring[j * 2 + 1] / 100
                        );
                        positions[p++] = a.x * globeRadius;
                        positions[p++] = a.y * globeRadius;
                        positions[p++] = a.z * globeRadius;
                        positions[p++] = b.x * globeRadius;
                        positions[p++] = b.y * globeRadius;
                        positions[p++] = b.z * globeRadius;
                    }
                }
                const geom = new BufferGeometry();
                geom.setAttribute(
                    "position",
                    new Float32BufferAttribute(positions, 3)
                );
                globeGroup.add(
                    new LineSegments(
                        geom,
                        new LineBasicMaterial({
                            color: new Color(o.outlineColor),
                            transparent: outlineRgba.a < 1,
                            opacity: outlineRgba.a,
                        })
                    )
                );
            }

            renderer.render(scene, camera);
            canvas.style.opacity = "1";
            canvas.style.visibility = "visible";
            onReady();
        })
        .catch(() => {
            // Placeholder stays visible; nothing else to do.
        });

    return () => {
        cancelled = true;
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        resizeObserver.disconnect();
        renderer.dispose();
        if (canvas.parentElement === container) container.removeChild(canvas);
    };
}
