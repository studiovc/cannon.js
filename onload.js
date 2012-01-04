// Physics
var world = new PHYSICS.World();
world.gravity(new PHYSICS.Vec3(0,0,-50));
var bp = new PHYSICS.BroadPhase();
world.broadphase(bp);
world.iterations(10);

var phys_bodies = [];
var phys_visuals = [];
var phys_startpositions = [];

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var SHADOW_MAP_WIDTH = 1024, SHADOW_MAP_HEIGHT = 1024;
var MARGIN = 0;
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
var camera, controls, scene, renderer;
var container, stats;
var NEAR = 5, FAR = 5000;
var sceneHUD, cameraOrtho, hudMaterial;
var light;
var shadowsOn = false;

var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

init();
animate();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  // SCENE CAMERA

  camera = new THREE.PerspectiveCamera( 24, SCREEN_WIDTH / SCREEN_HEIGHT, NEAR, FAR );
  camera.up.set(0,0,1);
  camera.position.x = 0;
  camera.position.y = 30;
  camera.position.z = 12;

  // SCENE
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0xffffff, 1000, FAR );
  THREE.ColorUtils.adjustHSV( scene.fog.color, 0.02, -0.15, -0.65 );

  // LIGHTS
  var ambient = new THREE.AmbientLight( 0x555555 );
  scene.add( ambient );

  light = new THREE.SpotLight( 0xffffff );
  light.position.set( 0, 50, 150 );
  light.target.position.set( 0, 0, 0 );
  if(shadowsOn)
    light.castShadow = true;
  scene.add( light );
  createScene();

  // RENDERER
  renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: false } );
  renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
  renderer.domElement.style.position = "relative";
  renderer.domElement.style.top = MARGIN + 'px';
  container.appendChild( renderer.domElement );

  document.addEventListener('mousemove',onDocumentMouseMove);

  renderer.setClearColor( scene.fog.color, 1 );
  renderer.autoClear = false;

  if(shadowsOn){
    renderer.shadowCameraNear = 0.1;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = 25;
    
    renderer.shadowMapBias = 0.0039;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = SHADOW_MAP_WIDTH;
    renderer.shadowMapHeight = SHADOW_MAP_HEIGHT;
    
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
  }

  // STATS
  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  stats.domElement.style.zIndex = 100;
  container.appendChild( stats.domElement );
}

function createScene( ) {

  // GROUND
  var geometry = new THREE.PlaneGeometry( 100, 100 );
  var planeMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff } );
  THREE.ColorUtils.adjustHSV( planeMaterial.color, 0, 0, 0.9 );
  var ground = new THREE.Mesh( geometry, planeMaterial );
  ground.position.set( 0, 0, 0 );
  //ground.rotation.x = -Math.PI/2;
  ground.scale.set( 100, 100, 100 );
  
  if(shadowsOn){
    ground.castShadow = false;
    ground.receiveShadow = true;
  }
  scene.add( ground );

  var plane = new PHYSICS.Plane(new PHYSICS.Vec3(0,0,0), new PHYSICS.Vec3(0,0,1));
  var plane_xmin = new PHYSICS.Plane(new PHYSICS.Vec3(0,-7,0), new PHYSICS.Vec3(0,1,0));
  var plane_xmax = new PHYSICS.Plane(new PHYSICS.Vec3(0,7,0), new PHYSICS.Vec3(0,-1,0));
  var plane_ymin = new PHYSICS.Plane(new PHYSICS.Vec3(-7,0,0), new PHYSICS.Vec3(1,0,0));
  var plane_ymax = new PHYSICS.Plane(new PHYSICS.Vec3(7,0,0), new PHYSICS.Vec3(-1,0,0));
  world.add(plane);
  world.add(plane_xmin);
  world.add(plane_xmax);
  world.add(plane_ymin);
  world.add(plane_ymax);

  var sphere_geometry = new THREE.SphereGeometry( 1, 8, 8);
  var sphereMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff } );
  THREE.ColorUtils.adjustHSV( sphereMaterial.color, 0, 0, 0.9 );
  var nx = 5;
  var ny = 5;
  var nz = 5;
  var rand = 0.01;
  var h = 5;
  for(var i=0; i<nx; i++){
    for(var j=0; j<ny; j++){
      for(var k=0; k<nz; k++){
	var spheremesh = new THREE.Mesh( sphere_geometry, sphereMaterial );
	spheremesh.position.set( 0, 0, 10 );
	
	if(shadowsOn){
	  spheremesh.castShadow = true;
	  spheremesh.receiveShadow = true;
	}
	scene.add( spheremesh );
	var pos = new PHYSICS.Vec3((j-nx*0.5)*2 + (Math.random()-0.5)*rand,
				   (i-ny*0.5)*2 + (Math.random()-0.5)*rand,
				   1+k*2+h+(i+j)*0.2);
	var sphere = new PHYSICS.Sphere(pos,1,5);
	spheremesh.useQuaternion = true;
	phys_bodies.push(sphere);
	phys_visuals.push(spheremesh);
	phys_startpositions.push(pos);
	world.add(sphere);
      }
    }
  }
}

var t = 0, newTime, delta;

function animate(){
  requestAnimationFrame( animate );
  updatePhysics();
  render();
  stats.update();
}

function updatePhysics(){
  // Step world
  world.step(1/60);

  // Read position data into visuals
  for(var i=0; i<phys_bodies.length; i++){
    phys_visuals[i].position.x = phys_bodies[i].position.x;
    phys_visuals[i].position.y = phys_bodies[i].position.y;
    phys_visuals[i].position.z = phys_bodies[i].position.z;

    phys_visuals[i].quaternion.x = phys_bodies[i].quaternion.x;
    phys_visuals[i].quaternion.y = phys_bodies[i].quaternion.y;
    phys_visuals[i].quaternion.z = phys_bodies[i].quaternion.z;
    phys_visuals[i].quaternion.w = phys_bodies[i].quaternion.w;
  }
}

function onDocumentMouseMove( event ) {
  mouseX = ( event.clientX - windowHalfX );
  mouseY = ( event.clientY - windowHalfY );
}

function render(){
  camera.position.x += ( mouseX/windowHalfX*300 - camera.position.x ) * 0.05;
  camera.position.z += ( - (mouseY/windowHalfY*200) - camera.position.z ) * 0.05;
  if(camera.position.z<=1.0)
    camera.position.z = 1.0;
  camera.lookAt( new THREE.Vector3(scene.position.x,scene.position.y,scene.position.z+5) );
  renderer.clear();
  renderer.render( scene, camera );
}

document.addEventListener('keypress',function(e){
    if(e.keyCode){
      switch(e.keyCode){
      case 32:
	for(var i=0; i<phys_bodies.length; i++){
	  phys_bodies[i].position.x = phys_startpositions[i].x;
	  phys_bodies[i].position.y = phys_startpositions[i].y;
	  phys_bodies[i].position.z = phys_startpositions[i].z;
	}
	break;
      case 43:
	world.iterations(world.iterations()+1);
	console.log("Number of iterations: "+world.iterations());
	break;
      case 45:
	world.iterations(world.iterations()-1);
	console.log("Number of iterations: "+world.iterations());
	break;
      case 112: // p
	world.togglepause();
	break;
      }
    }
  });