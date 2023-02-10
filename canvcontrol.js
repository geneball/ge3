
class CanvasControl{
	constructor( canvas, ctx, refresh ){
		this.canvas = canvas;
		this.ctx = ctx;
		this.refresh = refresh;
		this.cnt = 0;
		
		this.fitToContainer( );
		
		this.cameraOffset = { x: this.canvas.width/2, y: this.canvas.height/2 }
		this.cameraZoom = 1
		this.isDragging = false
		this.dragStart = { x: 0, y: 0 }
		this.initialPinchDistance = null
		this.lastZoom = this.cameraZoom
		
		this.initHandlers()
	}
	fitToContainer(){  // Make it visually fill the positioned parent
		this.canvas.style.width ='99%';
		this.canvas.style.height='99%';
		// ...then set the internal size to match
		this.canvas.width  = this.canvas.offsetWidth;
		this.canvas.height = this.canvas.offsetHeight;
	}
	draw(){
		let wd = this.canvas.width, ht = this.canvas.height;
		
		this.ctx.clearRect(-10000,-10000, 20000, 20000)
	
		// Translate to the canvas centre before zooming - so you'll always zoom on what you're looking directly at
		this.ctx.resetTransform();
		this.ctx.translate( wd / 2, ht / 2 )
		this.ctx.scale( this.cameraZoom, -this.cameraZoom)
		this.ctx.translate( -wd / 2 + this.cameraOffset.x, -ht / 2 + this.cameraOffset.y )
		
		if ( this.refresh){
			this.refresh( this.ctx );
		}
		
		requestAnimationFrame( this.draw.bind(this) )
	}
	getEventLocation(e){   // Gets the relevant location from a mouse or single touch event
		if (e.touches && e.touches.length == 1){
			return { x:e.touches[0].clientX, y: -e.touches[0].clientY }
		} else if (e.clientX && e.clientY){
			return { x: e.clientX, y: -e.clientY }        
		}
	}
	drawRect(x, y, width, height){
		this.ctx.fillRect( x, y, width, height )
	}
	drawText(text, x, y, size, font){
		this.ctx.font = `${size}px ${font}`
		this.ctx.fillText(text, x, y)
	}
	onPointerDown(e){
		this.isDragging = true
		this.dragStart.x = this.getEventLocation(e).x/this.cameraZoom - this.cameraOffset.x
		this.dragStart.y = this.getEventLocation(e).y/this.cameraZoom - this.cameraOffset.y
	}
	onPointerUp(e){
		this.isDragging = false
		this.initialPinchDistance = null
		this.lastZoom = this.cameraZoom
	}
	onPointerMove(e){
		if ( this.isDragging ){
			this.cameraOffset.x = this.getEventLocation(e).x/this.cameraZoom - this.dragStart.x
			this.cameraOffset.y = this.getEventLocation(e).y/this.cameraZoom - this.dragStart.y
		}
	}
	handleTouch(e, singleTouchHandler){
		if ( e.touches.length == 1 )    {
			singleTouchHandler( e )
		} else if (e.type == "touchmove" && e.touches.length == 2){
			isDragging = false
			handlePinch( e )
		}
	}
	handlePinch( e ){
		e.preventDefault()
    
		let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
		let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
    
		// This is distance squared, but no need for an expensive sqrt as it's only used in ratio
		let currentDistance = (touch1.x - touch2.x)**2 + (touch1.y - touch2.y)**2
    
		if ( this.initialPinchDistance == null ){
			this.initialPinchDistance = currentDistance
		} else {
			this.adjustZoom( null, currentDistance/this.initialPinchDistance )
		}
	}
	zoomToExtent( extent ){
		this.cameraOffset.x = this.canvas.width/2 - (extent.minX + extent.maxX)/2
		this.cameraOffset.y = this.canvas.height/2 - (extent.minY + extent.maxY)/2
		let zmx = this.canvas.width / ((extent.maxX - extent.minX) * 1.05)
		let zmy = this.canvas.height / ((extent.maxY - extent.minY) * 1.05)
		this.cameraZoom = Math.min( zmx, zmy )
		const MAX_ZOOM = 5
		const MIN_ZOOM = 0.1
		this.cameraZoom = Math.min( this.cameraZoom, MAX_ZOOM )
		this.cameraZoom = Math.max( this.cameraZoom, MIN_ZOOM )      
	}
	adjustZoom(zoomAmount, zoomFactor){
		const MAX_ZOOM = 5
		const MIN_ZOOM = 0.1
		if ( !this.isDragging ){
			if (zoomAmount){
				this.cameraZoom += zoomAmount
			} else if (zoomFactor){
				//console.log( `ZmF ${zoomFactor.toFixed(2)}` )
				this.cameraZoom *= zoomFactor //* this.lastZoom
			}
        
			this.cameraZoom = Math.min( this.cameraZoom, MAX_ZOOM )
			this.cameraZoom = Math.max( this.cameraZoom, MIN_ZOOM )  
			//console.log( `ZmA ${zoomAmount.toFixed(2)}` )
		}
	}
	initHandlers(){
		const SCROLL_SENSITIVITY = 0.001
		this.canvas.addEventListener('mousedown', this.onPointerDown.bind(this) )
		this.canvas.addEventListener('touchstart', (e) => this.handleTouch( e, this.onPointerDown.bind(this) ))
		this.canvas.addEventListener('mouseup', this.onPointerUp.bind(this) )
		this.canvas.addEventListener('touchend',  (e) => this.handleTouch( e, this.onPointerUp.bind(this) ))
		this.canvas.addEventListener('mousemove', this.onPointerMove.bind(this) )
		this.canvas.addEventListener('touchmove', (e) => this.handleTouch( e, this.onPointerMove.bind(this) ))
		this.canvas.addEventListener( 'wheel', (e) => this.adjustZoom( -e.deltaY*SCROLL_SENSITIVITY ))
		window.addEventListener( 'resize', this.fitToContainer.bind( this ) )
	}
}

module.exports = { CanvasControl }; 
// const { CanvasControl } = require("./canvcontrol.js");
