import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function DottedSurface({ className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const separation = 72;
    const amountX = 42;
    const amountY = 46;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050505, 800, 5200);

    const camera = new THREE.PerspectiveCamera(58, 1, 1, 7000);
    camera.position.set(0, 380, 1100);
    camera.lookAt(0, -260, -650);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x050505, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const positions = [];
    for (let x = 0; x < amountX; x += 1) {
      for (let y = 0; y < amountY; y += 1) {
        positions.push(
          x * separation - (amountX * separation) / 2,
          0,
          y * separation - (amountY * separation) / 2,
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 11,
      transparent: true,
      opacity: 0.86,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let count = 0;
    let frameId;

    const animate = () => {
      const positionAttribute = geometry.attributes.position;
      const values = positionAttribute.array;
      let pointIndex = 0;

      for (let x = 0; x < amountX; x += 1) {
        for (let y = 0; y < amountY; y += 1) {
          values[pointIndex * 3 + 1] =
            Math.sin((x + count) * 0.28) * 42 +
            Math.sin((y + count) * 0.42) * 38;
          pointIndex += 1;
        }
      }

      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.035;
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden="true"
    />
  );
}
