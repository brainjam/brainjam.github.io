'use strict';
let effectDiv,
	canvas,
	gl,
	buffer,
	vertex_shader,
	fragment_shader,
	currentProgram,
	vertexPositionLocation,
	texture = 0,
	textureLocation,
	parameters = {
		start_time: new Date().getTime(),
		time: 0,
		screenWidth: 0,
		screenHeight: 0,
		alpha: Math.PI / 8.0,
		beta: Math.PI / 3.0,
		even: 1
	};

const config = {
	color: "#FFFFFF",
  radius: 0.06,
  heat: 0.5,
	fade: 10,
	save: () => {
		saveImage();
	},
  domain: false,
  trails: false,
  fullscreen: false,
  addball: function(){
    addBall() ;
  },
  removeball: function(){
    balls.pop() ;
    setHeat(config.heat) ;
  },
};

function addBall(){
  const targetEnergy = config.heat ;
  const sourceEnergy = 10000*0.5*speed*speed ;
  const factor = Math.sqrt(targetEnergy/sourceEnergy) ;
  const newSpeed = factor * speed ;

  const velAngle = 8*Math.PI/20 ; 
  const velocity = new Coord(Math.cos(velAngle)*newSpeed,Math.sin(velAngle)*newSpeed) ;
  balls.push({
						color:	'#'+Math.floor(Math.random() * 16777215).toString(16).padStart(6,'0'),
						radius: config.radius,
						mass: 1,
						state:	{pos:new Coord(0.40,0),
					 					vel: velocity}
					 }) ;

}

let textureCanvas, textureCtx;

let alpha = parameters.alpha;
let beta = parameters.beta;
let lineNorm = new Coord(-Math.sin(alpha), Math.cos(alpha));
let cb = Math.cos(beta);
let sa = Math.sin(alpha);
let rho = Math.sqrt(cb * cb - sa * sa);
let center = new Coord(2 * cb / rho, 0.0);
let r = 2 * sa / rho;

let stop=false ;
let saveBurst = 0 ;

function fundamentalRegionPos(p){
	const vzero = new Coord(0, 0) ;
	const state = fundamentalRegionState({pos:p, vel:vzero}) ;
	return state.pos ;
}

function fundamentalRegionState(state) {
	let p = state.pos ;
	let v = state.vel ;
	p.x = 2 * p.x;
	p.y = 2 * p.y;
	let reflections = 0;
	for (let i = 0; i < 20; i++) {
		let flips = 0;
		let diff = new Coord(p.x - center.x, p.y - center.y);
		let len = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
		// if inside fundamental region do a final flip if necessary and break
		if (
			parameters.even &&
			dot(p, lineNorm) < 0.0 &&
			dot(p, conjugate(lineNorm)) < 0.0 &&
			len > r
		) {
			if (reflections % 2 == 1) {
				p = conjugate(p) ;
				v = conjugate(v) ;
				reflections++;
			}
			break;
		}
		if (p.y < 0) {
			p = conjugate(p) ;
			v = conjugate(v) ;
			flips++;
			reflections++;
			continue;
		}
		if (dot(p, lineNorm) > 0) {
			p = reflect(p, lineNorm);
			v = reflect(v, lineNorm);
			flips++;
			reflections++;
			continue;
		}
		if (len < r) {
			p = invert(p, center, r) ;
			v=new Coord(-v.x, v.y) ;
			flips++;
			reflections++;
			continue;
		}
		if (!flips) break;
	}
	return {pos:p, vel:v};
}

function conjugate(p){
	return new Coord(p.x, -p.y);
}

function conjugateVel(v){
  return conjugate(v) ;
}

function conjugateState(s){
  return {pos:conjugate(s.pos), vel:conjugateVel(s.vel)} ;
}

function reflect(i, n) {
	var d = dot(i, n);
	return new Coord(i.x - 2 * d * n.x, i.y - 2 * d * n.y);
}

function reflectVel(v,n){
  return reflect(v,n) ;
}

function reflectState(s, n){
  return {pos:reflect(s.pos,n), vel:reflectVel(s.vel,n)} ;
}

function invert (p, center, r){
	const diff = new Coord(p.x - center.x, p.y - center.y);
	const len = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
	const fact = r * r / (len * len);
	return new Coord(center.x + fact * diff.x, center.y + fact * diff.y);
}

function invertState(s, center, r){
  return {pos:invert(s.pos,center,r), vel:invertVel(s.vel)} ;
}

function invertVel(v, center, r){
  return new Coord(-v.x,v.y) ;
}

function dot(p, q) {
	return p.x * q.x + p.y * q.y;
}

function Coord(x, y) {
	this.x = x;
	this.y = y;
}




function saveImage() {
	// see https://stackoverflow.com/a/45789588/242848
	const link = document.createElement("a");
	draw();
	link.setAttribute("download", "hyperbolic-billiards.png");
	link.setAttribute(
		"href",
		canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
	);
	link.click();
}

init();
draw();

let balls=[ ] ;
let speed = 0.010 //0.006 ;

let velAngle = 9*Math.PI/20 ;
let velocity = new Coord(Math.cos(velAngle)*speed,Math.sin(velAngle)*speed) ;
const MAX_WEIGHT = 1000000. ;
//const movingRadius = 0.06 ;
balls.push({
						color:	'blue',
						radius: config.radius,
						mass: 1,
						state:	{pos:new Coord(0.25,0),
						vel: velocity}
					 }) ;

velAngle = 8*Math.PI/20 ;
velocity = new Coord(Math.cos(velAngle)*speed,Math.sin(velAngle)*speed) ;
balls.push({
						color:	'gray',
						radius: config.radius,
						mass: 1,
						state:	{pos:new Coord(0.40,0),
					 					vel: velocity}
					 }) ;

velAngle = 7*Math.PI/20 ;
velocity = new Coord(Math.cos(velAngle)*speed,Math.sin(velAngle)*speed) ;
balls.push({
						color:	'red',
						radius: config.radius,
						mass: 1,
						state:	{pos:new Coord(0.55,0),
						vel: velocity}
					 }) ;

let frame=0 ;
let prerun = 0 ;
let timeA = Date.now() ;
let interval = 0 ;

for (let pri=0; pri<prerun; pri++){
  updateBall() ;
}

const energyReducer = (sum, ball)=>{
  let v=ball.state.vel;
  return sum+0.5*ball.mass*dot(v,v)
}

function totalEnergy() {
  return balls.reduce(energyReducer,0) ;  
} 

function updateBall(){
  frame++ ;

  textureCtx.save();

  let line_y = 50 ;
  const spacing = 40 ;

  textureCtx.fillStyle = 'white' ;
  textureCtx.font = "30px Arial";
  textureCtx.fillText(frame,280,line_y);

  const energy = totalEnergy() ; ;
  const text = `energy=${(10000*energy).toFixed(3)}` ;
  line_y += spacing ;
  textureCtx.fillText(text,280,line_y);
  const timeText = `frame(ms)=${interval}`
  line_y += spacing ;
  textureCtx.fillText(timeText,280,line_y) ;
  const fpsText = `FPS=${(1000/interval).toFixed(0)}` ;
  line_y += spacing ;
  textureCtx.fillText(fpsText,280,line_y) ;

  textureCtx.setLineDash([5,5]);
  textureCtx.strokeStyle = 'grey' ;
  textureCtx.lineWidth=3 ;
  textureCtx.beginPath(); 
  textureCtx.moveTo(textureCanvas.width/2,
                    textureCanvas.height/2);
  textureCtx.lineTo((1 + Math.cos(alpha)) * textureCanvas.width / 2,
                    (1 - Math.sin(alpha)) * textureCanvas.height / 2);
  textureCtx.stroke();

  textureCtx.beginPath(); 
  textureCtx.moveTo(textureCanvas.width/2,
                    textureCanvas.height/2);
  textureCtx.lineTo((1 + Math.cos(alpha)) * textureCanvas.width / 2,
                    (1 + Math.sin(alpha)) * textureCanvas.height / 2);
  textureCtx.stroke();

  textureCtx.beginPath(); 
  textureCtx.arc((1 + center.x) * textureCanvas.width / 2,
                 (1 - center.y) * textureCanvas.height / 2,
                 r* textureCanvas.width / 2,
                 0,Math.PI*2,true);
  textureCtx.stroke();
  textureCtx.setLineDash([ ]);

  
  balls.forEach(ball=>{
    ball.collided = false ;
    const intervalFactor = Math.min(4,interval/32) ;
		ball.state.pos.x += ball.state.vel.x * intervalFactor ;	
		ball.state.pos.y += ball.state.vel.y * intervalFactor ;
		ball.state.pos.x /= 2 ;
		ball.state.pos.y /= 2 ;
		ball.state = fundamentalRegionState(ball.state) ;
		ball.nextVel = new Coord(ball.state.vel.x, ball.state.vel.y) ;

    let p = ball.state.pos ; 	
		let pts = [p,
							 reflect(conjugate(p),lineNorm),
							 invert(conjugate(reflect(conjugate(p),lineNorm)), center, r),
							 conjugate(reflect(p,lineNorm)),
							 invert(conjugate(conjugate(reflect(p,lineNorm))), center, r),
							 invert(conjugate(p), center, r),
              ] ;
    
    
		pts.forEach((pt,i)=>{
			const x = (1 + pt.x) * textureCanvas.width / 2;
			const y = (1 - pt.y) * textureCanvas.height / 2;
			let radius = ball.radius*textureCanvas.width/2 ;
			textureCtx.fillStyle = ball.color ;
			textureCtx.strokeStyle = ball.color ;
			textureCtx.lineWidth=0.5 ;
      let [r,g,b] = ColorStringToRGB(textureCtx.fillStyle) ;
      let rimColor = `rgb(${r/4},${g/4},${b/4})` ;
      let grd = textureCtx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0.0, "white");
      grd.addColorStop(0.5, ball.color);
      grd.addColorStop(1.0, rimColor);
      textureCtx.fillStyle = grd;

			textureCtx.beginPath() ;
			textureCtx.arc(x,y,radius,0,Math.PI*2,true);
			textureCtx.fill() ;
      textureCtx.stroke() ;
      if (false && i==0){ // debug
  		  textureCtx.beginPath() ;
  			textureCtx.arc(x,y,radius/3,0,Math.PI*2,true);
  			textureCtx.fillStyle = 'white' ;
  			textureCtx.fill() ;
  		}
		}) ;
	}) ;
	textureCtx.restore();
	
  if (prerun > 0 && frame > prerun){
    debugger ;
  }
	// handle collisions
	//https://en.wikipedia.org/wiki/Elastic_collision#Two-dimensional_collision_with_two_moving_objects
	balls.every(ball=>{
    if (ball.mass === MAX_WEIGHT || ball.collided){
      // no need to calculate velocity because these don't move
      return true ;
    }
    
    // create a list of balls to test against.  This will be all the other
    // balls and their transformations
    const balls2 = [] ;
    balls.forEach((ball2,i) => {
      if (ball2!==ball){
        balls2.push({...ball2, xform:'original', index:i}) ;
      }
      const rcState = reflectState(conjugateState(ball2.state),lineNorm) ;
      const rcBall = {...ball2, state: rcState, xform:'rc', index:i} ; 
      balls2.push(rcBall) ;
      const icrsState = invertState(conjugateState(rcBall.state), center, r) ;
      balls2.push({...ball2, state: icrsState, xform:'icrs', index:i}) ;
      
      const crState = conjugateState(reflectState(ball2.state,lineNorm)) ;
      const crBall = {...ball2, state: crState, xform:'cr', index:i} ; 
      balls2.push(crBall) ;
      const iccrState = invertState(conjugateState(crBall.state), center, r) ;
      balls2.push({...ball2, state: iccrState, xform:'iccr', index:i}) ;
      
      const icState = invertState(conjugateState(ball2.state), center, r) ;
      balls2.push({...ball2, state: icState, xform:'ic', index:i}) ;
    }) ;
    // test for collisions against the candidates
		balls2.every((ball2,i) =>{

      let dx = ball.state.pos.x - ball2.state.pos.x ;
			let dy = ball.state.pos.y - ball2.state.pos.y ;
      
      const dist = Math.sqrt(dx**2 + dy**2) ;
      const radii = ball.radius+ball2.radius ;

      const otherBall = balls[ball2.index] ;
      if (typeof otherBall === 'undefined'){
        debugger ;
      }
			if (dist < radii && otherBall.collided===false){
				// elastic collision between two balls
				let ratio = dist/radii ;
				if (prerun > 0 && frame>prerun){
          debugger ;
				}
				// normalize dpos so that velocity calculations are elastic
				let dpos = new Coord(dx/ratio,dy/ratio) ;
				
				let dvx = ball.state.vel.x - ball2.state.vel.x ;
				let dvy = ball.state.vel.y - ball2.state.vel.y ;
				let dvel = new Coord(dvx, dvy) ;
				let fact= 2*ball2.mass/(ball.mass+ball2.mass)*dot(dvel,dpos)/dot(dpos, dpos) ;
				ball.nextVel = new Coord(ball.state.vel.x - fact*dpos.x,
																ball.state.vel.y - fact*dpos.y) ;
        ball.collided = true ;
        const adjf = (1-ratio)/(ratio*2) ;
        const adjx = dx*adjf ;
        const adjy = dy*adjf ;
        if (otherBall !== ball){
          const shock = xformVel(ball2.xform, new Coord(fact*dpos.x,fact*dpos.y))
          otherBall.nextVel = new Coord(otherBall.state.vel.x + shock.x,
                                  otherBall.state.vel.y + shock.y) ;
          otherBall.collided = true ;
          // adjust ball positions so they are tangent,
          // as opposed to overlapping
          otherBall.state.pos.x -= adjx ;
          otherBall.state.pos.y -= adjy ;
               ball.state.pos.x += adjx ;
               ball.state.pos.x += adjx ;
        } else {
          const kineticEnergy1 = ball.state.vel.x**2 + ball.state.vel.y**2 ;
          const kineticEnergy2 = ball.nextVel.x**2 + ball.nextVel.y**2 ;
          const keCorrection = Math.sqrt(kineticEnergy1/kineticEnergy2) ;
          ball.nextVel.x *= keCorrection ;
          ball.nextVel.y *= keCorrection ;          
          //debugger ;
          ball.state.pos.x += 2*adjx ;
          ball.state.pos.x += 2*adjx ;
        }
				
				return false ; // break
			}
			return true ; // continue
		}) ;
    return true ;  // continue
	}) ;
	// update velocities
	balls.forEach(ball=>{
		ball.state.vel = ball.nextVel ;
	}) ;
  
  
	// draw connecting triangle
		// let pts = balls.map(ball=>{
		// 	let pt = ball.state.pos ;
		// 	return	{x: (textureCanvas.width + pt.x * textureCanvas.width) / 2,
		// 					 y: (textureCanvas.height - pt.y * textureCanvas.height) / 2} ;
		// 													 }) ;
		// pts.push(pts[0]) ;
		// textureCtx.save();
		// textureCtx.strokeStyle = 'MidnightBlue' ;
		// textureCtx.lineWidth=3 ;
		// textureCtx.beginPath() ;
		// textureCtx.moveTo(pts[0].x,pts[0].y)
		// for (let i=1; i<pts.length; i++){
		// 	textureCtx.lineTo(pts[i].x,pts[i].y)
		// }
		// textureCtx.stroke() ;
	
	// end of drawing
		textureCtx.restore();
	
}

function ColorStringToRGB(hexStr){
  debugger ;
  let hex=parseInt(hexStr.slice(1),16);
  var r = hex >> 16;
  var g = hex >> 8 & 0xFF;
  var b = hex & 0xFF;
  return [r,g,b];
}


function xformVel(type, vel){
  let state={pos:new Coord(0,0), vel:vel} ;
  switch (type){
    case 'original':
      break ;
    case 'rc': 
			state = conjugateState(reflectState(state,lineNorm)) ;
      break ;
    case 'cr': 
      state = reflectState(conjugateState(state),lineNorm) ;
      break ;
    case 'ic': 
			state = invertState(conjugateState(state), center, r) ;
      break ;
    default:
      debugger ;
      break ;
  }
  return state.vel ;
}

function fade(){
	textureCtx.save();
	textureCtx.globalAlpha = 2*config.fade/100 ;
  textureCtx.fillStyle = "rgb(230 230 255)" ;
	textureCtx.fillRect(0, 0, textureCtx.canvas.width, textureCtx.canvas.height);
	textureCtx.restore();
}

let request ; // in case we want to cancel
animate() ;

function animate() {
		fade() ;
		updateBall() ;
    draw() ;
    if (saveBurst >0){
      saveBurst-- ;
      saveImage() ;
    }
    let timeB = Date.now() ;
    interval = timeB-timeA ;
    timeA = timeB ;
  //debugger ;
    request = requestAnimationFrame(animate) ;
}

// undo management.  Uses 'Undoer' class by Sam Thorogood 
// see https://dev.to/chromiumdev/-native-undo--redo-for-the-web-3fl3

function copyCanvas(srcCanvas){
	let dupCanvas = document.createElement("canvas");
	dupCanvas.width = 512;
	dupCanvas.height = 512;
	let dupCtx = dupCanvas.getContext("2d");
	dupCtx.drawImage(srcCanvas,0,0) ;
	return dupCanvas ;
}

const initialState = {x: 1, y: 1, canvas: copyCanvas(textureCanvas) };
const undoer = new Undoer((payload) => {
	console.log(`undo payload`,payload.ctr) ;
	textureCtx.drawImage(payload.canvas, 0, 0) ;
	draw() ;
  //maze.focus();
}, initialState);

// Dat gui
const gui = new dat.GUI();

const domainController = gui.add(config,"domain").name("Show Tile") ;
const trailsController = gui.add(config,"trails").name("Trails") ;
const radiusController = gui.add(config,"radius", 0.01,.12).name("Ball Radius") ;
const heatController = gui.add(config,"heat", 0.01,1).name("Heat") ;
gui.add(config,"addball").name("Add Ball") ;
gui.add(config,"removeball").name("Remove Ball") ;
const fullscreenController = gui.add(config,"fullscreen").name("Fullscreen").listen() ;
gui.add(config, "save").name("Save Image");

//gui.close() ;

domainController.onChange(function(showDomain) {
  if (showDomain){
    textureCanvas.style.left = "-256px";
  } else {
    textureCanvas.style.left = "-520px";
  }
});

trailsController.onChange(function(trails) {
    config.fade = trails ? 1 : 10 ;
});

fullscreenController.onChange(function(fullscreen) {
  fullscreen ? document.documentElement.requestFullscreen() : document.exitFullscreen() ;
});

document.addEventListener('fullscreenchange', (event) => {
  // document.fullscreenElement will point to the element that
  // is in fullscreen mode if there is one. If there isn't one,
  // the value of the property is null.
  config.fullscreen = document.fullscreenElement ? true : false ; 
});

radiusController.onChange(function(radius) {
  balls.forEach(ball => ball.radius=radius) ;
});

heatController.onChange(heat => setHeat(heat));

function setHeat(heat){
  const targetEnergy = heat * balls.length ;
  const sourceEnergy = 10000*totalEnergy() ;
  const factor = Math.sqrt(targetEnergy/sourceEnergy) ;
  balls.forEach(ball => {
    ball.state.vel.x *= factor ;
    ball.state.vel.y *= factor ;
  }) ;
}

function init() {
	vertex_shader = document.getElementById("vs").textContent;
	fragment_shader = document.getElementById("fs").textContent;

	effectDiv = document.getElementById("effect");

	canvas = document.createElement("canvas");
	effectDiv.appendChild(canvas);
	canvas.style.position = "relative";

	// crappy initialization needs to be refactored and put somewhere else
	textureCanvas = document.createElement("canvas");
	effectDiv.appendChild(textureCanvas);
	textureCanvas.style.position = "absolute";
	textureCanvas.style.left = "-520px"; // -520
	textureCanvas.style.top = "0px";
  textureCanvas.style.border="1px solid black" ;
  textureCanvas.style.transition = "all .5s" ;
	textureCanvas.width = 512;
	textureCanvas.height = 512;
	var center = { x: textureCanvas.width / 2, y: textureCanvas.height / 2 };
	textureCtx = textureCanvas.getContext("2d");
	var lingrad = textureCtx.createLinearGradient(0, 0, 512, 512);
	lingrad.addColorStop(0, "#00c");
	lingrad.addColorStop(1, "#ccc");
	textureCtx.fillStyle = lingrad;
	//textureCtx.fillStyle = "white" ;
	textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
	
	// Initialise WebGL

	try {
		gl = canvas.getContext("webgl");
	} catch (error) {}

	if (!gl) {
		alert("WebGL not supported on this browser.");
		throw "cannot create webgl context";
	}

	//alert (gl.getParameter(gl.SHADING_LANGUAGE_VERSION))
	//alert (gl.getParameter(gl.MAX_VERTEX_ATTRIBS))

	gl.console = "console" in window ? console : { log: function() {} };

	// Create Vertex buffer (2 triangles)
	var vertices = [
		-1.0,
		-1.0,
		1.0,
		-1.0,
		-1.0,
		1.0,
		1.0,
		-1.0,
		1.0,
		1.0,
		-1.0,
		1.0
	];
	buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Create Program
	currentProgram = createProgram(vertex_shader, fragment_shader);
	// Load program into GPU
	gl.useProgram(currentProgram);

	// Set up texturing
	//gl.enable(gl.TEXTURE_2D);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	texture = 0;

	onWindowResize();
	window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize(event) {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	parameters.screenWidth = canvas.width;
	parameters.screenHeight = canvas.height;

	parameters.aspectX = canvas.width / canvas.height;
	parameters.aspectY = 1.0;

	gl.viewport(0, 0, canvas.width, canvas.height);
	draw();
}

function createProgram(vertex, fragment) {
	var program = gl.createProgram();

	var vs = createShader(vertex, gl.VERTEX_SHADER);
	var fs = createShader(
		"#ifdef GL_ES\nprecision highp float;\n#endif\n\n" + fragment,
		gl.FRAGMENT_SHADER
	);

	if (vs == null || fs == null) return null;

	gl.attachShader(program, vs);
	gl.attachShader(program, fs);

	gl.deleteShader(vs);
	gl.deleteShader(fs);

	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert(
			"ERROR:\n" +
				"VALIDATE_STATUS: " +
				gl.getProgramParameter(program, gl.VALIDATE_STATUS) +
				"\n" +
				"ERROR: " +
				gl.getError() +
				"\n\n" +
				"- Vertex Shader -\n" +
				vertex +
				"\n\n" +
				"- Fragment Shader -\n" +
				fragment
		);

		return null;
	}

	return program;
}

function createShader(src, type) {
	var shader = gl.createShader(type);

	gl.shaderSource(shader, src);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(
			(type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT") +
				" SHADER:\n" +
				gl.getShaderInfoLog(shader)
		);
		return null;
	}

	return shader;
}

var lastTime;

function setHTML(id, str) {
	var el = document.getElementById(id);
	if (el) {
		el.innerHTML = str;
	}
}

function draw() {
	if (!currentProgram) return;

	parameters.time = new Date().getTime() - parameters.start_time;

	if (lastTime) {
		setHTML("info", parameters.time - lastTime);
	}
	lastTime = parameters.time;
	
	//gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	// Get var locations

	vertexPositionLocation = gl.getAttribLocation(currentProgram, "position");
	textureLocation = gl.getUniformLocation(currentProgram, "texture");

	// Set values to program variables

	gl.uniform1f(
		gl.getUniformLocation(currentProgram, "time"),
		parameters.time / 1000
	);
	gl.uniform1f(gl.getUniformLocation(currentProgram, "alpha"), parameters.alpha);
	gl.uniform1i(gl.getUniformLocation(currentProgram, "even"), parameters.even);
	gl.uniform1f(gl.getUniformLocation(currentProgram, "beta"), parameters.beta);
	gl.uniform2f(
		gl.getUniformLocation(currentProgram, "resolution"),
		parameters.screenWidth,
		parameters.screenHeight
	);
	gl.uniform2f(
		gl.getUniformLocation(currentProgram, "aspect"),
		parameters.aspectX,
		parameters.aspectY
	);

	/*if (octahedral){
                    gl.uniform2fv( gl.getUniformLocation( currentProgram, 'repellors' ), new Float32Array(octahedral) );
                }*/

	gl.uniform1i(textureLocation, 0);
	gl.activeTexture(gl.TEXTURE0);
	if (!texture) {
		texture = gl.createTexture();
	}
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		textureCanvas
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	//gl.generateMipmap(gl.TEXTURE_2D);

	// Render geometry

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(vertexPositionLocation, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vertexPositionLocation);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.disableVertexAttribArray(vertexPositionLocation);
}