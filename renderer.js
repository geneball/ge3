
const { msg, statusMsg } 										= require( './msg.js'	)
const { shell } 												= require( 'electron'	)
const jetpack 													= require( 'fs-jetpack' )
const { CanvasControl } 										= require( './canvcontrol.js' )
const { SBar }													= require( './sidebar.js' )
const { gVar, gVal } 											= require( './gvar.js' )
const { Geom }												 	= require( './geom.js' )
const { HUI }													= require( './htmlui.js' )
const THREE														= require( 'three' )
const OrbitControls 											= require( './node_modules/three/examples/jsm/controls/OrbitControls.js' )

const canvas 	  = HUI.gEl( 'graphCanvas' )
canvas.style.width ='99%'
canvas.style.height='99%'
//const ctx         = canvas.getContext("2d")
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera( 75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000 )

const renderer = new THREE.WebGLRenderer( { canvas: canvas } )
renderer.setSize( canvas.offsetWidth, canvas.offsetHeight )

//const controls = new OrbitControls( camera, renderer.domElement )

const geometry = new THREE.BoxGeometry( 1, 1, 1 )
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } )
const cube = new THREE.Mesh( geometry, material )
scene.add( cube )

camera.position.z = 5

function animate() {
	requestAnimationFrame( animate )
	renderer.render( scene, camera )
}
animate()