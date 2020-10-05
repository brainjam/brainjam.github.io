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
		alpha: Math.PI / 7.0,
		beta: Math.PI / 3.0,
		even: 1
	};

let textureCanvas, textureCtx;

const config = {
	color: "#000000",
	opacity: 1,
	radius: 3,
	clearColor: "#FFFFFF",
	clear: () => {
		clear(config.clearColor);
	},
	fullscreen: false,
	save: () => {
		saveImage();
	},
};

// Hardcoded for (2,3,7 symmetry)
// For more symmetries see
// https://www.d.umn.edu/~ddunham/umdmath09.pdf and
// https://www.d.umn.edu/~ddunham/bridges09.pdf

let alpha = parameters.alpha;
let beta = parameters.beta;
let lineNorm = new Coord(-Math.sin(alpha), Math.cos(alpha));
let cb = Math.cos(beta);
let sa = Math.sin(alpha);
let rho = Math.sqrt(cb * cb - sa * sa);
let center = new Coord(2 * cb / rho, 0.0);
let r = 2 * sa / rho;

function fundamentalRegion(p) {
	p.x = 2 * p.x;
	p.y = 2 * p.y;
	let reflections = 0;
	for (let i = 0; i < 20; i++) {
		let flips = 0;
		let diff = new Coord(p.x - center.x, p.y - center.y);
		let len = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
		if (
			parameters.even &&
			dot(p, lineNorm) < 0.0 &&
			dot(p, new Coord(lineNorm.x, -lineNorm.y)) < 0.0 &&
			len > r
		) {
			if (reflections % 2 == 1) {
				p = conjugate(p) ;
				reflections++;
			}
			break;
		}
		if (p.y < 0) {
			p = conjugate(p) ;
			flips++;
			reflections++;
			continue;
		}
		if (dot(p, lineNorm) > 0) {
			p = reflect(p, lineNorm);
			flips++;
			reflections++;
			continue;
		}
		if (len < r) {
			p = invert(p, center, r) ;
			flips++;
			reflections++;
			continue;
		}
		if (!flips) break;
	}
	return p;
}

function conjugate(p){
	return new Coord(p.x, -p.y);
}

function reflect(i, n) {
	var d = dot(i, n);
	return new Coord(i.x - 2 * d * n.x, i.y - 2 * d * n.y);
}

function invert (p, center, r){
	const diff = new Coord(p.x - center.x, p.y - center.y);
	const len = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
	const fact = r * r / (len * len);
	return new Coord(center.x + fact * diff.x, center.y + fact * diff.y);
}

function dot(p, q) {
	return p.x * q.x + p.y * q.y;
}

function Coord(x, y) {
	this.x = x;
	this.y = y;
}

let mouseDown = false;

onmousedown = function(event) {
	mouseDown = true;
	onmousemove(event);
	return false; // disable I-beam cursor on webkit
};
onmouseup = function(event) {
	mouseDown = false;
	if (event.target != canvas) {
		return;
	}
	pushUndo() ;	
};

	// take care of storing canvas state for undo
let undoCounter=0 ;
function pushUndo(){
	undoCounter++ ;
	const payload = {ctr: undoCounter,
							 		canvas: copyCanvas(textureCanvas) } 
	console.log('undo: queuing',undoCounter)
	undoer.push(payload);
}

let hue = 0;
onmousemove = function(event) {
	if (!mouseDown) {
		return;
	}
	if (event.target != canvas) {
		return;
	}
	// // for debugging, draw directly on texture canvas
	// if (event.pageX<512 && event.pageY<512 ){
	// 	textureCtx.save() ;
	// 		textureCtx.fillStyle = config.color ;
	// 		textureCtx.beginPath();
	// 		textureCtx.arc(event.pageX,event.pageY,config.radius,0,Math.PI*2,1);
	// 		textureCtx.fill();
	// 	textureCtx.restore ;
	// 	draw() ;
	// 	return ;
	// }
	let p = {};
	p.x = (2 * event.pageX - canvas.width) * parameters.aspectX / canvas.width;
	p.y = -(2 * event.pageY - canvas.height) / canvas.height;
	p = fundamentalRegion(p);
	
	// duplicate the points around the fundamental region, to create 'overpainting'
	let pts = [p,
						 reflect(conjugate(p),lineNorm),
						 conjugate(reflect(p,lineNorm)),
						 invert(conjugate(p), center, r)] ;

	// transparency is a bit of a hack.
	// A different approach at https://stackoverflow.com/a/6636105/242848
	// both have their limitations.  The present one has wabi-sabi.
	textureCtx.save();
	//console.log('forEach') ;
	textureCtx.globalAlpha = config.opacity**2;
	textureCtx.fillStyle = config.color;
	pts.forEach(pt=>{
			const x = (textureCanvas.width + pt.x * textureCanvas.width) / 2;
			const y = (textureCanvas.height - pt.y * textureCanvas.height) / 2;
			// console.log(pt) ;
			// console.log(x,y) ;
			textureCtx.beginPath();
			textureCtx.arc(x, y, config.radius, 0, Math.PI * 2);
			textureCtx.fill();
		}
	)
	textureCtx.restore();
	
	draw();
};

var zoom;

function wheel(event) {
	var delta;
	if (event.wheelDelta) delta = event.wheelDelta / 120;
	if (event.detail) delta = -event.detail / 3;
}

onmousewheel = function(event) {
	wheel(event);
};
if (addEventListener) {
	addEventListener(
		"DOMMouseScroll",
		function scroll(event) {
			wheel(event);
		},
		false
	);
}

function clear(color) {
	console.log('clearing') ;
	textureCtx.save();
	textureCtx.fillStyle = color;
	textureCtx.fillRect(0, 0, textureCtx.canvas.width, textureCtx.canvas.height);
	textureCtx.restore();
	draw();
	pushUndo() ;
}

function saveImage() {
	// see https://stackoverflow.com/a/45789588/242848
	const link = document.createElement("a");
	draw();
	link.setAttribute("download", "doodler.png");
	link.setAttribute(
		"href",
		canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
	);
	link.click();
}

init();
draw();
//setInterval( draw, 1000 / 60 );

// undo management.  Uses 'Undoer' class by Sam Thorogood 
// see https://dev.to/chromiumdev/-native-undo--redo-for-the-web-3fl3

function copyCanvas(srcCanvas){
	let dupCanvas = document.createElement("canvas");
	dupCanvas.width = srcCanvas.width;
	dupCanvas.height = srcCanvas.height;
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

gui.addColor(config, "color").name("Draw Color");
gui.add(config, "opacity", 0, 1).name("Opacity");
gui.add(config, "radius", 1, 20).name("Radius");
gui.addColor(config, "clearColor").name("Clear Color");
gui.add(config, "clear").name("Clear");
const fullscreenController = gui.add(config,"fullscreen").name("Fullscreen").listen() ;
gui.add(config, "save").name("Download Image");

fullscreenController.onChange(function(fullscreen) {
    config.fullscreen = fullscreen ;
  fullscreen ? document.documentElement.requestFullscreen() : document.exitFullscreen() ;
});

document.addEventListener('fullscreenchange', (event) => {
  // document.fullscreenElement will point to the element that
  // is in fullscreen mode if there is one. If there isn't one,
  // the value of the property is null.
  config.fullscreen = document.fullscreenElement ? true : false ; 
});

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
	textureCanvas.style.left = "-512px";
	textureCanvas.style.top = "0px";
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
	// textureCtx.strokeStyle = "red";
	// textureCtx.strokeRect(2, 2, 508, 508);
	// textureCtx.strokeStyle = "#ccc";
	// textureCtx.lineWidth = 0.3;
	// for (var i = 6; i < 512; i += 10) {
	// 	textureCtx.beginPath();
	// 	textureCtx.moveTo(i, 0);
	// 	textureCtx.lineTo(i, 512);
	// 	textureCtx.stroke();
	// 	textureCtx.beginPath();
	// 	textureCtx.moveTo(0, i);
	// 	textureCtx.lineTo(512, i);
	// 	textureCtx.stroke();
	// }
	// textureCtx.strokeStyle = "black";
	// textureCtx.beginPath();
	// textureCtx.moveTo(center.x, center.y);
	// textureCtx.lineTo(
	// 	center.x + 200 * Math.cos(Math.PI / 8),
	// 	center.y + 200 * Math.sin(Math.PI / 8)
	// );
	// textureCtx.stroke();
	// textureCtx.beginPath();
	// textureCtx.moveTo(center.x, center.y);
	// textureCtx.lineTo(
	// 	center.x + 200 * Math.cos(-Math.PI / 8),
	// 	center.y + 200 * Math.sin(-Math.PI / 8)
	// );
	// textureCtx.stroke();

	// textureCtx.fillStyle = 'red' ;
	// textureCtx.font = '32px arial' ;
	// textureCtx.fillText ('TL', 50,50) ;
	// textureCtx.fillText ('TR', 450,50) ;
	// textureCtx.fillText ('BL', 50,450) ;
	// textureCtx.fillText ('BR', 450,450) ;
	// textureCtx.font = '20px arial' ;
	// textureCtx.fillText ('DRAW!', 276,263) ;

	// end of crappy initialization

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
/*
            var octahedral =  [// type    AD   BC     A   B    C    D
                                    1,0,   0,0, 0,-1,  0,-1,  0,0, 0,0, 0,-1, 
                                    1,0,   0,0, 1,0,   -1,0,  0,0, 0,0, 1,0, 
                                    1,0,   -1,1, 0,0,   0,0, -1,0, -1,0, 0,0, 
                                    0,0,   0,0, 1,0,   0,0,   0,0, 0,0, 0,0, 
                                    ] ;
            */

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
