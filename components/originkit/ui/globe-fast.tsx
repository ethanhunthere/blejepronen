"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { GlobeSceneOptions } from "./globe-fast-scene";

interface Marker {
    lat: number;
    lng: number;
}
interface GlobeProps {
    speed?: number;
    smoothing?: number;
    dots?: { color?: string; size?: number; density?: number };
    scale?: number;
    stopOnHover?: boolean;
    markerConfig?: { markers?: Marker[]; color?: string; size?: number };
    direction?: "left" | "right";
    initialLatitude?: number;
    initialLongitude?: number;
    oceanColor?: string;
    outlineColor?: string;
    showOutline?: boolean;
    dragSpeed?: number;
    style?: CSSProperties;
}

export default function Globe({
    speed = 2,
    smoothing = 8,
    dots = { color: "#77CC7D", size: 10, density: 7 },
    scale = 8,
    stopOnHover = true,
    markerConfig = {
        size: 40,
        color: "#FB1466",
        markers: [
            { lat: 41, lng: 13 },
            { lat: -47, lng: -80 },
            { lat: 73, lng: -98 },
        ],
    },
    direction = "left",
    initialLatitude = 23,
    initialLongitude = -23,
    oceanColor = "#00000012",
    outlineColor = "#77CC7D",
    showOutline = true,
    dragSpeed = 5,
    style,
}: GlobeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    // SSR defaults to true so the desktop placeholder paints at first paint;
    // on client we drop out (and never load three.js) below 1024px.
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        const update = () => setEnabled(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) return;
        let cleanup: (() => void) | undefined;
        let cancelled = false;
        const options: GlobeSceneOptions = {
            speed,
            smoothing,
            dotColor: dots.color || "#77CC7D",
            dotSize: dots.size ?? 10,
            scale,
            stopOnHover,
            markers: markerConfig.markers || [],
            markerColor: markerConfig.color || "#FB1466",
            markerSize: markerConfig.size ?? 40,
            direction,
            initialLatitude,
            initialLongitude,
            oceanColor,
            outlineColor,
            showOutline,
            dragSpeed,
        };
        // three.js + scene live in a separate chunk so they never delay
        // hydration (and therefore interactivity) of the auth card.
        import("./globe-fast-scene").then(({ initGlobe }) => {
            if (cancelled) return;
            cleanup = initGlobe(container, options, () => setReady(true));
        });
        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [
        enabled,
        speed,
        smoothing,
        dots.color,
        dots.size,
        scale,
        stopOnHover,
        markerConfig,
        direction,
        initialLatitude,
        initialLongitude,
        oceanColor,
        outlineColor,
        showOutline,
        dragSpeed,
    ]);

    const containerStyle: CSSProperties = {
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    return (
        <div ref={containerRef} style={containerStyle}>
            {/* Instant silhouette: paints with the SSR'd HTML at first paint so
                the globe occupies its space immediately, then cross-fades to
                the live WebGL globe once the scene chunk + land data resolve. */}
            <div
                aria-hidden
                className="hidden lg:flex"
                style={{
                    position: "absolute",
                    inset: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: ready ? 0 : 1,
                    transition: "opacity 450ms ease",
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        height: "64%",
                        aspectRatio: "1 / 1",
                        borderRadius: "50%",
                        backgroundImage:
                            "radial-gradient(rgba(119,204,125,0.5) 1px, transparent 1.4px)",
                        backgroundSize: "7px 7px",
                        WebkitMaskImage:
                            "radial-gradient(circle at 38% 32%, #000 52%, transparent 72%)",
                        maskImage:
                            "radial-gradient(circle at 38% 32%, #000 52%, transparent 72%)",
                    }}
                />
            </div>
        </div>
    );
}
