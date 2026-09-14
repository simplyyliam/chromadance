import { useCallback, useEffect, useRef, type RefObject } from "react";
import { frameAt, STAGE_SECONDS, type GridStage, type TimelineFrame } from "./timeline";

type ExtractionShaderOverlayProps = {
  imageRef: RefObject<HTMLImageElement | null>;
  imageVersion?: number;
  /** Shared run start timestamp from `useExtractionTimeline`. */
  startAtRef: RefObject<number>;
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

/**
 * The artwork is sampled at its exact, undistorted coordinates. Every animated
 * element here is *light* - ripple highlights, an expanding wavefront, a
 * breathing core glow, caustic banding - composited over pixels that never move.
 * That means the effect can never leave the image stretched once it finishes.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2  u_resolution;
uniform vec4  u_cover;      // xy = scale, zw = offset (replicates object-cover)
uniform float u_time;
uniform float u_stageTime;  // seconds elapsed within the current stage
uniform float u_progress;
uniform int   u_stage;      // 0 entering, 1 breathing, 2 leaving

const vec3  NEUTRAL = vec3(0.55, 0.55, 0.60);
const float TAU   = 6.28318530718;

// Raise above 0.0 to let the ripple actually refract the artwork. Kept at 0.0
// so the image is never warped or stretched - only the light on top of it is.
const float IMAGE_REFRACTION = 0.01;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2  uv  = v_uv;
  vec2  p   = (uv - 0.5) * vec2(aspect, 1.0);
  float d   = length(p);
  float nd  = d / max(1e-5, length(vec2(aspect, 1.0)) * 0.5);
  vec2  dir = d > 1e-5 ? p / d : vec2(0.0);

  // Map to the same crop the <img> shows, so the shader lines up with the DOM.
  vec2 imageUV  = uv * u_cover.xy + u_cover.zw;
  vec3 pristine = texture(u_image, imageUV).rgb;

  float intensity =
      u_stage == 0 ? smoothstep(0.0, 1.0, u_progress) :
      u_stage == 1 ? 1.0 :
                     1.0 - smoothstep(0.0, 1.0, u_progress);

  // ---- ripple height field: used for shading only, never to move pixels ----
  float phase  = d * 34.0 - u_time * 2.6;
  float height = sin(phase);
  // Radial derivative of the height map approximates a surface normal, which
  // is what gives the convincing glass-ripple highlight without displacement.
  float slope  = cos(phase) * 34.0;

  // ---- wavefront: tracks the stage, loops continuously while breathing ----
  // Driven by time within the stage (not global time) so each ripple starts at
  // the centre instead of popping into existence mid-frame at a stage change.
  float frontR = (u_stage == 1 ? fract(u_stageTime * 0.42) : u_progress) * 1.18;
  float front  = smoothstep(0.11, 0.0, abs(nd - frontR));

  // ---- breathing core glow ----
  float breath = 0.5 + 0.5 * sin(u_time * 1.7);
  float core   = exp(-d * 3.1) * (0.42 + 0.58 * breath);

  // ---- caustic banding riding the ripple ----
  float bands = pow(0.5 + 0.5 * height, 4.0);

  // ---- stone-drop ripple: fires once, only while leaving --------------------

  // Age of the drop in seconds; only ticks during the leaving stage.
  float dropAge = u_stage == 2 ? u_stageTime : -1.0;

  float dropDisplace = 0.0; // radial push, in UV units — the water actually moving
  float dropHighlight = 0.0; // bright crest catching light

  if (dropAge >= 0.0) {
    // The wavefront's leading edge travels outward at a constant speed.
    float waveSpeed = 1.35;
    float waveR = dropAge * waveSpeed;

    // Distance behind the leading edge; negative ahead of it, positive behind.
    float behind = waveR - nd;

    // Only the water behind the leading edge is disturbed (ahead is still calm).
    float disturbed = smoothstep(0.0, 0.05, behind);

    // Oscillation: several rings trailing the leading edge, like real ripples.
    float ringWave = sin(behind * 26.0 - dropAge * 2.0);

    // Amplitude dies out both with distance-behind-the-front and with time,
    // so the ripple is a short trailing wake, not an endless pattern.
    float decay = exp(-behind * 3.0) * exp(-dropAge * 1.1);

    dropDisplace = ringWave * decay * disturbed;

    // A sharper, positive-only version for the light highlight (crests only).
    dropHighlight = max(ringWave, 0.0) * decay * disturbed;
  }

  float grain = (hash(uv * u_resolution + u_time * 60.0) - 0.5) * 0.04;

  // Optional, disabled by default.
  vec2 refracted = imageUV + dir * (height * IMAGE_REFRACTION * intensity);

  // Add the stone-drop displacement on top — this is what makes the water
  // actually move, not just glow. Small multiplier keeps it looking like
  // real water disturbance rather than a lens warp.
  refracted += dir * dropDisplace * 0.018;

  vec3 base = (IMAGE_REFRACTION > 0.0 || dropDisplace != 0.0)
      ? texture(u_image, refracted).rgb
      : pristine;

  // ---- additive light, screen-blended so the artwork stays readable ----
  vec3 light = vec3(0.0);
  light += NEUTRAL * core * 0.60;
  light += vec3(1.00, 1.00, 1.00) * front * front * 0.55;
  light += NEUTRAL * bands * 0.26;
  light += vec3(clamp(slope * 0.02, 0.0, 1.0)) * 0.16 * (0.25 + 0.75 * front);
  // The stone-drop crests catching light, bright and neutral.
  light += vec3(1.0) * dropHighlight * 0.9;

  vec3 tinted = mix(base, NEUTRAL, 0.16 * intensity);
  vec3 lit    = 1.0 - (1.0 - tinted) * (1.0 - clamp(light * intensity, 0.0, 1.0));
  lit += grain * intensity;

  // Guarantees the frame resolves back to the untouched image.
  fragColor = vec4(mix(pristine, lit, intensity), 1.0);
}
`;



export const ExtractionShaderOverlay = ({
  imageRef,
  imageVersion,
  startAtRef,
  stage,
  width,
  height,
}: ExtractionShaderOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const rafRef = useRef(0);

  const uniformsRef = useRef<{
    time: WebGLUniformLocation | null;
    stageTime: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    cover: WebGLUniformLocation | null;
    progress: WebGLUniformLocation | null;
    stage: WebGLUniformLocation | null;
  } | null>(null);

  /** object-cover mapping: [scaleX, scaleY, offsetX, offsetY]. */
  const coverRef = useRef<[number, number, number, number]>([1, 1, 0, 0]);
  const sizeRef = useRef({ width, height });

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  /* -------------------------------------------------------------- draw a frame */

  const drawFrame = useCallback((frame: TimelineFrame) => {
    const gl = glRef.current;
    const program = programRef.current;
    const uniforms = uniformsRef.current;
    if (!gl || !program || !uniforms) return;

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);

    gl.uniform1f(uniforms.time, frame.elapsed);
    gl.uniform1f(uniforms.stageTime, frame.stageProgress * STAGE_SECONDS[frame.stage]);
    gl.uniform2f(uniforms.resolution, sizeRef.current.width, sizeRef.current.height);
    gl.uniform4f(uniforms.cover, ...coverRef.current);
    gl.uniform1f(uniforms.progress, frame.stageProgress);
    gl.uniform1i(
      uniforms.stage,
      frame.stage === "entering" ? 0 : frame.stage === "breathing" ? 1 : 2,
    );

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, []);

  /* ------------------------------------------------------------ one-time setup */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.warn("WebGL2 unavailable; extraction shader will not render");
      return;
    }
    glRef.current = gl;

    const compile = (type: number, src: string): WebGLShader | null => {
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
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    uniformsRef.current = {
      time: gl.getUniformLocation(program, "u_time"),
      stageTime: gl.getUniformLocation(program, "u_stageTime"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      cover: gl.getUniformLocation(program, "u_cover"),
      progress: gl.getUniformLocation(program, "u_progress"),
      stage: gl.getUniformLocation(program, "u_stage"),
    };
    // Bind the sampler to texture unit 0.
    gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);

    // Fullscreen triangle.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    if (!texture) return;
    textureRef.current = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // A complete 1x1 placeholder: an incomplete texture samples as pure black.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );

    gl.clearColor(0, 0, 0, 1);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }
      if (textureRef.current) {
        gl.deleteTexture(textureRef.current);
        textureRef.current = null;
      }
      if (buffer) gl.deleteBuffer(buffer);
    };
  }, []);

  /* ---------------------------------------------------------------- canvas size */

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl || width <= 0 || height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }, [width, height]);

  /* ------------------------------------------------------------ texture upload */

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
      // DOM images are top-left origin, WebGL textures are bottom-left.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } catch (error) {
        console.warn("Texture upload failed (cross-origin image?):", error);
        return;
      }

      // Recompute the object-cover crop for the current image and box.
      const { width: boxWidth, height: boxHeight } = sizeRef.current;
      if (boxWidth > 0 && boxHeight > 0) {
        const boxAspect = boxWidth / boxHeight;
        const imageAspect = img.naturalWidth / img.naturalHeight;

        if (imageAspect > boxAspect) {
          const scaleX = boxAspect / imageAspect;
          coverRef.current = [scaleX, 1, (1 - scaleX) / 2, 0];
        } else {
          const scaleY = imageAspect / boxAspect;
          coverRef.current = [1, scaleY, 0, (1 - scaleY) / 2];
        }
      }
    };

    upload();

    return () => {
      cancelled = true;
      img.removeEventListener("load", upload);
    };
  }, [imageRef, imageVersion, width, height]);

  /* ---------------------------------------------------------------- render loop */

  useEffect(() => {
    if (!stage || width <= 0 || height <= 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      drawFrame({ elapsed: 0, stage: "breathing", stageProgress: 0.5, done: false });
      return;
    }

    const loop = (now: number) => {
      const startAt = startAtRef.current;
      if (!startAt) {
        rafRef.current = 0;
        return;
      }

      const frame = frameAt((now - startAt) / 1000);
      drawFrame(frame);

      if (frame.done) {
        rafRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [stage, width, height, drawFrame, startAtRef]);

  // Always mounted, only hidden: unmounting the canvas while idle would mean the
  // WebGL context, program and texture are never created, and the one-time setup
  // effect would not run again once a stage arrives.
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ width, height, visibility: stage ? "visible" : "hidden" }}
      aria-hidden="true"
    />
  );
};