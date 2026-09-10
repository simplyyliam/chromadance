import { useCallback, useEffect, useRef, type RefObject } from "react";

type GridStage = "entering" | "breathing" | "leaving";

type ExtractionShaderOverlayProps = {
  imageRef: RefObject<HTMLImageElement | null>;
  imageVersion: number;
  stage: GridStage | null;
  width: number;
  height: number;
};

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_stageProgress;
uniform int   u_stage;

const vec3  KLEIN_BLUE = vec3(0.0, 0.18, 0.49);
const float PI = 3.14159265359;

void main() {
  // Aspect-correct coordinates centered at the middle of the image.
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2  uv   = v_uv;
  vec2  p    = (uv - 0.5) * vec2(aspect, 1.0);
  float dist = length(p);

  // ---- stage intensity ----
  float intensity =
      u_stage == 0 ? smoothstep(0.0, 1.0, u_stageProgress) :        // entering
      u_stage == 1 ? 1.0 :                                          // breathing
                     1.0 - smoothstep(0.0, 1.0, u_stageProgress);   // leaving

  vec2 warped = p;

  // ---- 1. PINCH / BULGE: pull content gently toward the center ----
  // No rotation, so nothing ever flips. Strong at center, eases out to edges.
  float pinch = 1.0 - 0.28 * intensity * exp(-dist * 2.5);
  warped *= pinch;

  // ---- 2. RIPPLE ring expanding from center (glass wave) ----
  float ringR  = u_stageProgress * 1.2;
  float ring   = smoothstep(0.08, 0.0, abs(dist - ringR));
  float ripple = ring * 0.03 * intensity;
  warped += normalize(p + 1e-5) * sin((dist - u_time * 0.6) * 40.0) * ripple;

  // ---- 3. gentle breathing lens wobble (still no rotation) ----
  float wobble = 0.015 * intensity * sin(u_time * 1.2) * exp(-dist * 3.0);
  warped += normalize(p + 1e-5) * wobble;

  // Back to texture space.
  vec2 warpedUV = warped / vec2(aspect, 1.0) + 0.5;

  // ---- chromatic split along the radial axis ----
  vec2 ca = normalize(p + 1e-5) * 0.004 * intensity;
  vec3 warpedColor = vec3(
    texture(u_image, warpedUV + ca).r,
    texture(u_image, warpedUV).g,
    texture(u_image, warpedUV - ca).b
  );

  // Guard against sampling outside the image (would read as black).
  vec2  inside = step(vec2(0.0), warpedUV) * step(warpedUV, vec2(1.0));
  float mask   = inside.x * inside.y;
  vec3  base   = texture(u_image, uv).rgb;
  warpedColor  = mix(base, warpedColor, mask);

  // ---- Klein-blue glass tint + ring highlight + center glow ----
  vec3 tinted = mix(warpedColor, KLEIN_BLUE, 0.25 * intensity);
  tinted += vec3(ring * 0.35 * intensity);
  tinted += KLEIN_BLUE * exp(-dist * 4.0) * 0.3 * intensity;

  vec3 finalColor = mix(base, tinted, intensity);

  fragColor = vec4(finalColor, 1.0);
}
`;

export const ExtractionShaderOverlay = ({
  imageRef,
  imageVersion,
  stage,
  width,
  height,
}: ExtractionShaderOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const uniformsRef = useRef<{
    time: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    stageProgress: WebGLUniformLocation | null;
    stage: WebGLUniformLocation | null;
  } | null>(null);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const stageStartTimeRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const reducedMotionRef = useRef<MediaQueryList | null>(null);

  // Keep the latest stage/size in refs so the render loop always reads
  // current values without being torn down on every prop change.
  const stageRef = useRef<GridStage | null>(stage);
  const sizeRef = useRef({ width, height });
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  // Draw a single frame using the current refs.
  const drawFrame = useCallback((elapsed: number, stageProgress: number) => {
    const gl = glRef.current;
    const program = programRef.current;
    const uniforms = uniformsRef.current;
    const currentStage = stageRef.current;
    if (!gl || !program || !uniforms || !currentStage) return;

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);

    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform2f(uniforms.resolution, sizeRef.current.width, sizeRef.current.height);

    const stageInt =
      currentStage === "entering" ? 0 : currentStage === "breathing" ? 1 : 2;
    gl.uniform1i(uniforms.stage, stageInt);
    gl.uniform1f(uniforms.stageProgress, stageProgress);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, []);

  const stageProgressFor = (currentStage: GridStage, stageElapsed: number) => {
    if (currentStage === "entering") return Math.min(stageElapsed / 1.0, 1.0);
    if (currentStage === "breathing") return (stageElapsed % 1.5) / 1.5;
    return Math.min(stageElapsed / 0.8, 1.0); // leaving
  };

  const stopAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    if (!startTimeRef.current) startTimeRef.current = performance.now();
    stageStartTimeRef.current = performance.now();

    const render = (time: number) => {
      const currentStage = stageRef.current;
      if (!currentStage) {
        rafRef.current = 0;
        return;
      }

      const elapsed = (time - startTimeRef.current) / 1000;
      const stageElapsed = (time - stageStartTimeRef.current) / 1000;
      drawFrame(elapsed, stageProgressFor(currentStage, stageElapsed));

      if (!reducedMotionRef.current?.matches) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(render);
  }, [drawFrame, stopAnimation]);

  const handleMotionChange = useCallback(() => {
    if (stageRef.current && !reducedMotionRef.current?.matches) {
      startAnimation();
    } else {
      stopAnimation();
      // Draw one static frame so the effect is still visible when paused.
      if (stageRef.current) drawFrame(0, 0.5);
    }
  }, [startAnimation, stopAnimation, drawFrame]);

  // One-time WebGL setup: context, shaders, program, buffer, texture.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.warn("WebGL2 not available; shader overlay will not render");
      return;
    }
    glRef.current = gl;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    // Shaders can be deleted once linked.
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }
    programRef.current = program;
    gl.useProgram(program);

    // Cache uniform locations.
    uniformsRef.current = {
      time: gl.getUniformLocation(program, "u_time"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      stageProgress: gl.getUniformLocation(program, "u_stageProgress"),
      stage: gl.getUniformLocation(program, "u_stage"),
    };
    // Bind the sampler to texture unit 0.
    gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);

    // Fullscreen triangle.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture.
    const texture = gl.createTexture();
    if (!texture) return;
    textureRef.current = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Upload a 1x1 black placeholder so the texture is complete before the
    // real image loads (an incomplete texture samples as black).
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    gl.clearColor(0, 0, 0, 1);

    // Reduced-motion listener (same reference for add + remove).
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current.addEventListener("change", handleMotionChange);

    return () => {
      stopAnimation();
      reducedMotionRef.current?.removeEventListener("change", handleMotionChange);
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }
      if (textureRef.current) {
        gl.deleteTexture(textureRef.current);
        textureRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMotionChange, stopAnimation]);

  // Keep the canvas backing store sized to the props / DPR.
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    applySize();

    resizeObserverRef.current = new ResizeObserver(applySize);
    resizeObserverRef.current.observe(canvas);
    return () => resizeObserverRef.current?.disconnect();
  }, [width, height]);

  // Upload the source image to the texture (with load-retry).
  useEffect(() => {
    const gl = glRef.current;
    const texture = textureRef.current;
    const img = imageRef.current;
    if (!gl || !texture || !img) return;

    let cancelled = false;

    const upload = () => {
      if (cancelled) return;
      if (!img.complete || img.naturalWidth === 0) {
        img.addEventListener("load", upload, { once: true });
        return;
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } catch (err) {
        // Most commonly a cross-origin image without crossOrigin="anonymous".
        console.warn("Texture upload failed (is the image cross-origin?):", err);
      }
      // Redraw a static frame so the newly uploaded image is visible even
      // when no animation is running.
      if (stageRef.current && !rafRef.current) drawFrame(0, 0.5);
    };

    upload();
    return () => {
      cancelled = true;
      img.removeEventListener("load", upload);
    };
  }, [imageRef, imageVersion, drawFrame]);

  // Start / stop the animation whenever the stage changes.
  useEffect(() => {
    if (!stage) {
      stopAnimation();
      startTimeRef.current = 0;
      stageStartTimeRef.current = 0;
      return;
    }
    if (reducedMotionRef.current?.matches) {
      // Static frame only.
      drawFrame(0, 0.5);
      return;
    }
    startAnimation();
    return stopAnimation;
  }, [stage, startAnimation, stopAnimation, drawFrame]);

  if (!stage) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};
