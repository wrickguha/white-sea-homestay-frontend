import { Injectable, ElementRef, PLATFORM_ID, Inject, NgZone, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { ThemeService, DayNightTheme } from './theme.service';

@Injectable({
  providedIn: 'root'
}
)
export class ThreeService {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  
  // Lights
  private ambientLight: THREE.AmbientLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private moonLight: THREE.DirectionalLight | null = null;
  
  // Objects
  private terrain: THREE.Mesh | null = null;
  private forest: THREE.InstancedMesh | null = null;
  private clouds: THREE.Group | null = null;
  private particles: THREE.Points | null = null;

  // Immersive Procedural Models
  public cabin: THREE.Group | null = null;
  public cabinExterior: THREE.Group | null = null;
  public cabinInterior: THREE.Group | null = null;
  private smokeParticles: THREE.Points | null = null;
  private stars: THREE.Points | null = null;
  private fireflies: THREE.Points | null = null;
  private birds: THREE.Group | null = null;
  
  // Bonfire & Fireplace
  private bonfire: THREE.Group | null = null;
  private bonfireLight: THREE.PointLight | null = null;
  private bonfireParticles: THREE.Points | null = null;
  private interiorFireLight: THREE.PointLight | null = null;
  private interiorFireParticles: THREE.Points | null = null;
  
  // Interaction & Scroll coordination
  public isHomeJourneyActive = false;
  public cameraBasePosition = new THREE.Vector3(0, 65, 110);
  public cameraBaseTarget = new THREE.Vector3(0, 25, 0);
  private mouse = { x: 0, y: 0 };
  private targetMouse = { x: 0, y: 0 };
  
  // Animation ID
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;

  constructor(
    private themeService: ThemeService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Set up responsive transition triggers when the Day/Night theme updates (only if not in home journey)
      effect(() => {
        const theme = this.themeService.theme();
        if (!this.isHomeJourneyActive) {
          this.transitionTheme(theme);
        }
      });
    }
  }

  /**
   * Initializes the WebGL canvas and scene.
   */
  init(canvasRef: ElementRef<HTMLCanvasElement>) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.canvas = canvasRef.nativeElement;
    
    this.ngZone.runOutsideAngular(() => {
      this.createScene();
      this.animate();
    });
    
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  /**
   * Destroys the WebGL context and releases resources.
   */
  destroy() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Dispose resources
    this.scene?.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: any) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    
    this.renderer?.dispose();
  }

  /**
   * Procedural terrain height function using a combination of sine/cosine waves.
   */
  private getTerrainHeight(x: number, z: number): number {
    return (
      Math.sin(x * 0.04) * Math.cos(z * 0.04) * 8 +
      Math.sin(x * 0.015) * Math.sin(z * 0.015) * 18 +
      Math.cos(x * 0.08) * Math.sin(z * 0.08) * 3
    );
  }

  private createScene() {
    if (!this.canvas) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // 1. Scene & Setup
    this.scene = new THREE.Scene();
    
    const isNight = this.themeService.theme() === 'night';
    const initBgColor = isNight ? 0x070c0e : 0xe3ebe7;
    
    this.scene.background = new THREE.Color(initBgColor);
    this.scene.fog = new THREE.FogExp2(initBgColor, 0.007);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.copy(this.cameraBasePosition);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height, false);
    const isMobile = window.innerWidth < 768;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, isNight ? 0.15 : 0.8);
    this.scene.add(this.ambientLight);

    // Sun (Day Light)
    this.sunLight = new THREE.DirectionalLight(0xfff7e6, isNight ? 0 : 1.2);
    this.sunLight.position.set(50, 40, 20);
    this.scene.add(this.sunLight);

    // Moon (Night Light)
    this.moonLight = new THREE.DirectionalLight(0xa5c5e8, isNight ? 0.6 : 0);
    this.moonLight.position.set(-50, 30, -20);
    this.scene.add(this.moonLight);

    // 5. Procedural Mountain Terrain
    const terrainGeo = new THREE.PlaneGeometry(300, 300, 100, 100);
    terrainGeo.rotateX(-Math.PI / 2); // Make horizontal

    const posAttr = terrainGeo.attributes['position'];
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.getTerrainHeight(x, z);
      posAttr.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x14251e,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true
    });
    this.terrain = new THREE.Mesh(terrainGeo, terrainMat);
    this.scene.add(this.terrain);

    // 6. Instanced Forest (Pine Trees)
    this.createForest();

    // 7. Volumetric Floating Clouds
    this.createClouds();

    // 8. Particle System (Needles / Fireflies)
    this.createParticles(isNight);

    // 9. Procedural Cabin Exterior
    this.createCabin();

    // 10. Procedural Cabin Interior Room
    this.createInterior();

    // 11. Stars, Fireflies, and Birds Systems
    this.createStars();
    this.createFireflies();
    this.createBirds();
  }

  private createForest() {
    if (!this.scene) return;

    const treeGeo = new THREE.ConeGeometry(2, 6, 5);
    treeGeo.translate(0, 3, 0);

    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x0a1610,
      roughness: 0.85,
      flatShading: true
    });

    const forestCount = 200;
    this.forest = new THREE.InstancedMesh(treeGeo, treeMat, forestCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < forestCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 25 + Math.random() * 110;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Prevent spawning directly inside the cabin footprint (around x=0, z=0)
      if (Math.abs(x) < 14 && Math.abs(z) < 14) continue;
      
      const y = this.getTerrainHeight(x, z) - 0.5;

      dummy.position.set(x, y, z);
      
      const scale = 0.5 + Math.random() * 1.6;
      dummy.scale.set(scale, scale * (0.85 + Math.random() * 0.3), scale);
      dummy.rotation.y = Math.random() * Math.PI;

      dummy.updateMatrix();
      this.forest.setMatrixAt(i, dummy.matrix);
    }
    this.forest.instanceMatrix.needsUpdate = true;
    this.scene.add(this.forest);
  }

  private createClouds() {
    if (!this.scene) return;

    this.clouds = new THREE.Group();
    const cloudGeo = new THREE.DodecahedronGeometry(8, 1);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    });

    const cloudCount = 10;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      const x = -120 + Math.random() * 240;
      const y = 25 + Math.random() * 20;
      const z = -80 + Math.random() * 160;
      
      cloud.position.set(x, y, z);
      cloud.scale.set(2.5 + Math.random() * 2.5, 0.7 + Math.random() * 0.4, 1.4 + Math.random() * 1.0);
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }

  private createParticles(isNight: boolean) {
    if (!this.scene) return;

    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = 5 + Math.random() * 45;
      positions[i + 2] = (Math.random() - 0.5) * 200;
      speeds[i / 3] = 0.05 + Math.random() * 0.08;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pColor = isNight ? 0xd4af37 : 0x5a7e6f;
    const material = new THREE.PointsMaterial({
      color: pColor,
      size: isNight ? 0.7 : 0.4,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    (this.particles as any).userData = { speeds };
    this.scene.add(this.particles);
  }

  /**
   * Procedural Cabin Creation (Exterior)
   */
  private createCabin() {
    if (!this.scene) return;
    this.cabin = new THREE.Group();
    // Position slightly raised on terrain center (terrain height at 0,0 is ~0)
    this.cabin.position.set(0, 0.0, 0);

    this.cabinExterior = new THREE.Group();

    // Floor Base (Porters Deck)
    const floorGeo = new THREE.BoxGeometry(16, 0.6, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.3;
    this.cabinExterior.add(floor);

    // Main Cabin Walls (Log Cabin feel)
    const wallsGeo = new THREE.BoxGeometry(14, 6.2, 10);
    const wallsMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
    const walls = new THREE.Mesh(wallsGeo, wallsMat);
    walls.position.y = 3.4;
    this.cabinExterior.add(walls);

    // Slanting A-Frame Slate Shingles Roof
    const roofGeo = new THREE.ConeGeometry(11, 5.2, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1d2120, roughness: 0.75, flatShading: true });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 8.4, 0);
    roof.scale.set(1.15, 1.0, 1.45);
    this.cabinExterior.add(roof);

    // Chimney Stack
    const chimneyGeo = new THREE.BoxGeometry(1.4, 6.5, 1.4);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x484848, roughness: 0.9, flatShading: true });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(-5, 7.8, -3.2);
    this.cabinExterior.add(chimney);

    // Chimney Smoke Particles
    this.createSmoke();

    // Glowing Yellow Emissive Windows
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xff8c00,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1
    });

    // Glass Attic Window (front-facing, where camera enters)
    const atticWindow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 0.2), windowMat);
    atticWindow.name = 'atticWindow';
    atticWindow.position.set(0, 6.1, 5.0);
    this.cabinExterior.add(atticWindow);

    // Ground floor windows
    const leftWindow = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2), windowMat);
    leftWindow.position.set(-4, 3.4, 5.0);
    this.cabinExterior.add(leftWindow);

    const rightWindow = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2), windowMat);
    rightWindow.position.set(4, 3.4, 5.0);
    this.cabinExterior.add(rightWindow);

    // Wooden door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x221509, roughness: 0.95 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.4, 0.2), doorMat);
    door.position.set(0, 2.5, 5.0);
    this.cabinExterior.add(door);

    // Front balcony deck (extends forward)
    const deckGeo = new THREE.BoxGeometry(16, 0.25, 8);
    const deck = new THREE.Mesh(deckGeo, floorMat);
    deck.position.set(0, 0.15, 9.8);
    this.cabinExterior.add(deck);

    // Deck railings
    const railMat = new THREE.MeshStandardMaterial({ color: 0x331c0e, roughness: 0.95 });
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(16, 1.3, 0.25), railMat);
    railBack.position.set(0, 0.78, 13.8);
    this.cabinExterior.add(railBack);

    const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 8), railMat);
    railLeft.position.set(-8, 0.78, 9.8);
    this.cabinExterior.add(railLeft);

    const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 8), railMat);
    railRight.position.set(8, 0.78, 9.8);
    this.cabinExterior.add(railRight);

    // Cozy deck armchairs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2b382d, roughness: 0.9 });
    const chairLeft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), chairMat);
    chairLeft.position.set(-4, 0.8, 9.5);
    chairLeft.rotation.y = 0.25;
    this.cabinExterior.add(chairLeft);

    const chairRight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), chairMat);
    chairRight.position.set(4, 0.8, 9.5);
    chairRight.rotation.y = -0.25;
    this.cabinExterior.add(chairRight);

    // Bonfire on the deck edge
    this.createBonfire();

    this.cabin.add(this.cabinExterior);
    this.scene.add(this.cabin);
  }

  /**
   * Procedural Room Interior Creation
   */
  private createInterior() {
    if (!this.scene) return;
    this.cabinInterior = new THREE.Group();
    this.cabinInterior.position.set(0, 0.0, 0);
    this.cabinInterior.visible = false; // Hidden initially until camera zooms inside

    // Interior floorboards
    const intFloorGeo = new THREE.BoxGeometry(13.6, 0.2, 9.6);
    const intFloorMat = new THREE.MeshStandardMaterial({ color: 0x472b18, roughness: 0.8 });
    const intFloor = new THREE.Mesh(intFloorGeo, intFloorMat);
    intFloor.position.y = 0.45;
    this.cabinInterior.add(intFloor);

    // Paneled walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6e452a, roughness: 0.9 });
    
    // Back interior wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.8, 0.2), wallMat);
    backWall.position.set(0, 3.35, -4.7);
    this.cabinInterior.add(backWall);

    // Left interior wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.8, 9.6), wallMat);
    leftWall.position.set(-6.7, 3.35, 0);
    this.cabinInterior.add(leftWall);

    // Right interior wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.8, 9.6), wallMat);
    rightWall.position.set(6.7, 3.35, 0);
    this.cabinInterior.add(rightWall);

    // Ceiling beams (structural attic vibe)
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x301a0b, roughness: 0.95 });
    for (let z = -3.8; z <= 3.8; z += 1.8) {
      const beamL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.8, 0.3), beamMat);
      beamL.position.set(-3.2, 5.8, z);
      beamL.rotation.z = Math.PI / 5.5;
      this.cabinInterior.add(beamL);

      const beamR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.8, 0.3), beamMat);
      beamR.position.set(3.2, 5.8, z);
      beamR.rotation.z = -Math.PI / 5.5;
      this.cabinInterior.add(beamR);
    }

    // Cozy King Bed
    const bedGroup = new THREE.Group();
    bedGroup.position.set(3.2, 0.55, 1.2);

    // Bed frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.8, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x221308, roughness: 0.95 })
    );
    frame.position.y = 0.4;
    bedGroup.add(frame);

    // Mattress
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.6, 4.9),
      new THREE.MeshStandardMaterial({ color: 0xfbfbf6, roughness: 0.9 })
    );
    mattress.position.y = 0.9;
    bedGroup.add(mattress);

    // Green thick wool blanket
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(3.95, 0.62, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x142c1c, roughness: 0.95 })
    );
    blanket.position.set(0, 0.91, 0.5);
    bedGroup.add(blanket);

    // Pillows
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xeae8df, roughness: 0.9 });
    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 1.1), pillowMat);
    pillow1.position.set(-0.9, 1.25, -1.6);
    bedGroup.add(pillow1);

    const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 1.1), pillowMat);
    pillow2.position.set(0.9, 1.25, -1.6);
    bedGroup.add(pillow2);

    this.cabinInterior.add(bedGroup);

    // Cozy fireplace
    const fireplace = new THREE.Group();
    fireplace.position.set(-4.2, 0.55, -1.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9, flatShading: true });
    
    // Stone base
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 2.2), stoneMat);
    base.position.y = 0.18;
    fireplace.add(base);

    // Mantel pillars
    const mantelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.3, 1.8), stoneMat);
    mantelLeft.position.set(-1.25, 1.8, 0);
    fireplace.add(mantelLeft);

    const mantelRight = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.3, 1.8), stoneMat);
    mantelRight.position.set(1.25, 1.8, 0);
    fireplace.add(mantelRight);

    const mantelTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 2.0), stoneMat);
    mantelTop.position.set(0, 3.85, 0);
    fireplace.add(mantelTop);

    // Wood shelf mantel
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.2, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x221308, roughness: 0.9 })
    );
    shelf.position.set(0, 3.4, 0);
    fireplace.add(shelf);

    // Fuel Logs
    const logMat = new THREE.MeshStandardMaterial({ color: 0x381f11, roughness: 0.9 });
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6), logMat);
    log1.position.set(-0.35, 0.45, 0);
    log1.rotation.set(0.1, 0, 0.7);
    fireplace.add(log1);

    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6), logMat);
    log2.position.set(0.35, 0.45, 0.05);
    log2.rotation.set(-0.1, 0, -0.7);
    fireplace.add(log2);

    // Flickering fire orange point light
    this.interiorFireLight = new THREE.PointLight(0xff5500, 1.8, 8);
    this.interiorFireLight.position.set(0, 0.8, 0);
    fireplace.add(this.interiorFireLight);

    // Fire sparks particle system
    this.createInteriorFireParticles(fireplace);

    this.cabinInterior.add(fireplace);

    // Rust orange armchair near fireplace
    const armchair = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.8, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x7f230f, roughness: 0.95 })
    );
    armchair.position.set(-1.4, 1.35, 1.8);
    armchair.rotation.y = 0.55;
    this.cabinInterior.add(armchair);

    this.scene.add(this.cabinInterior);
  }

  private createSmoke() {
    if (!this.scene) return;
    const count = 35;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = -5.0 + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = 11.2 + Math.random() * 5.0;
      positions[i * 3 + 2] = -3.2 + (Math.random() - 0.5) * 0.4;
      opacities[i] = Math.random() * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xbcbcbc,
      size: 1.6,
      transparent: true,
      opacity: 0.28,
      blending: THREE.NormalBlending
    });

    this.smokeParticles = new THREE.Points(geometry, material);
    const speedsY = new Float32Array(count);
    const speedsX = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      speedsY[i] = 0.02 + Math.random() * 0.025;
      speedsX[i] = 0.006 + (Math.random() - 0.5) * 0.012;
    }
    (this.smokeParticles as any).userData = { speedsY, speedsX, startY: 11.2 };
    this.scene.add(this.smokeParticles);
  }

  private createStars() {
    const count = 800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 260; // outer bounds
      pos[i] = r * Math.sin(phi) * Math.cos(theta);
      pos[i + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)) + 12;
      pos[i + 2] = r * Math.cos(phi);
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.55,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene!.add(this.stars);
  }

  private createFireflies() {
    const count = 55;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16.0;
      pos[i * 3 + 1] = 0.6 + Math.random() * 3.8;
      pos[i * 3 + 2] = 5.0 + Math.random() * 8.0;
      speeds[i] = 0.01 + Math.random() * 0.02;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    const mat = new THREE.PointsMaterial({
      color: 0xebb521,
      size: 0.5,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    
    this.fireflies = new THREE.Points(geo, mat);
    (this.fireflies as any).userData = { speeds };
    this.scene!.add(this.fireflies);
  }

  private createBirds() {
    this.birds = new THREE.Group();
    
    // Create V-shaped path flapping birds
    const birdGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.8, 0, 0,
       0, 0.16, 0.15,
       0.8, 0, 0,
       0, 0, -0.3
    ]);
    const indices = [
      0, 1, 3,
      1, 2, 3
    ];
    birdGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    birdGeo.setIndex(indices);
    birdGeo.computeVertexNormals();
    
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x14201a, side: THREE.DoubleSide });
    
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(birdGeo, birdMat);
      mesh.position.set(-75 - i * 12, 28 + Math.random() * 8, -40 + i * 9);
      mesh.scale.set(0.65, 0.65, 0.65);
      mesh.userData = { 
        speed: 0.38 + Math.random() * 0.12,
        wingSpeed: 10 + Math.random() * 5,
        offset: Math.random() * 100
      };
      this.birds.add(mesh);
    }
    this.scene!.add(this.birds);
  }

  private createBonfire() {
    this.bonfire = new THREE.Group();
    this.bonfire.position.set(-5, 0.25, 9.8);

    // Stone ring
    const stoneGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x484848, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      const angle = (i / 8) * Math.PI * 2;
      stone.position.set(Math.cos(angle) * 0.9, 0.08, Math.sin(angle) * 0.9);
      stone.scale.set(0.85 + Math.random() * 0.3, 0.85 + Math.random() * 0.3, 0.85 + Math.random() * 0.3);
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      this.bonfire.add(stone);
    }

    // Stacked fuel wood logs
    const logGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x221308, roughness: 0.95 });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      const angle = (i / 4) * Math.PI;
      log.rotation.z = Math.PI / 4.2;
      log.rotation.y = angle;
      log.position.set(0, 0.28, 0);
      this.bonfire.add(log);
    }

    // Flickering bonfire firelight
    this.bonfireLight = new THREE.PointLight(0xff5500, 0.0, 16);
    this.bonfireLight.position.set(0, 0.7, 0);
    this.bonfire.add(this.bonfireLight);

    // Spark particles
    const count = 25;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(count * 3);
    const sparkSpeeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 0.5;
      sparkPos[i * 3 + 1] = 0.4 + Math.random() * 2.8;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      sparkSpeeds[i] = 0.02 + Math.random() * 0.035;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.38,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.bonfireParticles = new THREE.Points(sparkGeo, sparkMat);
    (this.bonfireParticles as any).userData = { speeds: sparkSpeeds };
    this.bonfire.add(this.bonfireParticles);

    this.cabinExterior!.add(this.bonfire);
  }

  private createInteriorFireParticles(fireplaceGroup: THREE.Group) {
    const count = 18;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.35;
      pos[i * 3 + 1] = 0.45 + Math.random() * 1.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
      speeds[i] = 0.015 + Math.random() * 0.02;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff4d00,
      size: 0.28,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.interiorFireParticles = new THREE.Points(geo, mat);
    (this.interiorFireParticles as any).userData = { speeds };
    fireplaceGroup.add(this.interiorFireParticles);
  }

  /**
   * Updates lights, sky colors, fog, stars, and fireflies based on scroll progress (0.0 to 1.0)
   */
  public updateEnvironment(progress: number) {
    if (!this.scene || !this.ambientLight || !this.sunLight || !this.moonLight) return;

    let skyColor = new THREE.Color(0xe3ebe7);
    let fogColor = new THREE.Color(0xe3ebe7);
    let fogDensity = 0.007;
    let ambientIntensity = 0.8;
    let sunIntensity = 1.2;
    let moonIntensity = 0.0;
    let starOpacity = 0.0;
    let fireflyOpacity = 0.0;
    let bonfireActive = 0.0;

    // 1. Calculations across the 11 progress ranges (aligned with the V3 content hierarchy)
    if (progress <= 0.1) {
      // Scene 1: Misty Dawn (Teal/Grey sky, dense fog)
      const ratio = progress / 0.1;
      skyColor.setHex(0x3a4f47);
      fogColor.setHex(0x3a4f47);
      fogDensity = 0.038 - ratio * 0.023; // Fades from 0.038 down to 0.015
      ambientIntensity = 0.35 + ratio * 0.45; // Fades from 0.35 to 0.8
      sunIntensity = 0.15 + ratio * 1.05;   // Fades from 0.15 to 1.2
    } 
    else if (progress <= 0.45) {
      // Scene 2-3: Bright Day
      skyColor.setHex(0xe3ebe7);
      fogColor.setHex(0xe3ebe7);
      fogDensity = 0.015 - ((progress - 0.1) / 0.35) * 0.008; // Fades down to 0.007
      ambientIntensity = 0.8;
      sunIntensity = 1.2;
    } 
    else if (progress <= 0.58) {
      // Scene 4 (Rooms): Inside Attic Room (Camera is inside, clear up mist)
      skyColor.setHex(0xdce5e1);
      fogColor.setHex(0xdce5e1);
      fogDensity = 0.003; // Fog fades almost completely inside
      ambientIntensity = 0.75;
      sunIntensity = 1.0;
    } 
    else if (progress <= 0.68) {
      // Scene 5 (Reviews): Back to forest (Fog re-emerges slightly, late afternoon)
      skyColor.setHex(0xe3ebe7);
      fogColor.setHex(0xe3ebe7);
      fogDensity = 0.007;
      ambientIntensity = 0.8;
      sunIntensity = 1.2;
    } 
    else if (progress <= 0.78) {
      // Scene 6 (Experiences): Sunset / Golden Dusk transition
      const ratio = (progress - 0.68) / 0.10; // 0 to 1
      
      const cDay = new THREE.Color(0xe3ebe7);
      const cSunset = new THREE.Color(0xd97736);
      const cDusk = new THREE.Color(0x2f2142);
      
      if (ratio < 0.5) {
        skyColor.copy(cDay).lerp(cSunset, ratio * 2);
      } else {
        skyColor.copy(cSunset).lerp(cDusk, (ratio - 0.5) * 2);
      }
      
      fogColor.copy(skyColor);
      fogDensity = 0.007 + ratio * 0.002;
      ambientIntensity = 0.8 - ratio * 0.6; // 0.8 down to 0.2
      sunIntensity = 1.2 - ratio * 1.2;     // 1.2 down to 0
      moonIntensity = ratio * 0.3;
      starOpacity = ratio * 0.2;
    } 
    else if (progress <= 0.90) {
      // Scene 7-8 (Host Story / Gallery): Dusk to Night transition
      const ratio = (progress - 0.78) / 0.12; // 0 to 1
      const cDusk = new THREE.Color(0x2f2142);
      const cNight = new THREE.Color(0x06090c);
      
      skyColor.copy(cDusk).lerp(cNight, ratio);
      fogColor.copy(skyColor);
      
      fogDensity = 0.009;
      ambientIntensity = 0.2 - ratio * 0.05; // 0.2 down to 0.15
      sunIntensity = 0.0;
      moonIntensity = 0.3 + ratio * 0.45;    // 0.3 to 0.75
      starOpacity = 0.2 + ratio * 0.8;       // 0.2 to 1.0
      fireflyOpacity = ratio * 0.85;
      bonfireActive = ratio;
    }
    else if (progress <= 0.98) {
      // Scene 9-10 (Location / Booking): Starry Night
      skyColor.setHex(0x06090c);
      fogColor.setHex(0x06090c);
      fogDensity = 0.009;
      ambientIntensity = 0.15;
      sunIntensity = 0.0;
      moonIntensity = 0.75;
      starOpacity = 1.0;
      fireflyOpacity = 0.85;
      bonfireActive = 1.0;
    } 
    else {
      // Scene 11: Sunrise glow (Night transitions back to Dawn/Gold)
      const ratio = (progress - 0.98) / 0.02; // 0 to 1
      const cNight = new THREE.Color(0x06090c);
      const cSunrise = new THREE.Color(0xd47f3b);

      skyColor.copy(cNight).lerp(cSunrise, ratio);
      fogColor.copy(skyColor);
      
      fogDensity = 0.009 + ratio * 0.005;
      ambientIntensity = 0.15 + ratio * 0.6;
      sunIntensity = ratio * 1.1;
      moonIntensity = 0.75 - ratio * 0.75;
      starOpacity = 1.0 - ratio;
      fireflyOpacity = 0.85 - ratio;
      bonfireActive = 1.0 - ratio;
    }

    // 2. Apply states to WebGL scene properties
    this.scene.background = skyColor;
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color = fogColor;
      (this.scene.fog as THREE.FogExp2).density = fogDensity;
    }

    this.ambientLight.intensity = ambientIntensity;
    this.sunLight.intensity = sunIntensity;
    this.moonLight.intensity = moonIntensity;

    if (this.stars) {
      (this.stars.material as THREE.PointsMaterial).opacity = starOpacity;
    }
    if (this.fireflies) {
      (this.fireflies.material as THREE.PointsMaterial).opacity = fireflyOpacity;
    }
    if (this.bonfireParticles) {
      (this.bonfireParticles.material as THREE.PointsMaterial).opacity = bonfireActive * 0.8;
    }
  }

  /**
   * Animates the rendering loop, moving particles, clouds, and adapting camera to mouse.
   */
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.renderer || !this.scene || !this.camera) return;

    // Throttle rendering loop on mobile to preserve CPU/GPU battery
    const now = performance.now();
    const isMobile = window.innerWidth < 768;
    const fpsInterval = isMobile ? 33.33 : 16.67; // ~30fps on mobile, ~60fps on desktop
    const elapsed = now - this.lastFrameTime;

    if (elapsed < fpsInterval) return;
    this.lastFrameTime = now;

    const time = Date.now() * 0.001;

    // 1. Move Clouds slowly across the sky
    if (this.clouds) {
      this.clouds.children.forEach((cloud, index) => {
        cloud.position.x += 0.015 * (1 + (index % 3) * 0.25);
        if (cloud.position.x > 160) {
          cloud.position.x = -160;
        }
        cloud.position.y += Math.sin(time + index) * 0.004;
      });
    }

    // 2. Animate needle particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes['position'].array as Float32Array;
      const speeds = (this.particles as any).userData.speeds;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= speeds[i / 3];
        positions[i] += Math.sin(time + i) * 0.015;

        if (positions[i + 1] < 0) {
          positions[i + 1] = 50;
          positions[i] = (Math.random() - 0.5) * 200;
        }
      }
      this.particles.geometry.attributes['position'].needsUpdate = true;
    }

    // 3. Animate birds
    if (this.birds) {
      this.birds.children.forEach((bird: any) => {
        bird.position.x += bird.userData.speed;
        bird.position.y += Math.sin(time * 2 + bird.userData.offset) * 0.015;
        // Wing flap scale simulation
        bird.scale.y = 0.25 + Math.sin(time * bird.userData.wingSpeed) * 0.45;

        if (bird.position.x > 140) {
          bird.position.x = -140;
          bird.position.y = 25 + Math.random() * 12;
        }
      });
    }

    // 4. Animate chimney smoke
    if (this.smokeParticles) {
      const pos = this.smokeParticles.geometry.attributes['position'].array as Float32Array;
      const userData = (this.smokeParticles as any).userData;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += userData.speedsY[i / 3];
        pos[i] += userData.speedsX[i / 3] + Math.sin(time + i) * 0.006;
        if (pos[i + 1] > userData.startY + 6.0) {
          pos[i + 1] = userData.startY;
          pos[i] = -5.0 + (Math.random() - 0.5) * 0.25;
          pos[i + 2] = -3.2 + (Math.random() - 0.5) * 0.25;
        }
      }
      this.smokeParticles.geometry.attributes['position'].needsUpdate = true;
    }

    // 5. Animate fireflies
    if (this.fireflies && (this.fireflies.material as THREE.PointsMaterial).opacity > 0) {
      const pos = this.fireflies.geometry.attributes['position'].array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += Math.sin(time + i) * 0.005;
        pos[i] += Math.cos(time * 0.5 + i) * 0.006;
        if (pos[i + 1] < 0.4 || pos[i + 1] > 4.5) pos[i + 1] = 1.8;
      }
      this.fireflies.geometry.attributes['position'].needsUpdate = true;
    }

    // 6. Animate bonfire light & sparks
    if (this.bonfireLight && this.bonfireParticles && (this.bonfireParticles.material as THREE.PointsMaterial).opacity > 0) {
      const pos = this.bonfireParticles.geometry.attributes['position'].array as Float32Array;
      const speeds = (this.bonfireParticles as any).userData.speeds;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += speeds[i / 3];
        pos[i] += Math.sin(time * 2 + i) * 0.008;
        if (pos[i + 1] > 3.0) {
          pos[i + 1] = 0.4;
          pos[i] = (Math.random() - 0.5) * 0.4;
          pos[i + 2] = (Math.random() - 0.5) * 0.4;
        }
      }
      this.bonfireParticles.geometry.attributes['position'].needsUpdate = true;
      // Light flicker
      this.bonfireLight.intensity = 2.4 + Math.sin(time * 18) * 0.35;
    }

    // 7. Animate fireplace spark particles inside
    if (this.cabinInterior && this.cabinInterior.visible && this.interiorFireParticles) {
      const pos = this.interiorFireParticles.geometry.attributes['position'].array as Float32Array;
      const speeds = (this.interiorFireParticles as any).userData.speeds;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += speeds[i / 3];
        pos[i] += Math.sin(time * 3 + i) * 0.006;
        if (pos[i + 1] > 1.6) {
          pos[i + 1] = 0.45;
          pos[i] = (Math.random() - 0.5) * 0.3;
        }
      }
      this.interiorFireParticles.geometry.attributes['position'].needsUpdate = true;
      if (this.interiorFireLight) {
        this.interiorFireLight.intensity = 1.8 + Math.sin(time * 22) * 0.3;
      }
    }

    // 8. Smooth Camera easing towards mouse
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Apply base camera position & look target (driven by GSAP ScrollTrigger)
    this.camera.position.x = this.cameraBasePosition.x + this.mouse.x * 5.0;
    this.camera.position.y = this.cameraBasePosition.y + this.mouse.y * 3.5;
    this.camera.position.z = this.cameraBasePosition.z;
    this.camera.lookAt(this.cameraBaseTarget);

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Resizes viewport when browser dimensions change.
   */
  private onResize = () => {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height, false);
  };

  private onMouseMove = (e: MouseEvent) => {
    this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  /**
   * Smoothly crossfades lights when theme changes on static subpages.
   */
  private transitionTheme(theme: DayNightTheme) {
    if (!this.scene || !this.ambientLight || !this.sunLight || !this.moonLight) return;

    const isNight = theme === 'night';
    const targetBg = new THREE.Color(isNight ? 0x06090c : 0xe3ebe7);
    
    import('gsap').then(({ default: gsap }) => {
      gsap.to(this.scene!.background as THREE.Color, {
        r: targetBg.r,
        g: targetBg.g,
        b: targetBg.b,
        duration: 1.5,
        ease: 'power2.out'
      });
      
      const fogColor = (this.scene!.fog as THREE.FogExp2).color;
      gsap.to(fogColor, {
        r: targetBg.r,
        g: targetBg.g,
        b: targetBg.b,
        duration: 1.5,
        ease: 'power2.out'
      });

      gsap.to(this.ambientLight!, {
        intensity: isNight ? 0.15 : 0.8,
        duration: 1.5,
        ease: 'power2.out'
      });

      gsap.to(this.sunLight!, {
        intensity: isNight ? 0.0 : 1.2,
        duration: 1.5,
        ease: 'power2.out'
      });

      gsap.to(this.moonLight!, {
        intensity: isNight ? 0.75 : 0.0,
        duration: 1.5,
        ease: 'power2.out'
      });

      if (this.stars) {
        gsap.to(this.stars.material as THREE.PointsMaterial, {
          opacity: isNight ? 1.0 : 0.0,
          duration: 1.5
        });
      }

      if (this.fireflies) {
        gsap.to(this.fireflies.material as THREE.PointsMaterial, {
          opacity: isNight ? 0.85 : 0.0,
          duration: 1.5
        });
      }
    });
  }
}
