// gvar.js 

const { msg, statusMsg } 										= require( './msg.js' )
const jetpack 													= require( 'fs-jetpack' )
const { SBar } 													= require( './sidebar.js' )
const { Geom } 													= require( './geom.js' )
const { splitTokens } 											= require( './tokens.js' )
const { HUI }													= require( './HtmlUI.js' )

const GeomExt = '.geom'
const PathsExt = '.paths'

const Drawable = 'PLCATSR'			// gVal.typ's that are drawable
const DrawPrims = 'PLCATS'			// gVal.typ's that are primitive & drawable
const PathPrims = 'LCATSR'			// val.typ's that can be part of a path

const FunctNames = [ 'List', 'Intersect', 'Split', 'Delete', 'Hide', 'AllVars', 'GroupVars', 'Path' ]
const PathEpsilon = 1

class Expr {
	static exprStack = [];
	static exprTrace = [];
	static currExpr(){
		return Expr.exprStack[0];
	}
	static evalExpr( e ){		// top level eval of expression string
		Expr.exprStack.push( e )	// save orig expression for evErr
		let tks = splitTokens( e )
		Expr.trace( `Expr: ${tks.join(' ')}` )
		
		if ( tks==[] ) return new gVal( 'V', 0 );
		let val = Expr.evExpr( tks );
		Expr.exprStack.pop();
		return val;
	}
	static evErr( s ){
		let top = Expr.exprStack[ Expr.exprStack.length-1 ];
		msg( `evalExpr(${top}) err: ${s}` );
	}
	static trace( s ){
		Expr.exprTrace.push( s )
		// msg( s );
	}
	static evExpect( tks, exp ){
		let tk = tks.shift();
		if ( tk == exp ) return;
		Expr.evErr( `expected '${exp}', got '${tk}' ` );
	}
	static evExpr( tks ){		//  ||  && 
		const ops = [ '||', '&&' ];
		let v = Expr.evRelation( tks );
		while ( ops.includes( tks[0] )){
			let op = tks.shift();
			let v2 = Expr.evRelation( tks );
			let v3 = v.evalOp( op, v2 );
			Expr.trace( `Expr: ${v} ${op} ${v2} = ${v3} [${tks}]` );
			v = v3;
		}
		return v;
	}	
	static evRelation( tks ){		// == < > <= >= 
		const ops = [ '==', '<', '>', '<=', '>=' ];
		let v = Expr.evTerm( tks );
		while ( ops.includes( tks[0] )){
			let op = tks.shift();
			let v2 = Expr.evTerm( tks );
			let v3 = v.evalOp( op, v2 );
			Expr.trace( `Expr: ${v} ${op} ${v2} = ${v3} [${tks}]` );
			v = v3;
		}
		return v;
	}
	static evTerm( tks ){		// + - &
		const ops = [ '+', '-', '&' ];
		let v = Expr.evFactor( tks );
		while ( ops.includes( tks[0] )){
			let op = tks.shift();
			let v2 = Expr.evFactor( tks );
			let v3 = v.evalOp( op, v2 );
			Expr.trace( `Expr: ${v} ${op} ${v2} = ${v3} [${tks}]` );
			v = v3;
		}
		return v;
	}	
	static evFactor( tks ){		// * / <<
		const ops = [ '*', '/', '<<' ];
		let v = Expr.evRange( tks );
		while ( ops.includes( tks[0] )){
			let op = tks.shift();
			let v2 = Expr.evRange( tks );
			let v3 = v.evalOp( op, v2 );
			Expr.trace( `Term: ${v} ${op} ${v2} = ${v3} [${tks}]` );
			v = v3;
		}
		return v;
	}
	static evRange( tks ){		//  v:v (interval) v--v (ln) |  @ . ^ !
		const ops = [ ':', '--',  '|', '@', '.', '^', '!' ];
		let v = Expr.evConditional( tks );
		while ( ops.includes( tks[0] )){
			let op = tks.shift();
			let v2 = Expr.evConditional( tks );
			let v3 = v.evalOp( op, v2 );
			Expr.trace( `Factor: ${v} ${op} ${v2} = ${v3} [${tks}]` );
			v = v3;
		}
		return v;
	}
	static evConditional( tks ){		//  'e ? e : e'
		const ops = [ '?' ];
		let v = Expr.evPrimary( tks )
		if ( tks[0]=='?' ){
			tks.shift();
			let v2 = Expr.evPrimary( tks );
			Expr.evExpect(':')
			let v3 = Expr.evPrimary( tks );
			let v4 = v.v? v2 : v3
			Expr.trace( `Conditional: ${v} ? ${v2} : ${v3} [${tks}]` )
			v = v4
		}
		return v;
	}	
	static evPrimary( tks ){		// ( ), [], prefix: - # $, name, number, _string, func()
		let tk = tks[0];
		if (tk==undefined) debugger
		let res = null;
		if ( tk=='[' ){  						// [x,y]  ( point literal )
			tks.shift();
			let x = Expr.evExpr( tks )
			Expr.evExpect( tks, ',' )
			let y = Expr.evExpr( tks )
			Expr.evExpect( tks, ']' )
			res = new gVal( 'P', [ x, y ] )
			Expr.trace( `${res}` )
		} else if ( tk=='(' ){  				// ( expr )
			tks.shift()
			let v = Expr.evExpr( tks )
			Expr.evExpect( tks, ')' )
			Expr.trace( `( ${v} )` )			
			res = v;
		} else if ( tk == '-'){   				// - expr
			tks.shift()
			let v2 = Expr.evPrimary( tks )
			let v3 = new gVal( 'V', -1 );
			res = v2.evalOp( '*', v3 );
			Expr.trace( `- ${v2}` )
		} else if ( tk == '$'){		// $V => array
			tks.shift();
			res = Expr.evPrimary( tks )
			Expr.trace( `$ ${res}` )
			let arr = []
			for (let i=0; i<res.v; i++) 
				arr.push(i)
			res = new gVal( 'R', [ arr ] )
		} else if ( tk == '#'){		// # array => length
			tks.shift();
			res = Expr.evPrimary( tks );
			Expr.trace( `# ${res}` )
			if ( res.typ == 'R' )
				res = new gVal( 'V', res.arr.length )
			else if ( res.typ == 'L' )
				res = new gVal( 'V', Geom.lineLen(res) )
			else
				Expr.evErr( `# operand not array or line:  ${res}` );
		} else if ( !isNaN( Number( tk )) ){  	// 3.1415  ( number literal )
			let v = Number( tk );
			tks.shift();
			res = new gVal( 'V', v );
			Expr.trace( `${res}` )
		} else if ( tk.substring(0,1)=='_' ){		// _field  (string literal)
			res = new gVal( 'F', tk );
			tks.shift();
			Expr.trace( `${res}` )
		} else if ( gVar.getVar( tk ) != undefined ){	// variable reference
			let gV = gVar.getVar( tk );
			tks.shift();
			gVar.curr.addDependency( gV.nm )
			res = gV.val;  // gV.eval();
			Expr.trace( `${tk} = ${res}` )
		} else if ( tks[1]=='(' && Expr.isFunction(tk) ){  // func( arg1, ... )
			let args = []
			tks.shift(); tks.shift()  
			while ( tks[0] != ')' ){
				args.push( Expr.evExpr( tks ))
				if ( tks[0]==')' ) break
				Expr.evExpect( tks, ',' )
			}
			Expr.trace( `${tk}( ${args} )` )
			if ( tk=='Path' ) 
				for ( let d of gVar.ifDependencies )
					gVar.curr.addDependency( d )
		    res = Expr.functionCall( tk, args )
		}
		if ( res==null ){
			Expr.evErr( `undef token ${tk}- set to 0` ) 
			debugger
			let gV = new gVar( tk, '0' )
			res = gV.val
		}
		return res;
	}
	static isFunction( tk ){
		return FunctNames.includes( tk )
	}
	static functionCall( tk, args ){
		switch( tk ){
			case 'List': 				return new gVal( 'R', [ args ] )
			case 'Intersect': 			return Expr.Intersect( args )
			case 'Split':				return Expr.Split( args[0], args[1] )  // pts nmsOrVars		
			case 'Delete':				return Expr.Delete( args )	// args[] are _varNms
			case 'Hide':				return Expr.Hide( args )	// args[] are _varNms
			case 'AllVars':				return gVal.toNmArray( gVar.allVars() )	
			case 'Path':				return Expr.Path( args ) 	
			case 'GroupVars': 			return gVal.toNmArray(  gVar.groupVars( gVal.asNm( args[0] ))) // arg[0] = groupname 
		}
	}
	static Intersect( gvals ){		// intersect [ gvals ] against each other
		if ( gvals instanceof Array ) 
			gvals = new gVal('R', [ gvals ])
		gvals = Geom.expandVals( gvals, 'Isct', 'LCATS' ).map( (a) => a.v )
		let arr = []
		for ( let i=0; i<gvals.length; i++ )
			for ( let j=i+1; j<gvals.length; j++ ){
				let nm = `Int${gvals[i].typ}x${gvals[j].typ}`
				Geom.addIntersections( arr, nm, gvals[i], gvals[j] )
			}		
		return new gVal( 'R', [ arr ] )
	}
	static Split( pts, tgts ){	// split tgts at pts 
		if (tgts==undefined) tgts = gVar.allVars()
		let res = []
		let tgtvals = Geom.expandVals( tgts, '', 'LCATS' )
		for ( let nmval of tgtvals )
			res = res.concat( gVar.splitAt( pts, nmval.nm ))
		return new gVal('R', [ res ])
	}
	static Delete( nms ){		// delete [ _gvarNms ] 	
		let nmvals = Geom.expandVals( nms, '', 'F' )	// [ { nm: nm, v: val } ] of Fields
		for ( let nv of nmvals ){
			nv.v.deleteVar()
		}
		return new gVal('V', 1)
	}
	static Hide( nms ){		// hide [ gvals ] 	
		let nmvals = Geom.expandVals( nms, '', 'PLCATS' )	// [ { nm: nm, v: val } ] of gvals
		for ( let nv of nmvals ){
			nv.v.hide()
		}
		return new gVal('V', 1)
	}
	static Path( args ){
		let nm = args[0]
		if ( nm.typ!='F' ){ 
			Expr.evErr('Path argument must be varnm, not ${nm}') 
			return []
		}
		let nval = gVar.getVal( nm.fld )
		if (nval==undefined) debugger
		let pts = nval.endPts()
		let stp = { nm: nm.fld, v: nval, s: pts[0], e: pts[1] }
		let steps = [], nms = [ ]
		while ( true ){
			//console.log( `${stp.nm} [${stp.s.x.toFixed(1)},${stp.s.y.toFixed(1)}] ${stp.v.typ} [${stp.e.x.toFixed(1)},${stp.e.y.toFixed(1)}]` )
		
			nms.push( stp.nm )
			steps.push( stp )
			
			let nxts = gVar.pathNext( stp )
			if ( nxts.length == 0 ) 
				break		// path doesn't continue
			else if ( nxts.length > 1 ){ 
				// path branches
				stp = nxts[ 0 ]
				for (let n of nxts)
					if (n.nm!=stp.nm) console.log( `Path not taken: ${n.nm}` )
				
			} else {
				stp = nxts[0]
				if ( stp.nm == nms[0] ) break	// path back to start
			}
			for (let s of steps)	// DEBUG
				if ( s.nm==stp.nm ){
					console.log( `Path dup exit` )
					return new gVal( 'R', [ nms ] )
				}
		}
		return new gVal( 'E', [ nms ] )
	}
}

// gVal static consts
const typs = [ 'V', 'P', 'L', 'I', 'C', 'A', 'T', 'S', 'F', 'R', 'E' ];
const fields = {	// specifies field name/type/default, & order of fields in array
	V: [ ['v', 'N'] ],
	P: [ ['x', 'N'], ['y', 'N'] ],
	L: [ ['p1', 'P'], ['p2', 'P'] ],
	I: [ ['s', 'N'], ['e', 'N'] ],
	C: [ ['c', 'P'], ['r', 'N'] ],
	A: [ ['c', 'C'], ['ang', 'I'], [ 'ccw', 'N', 1 ] ],
	T: [ ['ln1', 'L'], ['p3', 'P'] ],
	S: [ ['t', 'T'], ['r', 'N'] ],
	F: [ ['fld', 'F'] ],
	R: [ ['arr', 'R' ]],	// R array
	E: [ ['nms', 'E' ]]		// E path edges
}
const gvalFlds = {  // specifies field names&types in gVal
	V: [ ['v', 'N'] ],
	P: [ ['x', 'N'], ['y', 'N'] ],
	L: [ ['p1', 'P'], ['p2', 'P'] ],
	I: [ ['s', 'N'], ['e', 'N'] ],
	C: [ ['c', 'P'], ['r', 'N'] ],
	A: [ ['c', 'C'], ['ang', 'I'], ['ccw', 'N']],
	T: [ ['ln1', 'L'], ['ln2', 'L'] ],
	S: [ ['t', 'T'], ['arc', 'A'] ],
	F: [ ['fld', 'F' ]],
	R: [ ['arr', 'R' ]],	// R array
	E: [ ['nms', 'E' ]]		// E path edges
}

class gVal {
	static asGVal( v ){		// convert number to gVal('V')
		if ( v instanceof gVal ) return v
		return new gVal( 'V', v )
	}
	static asNm( v ){
		if ( v instanceof gVal && v.typ=='F' ) return v.fld
		gVal.gErr( `name expected: ${v}` )
		debugger
	}
	static toNmArray( nms ){
		let arr = []
		for ( let n of nms ){
			if ( typeof n != 'string' ) debugger
			arr.push( new gVal('F', [ n ] ))
		}
		return new gVal('R', [ arr ] )
	}
	static Typ( v ){
		if ( v instanceof gVal ) return v.typ
		if ( typeof v == 'number' ) return 'V'
		debugger
	}
	/* geometric values:
	//  V:  '4'						V(v)     	{ typ:'V', v: 4 }
	//  P:	'[3,2]'					P(x,y)   	{ typ:'P', x: 3, y: 2 }
	//  L:  '[0,0]--[4,5]'  		L(p1,p2) 	{ typ:'L', p1:P(), p2:P() }
	//  I:  '0:10'					I(s,e)   	{ typ:'I', s: 0, e: 10 }
	//  C:  '[0,0]*5' 				C(c,r)   	{ typ:'C', c:P(), r: 5 }
	//  A:  '[0,1]*7(20:240)'		A(cir,ivl)	{ typ:'A', c:C(), ang:I() }
	//  T:  '[0,0]-:[5,5]:-[9:5]'   T(ln,p3)	{ typ:'T', ln1:L(), ln2:L()}
	//  S:  '[0,0]-:[5,5]:-[9:5]*4' S(T,r) 		{ typ:'S', T(), r:4 } */
    constructor( typ, val ){	// ('T', [])
        this.typ = typ;
		if ( !typs.includes( typ )) this.gErr( `invalid typ ${typ}` );
		if (val==undefined || val==null) this.gErr( `invalid value ${val}` );
		if ( val instanceof gVal ) // clone
			this.fromGVal( typ, val );
		else if ( Array.isArray( val ))
			this.fromArr( typ, val );
		else if (typ=='F')
			this.fld = val.substring(1)
		else if (typ=='V') // val can be just number if typ=='V'
			this.v = Number(val);
		this.vis = true
    }
    fromGVal( typ, val ){   // set fields from another gVal (clone)
		if ( val.typ != typ ){
			this.gErr( `fromVal not ${typ}: ${val}` );
		}
		for (let fv of gvalFlds[typ]){
			let f = fv[0], t = fv[1];
			let v = val[f];
			if ( v == undefined ){
				this.gErr( `fromVal field ${f} not defined` );
			} else if (t=='N'){
				if ( isNaN(Number(v))) this.gErr( `fromVal field ${f} not a number ${v}` );
				this[f] = v;
			} else {
				this[f] = new gVal( t, v );
			}
		}
	}
	fromArr( typ, val ){	// set fields from array of values
		for (let i = 0; i<fields[typ].length; i++){
			let fv = fields[typ][i]
			let fnm = fv[0], ftyp = fv[1], def = fv[2]
			if ( val[i]==undefined && def!=undefined )
				val[i]=def
			if ( val[i] == undefined )
				this.gErr( `fromArr val[${i}] (${f}) not defined` );
			if ( ftyp == 'N' )
				this[fnm] = Number( val[i] )
			else if ( ftyp == 'R' || ftyp == 'F' || ftyp == 'E' )
				this[fnm] = val[i]		// array or field value
			else
				this[fnm] = new gVal(ftyp, val[i])
		}
		if (typ=='A') 
			this.normArc() // Arc ang:  -180 <= sa < ea < 180 CCW

		if (typ=='T'){ // convert p3 to ln2
			this.ln2 = new gVal('L', [ this.ln1.p2, this.p3 ])
			delete this.p3
		}
		if (typ=='S'){ // trim ln1 & ln2 to ends of arc & add .arc
			Geom.defineSpline( this )	// adds .arc
		}
	}
	normArc(){	// ensure -180 <= s.a < s.e <= 180
		let sa = this.ang.s, ea = this.ang.e, ccw = this.ccw
		sa = sa < -180? sa+360 : ( sa > 180? sa-360 : sa )
		ea = ea < -180? ea+360 : ( ea > 180? ea-360 : ea )
		if ( sa > ea ){
			[ sa, ea ] = [ ea, sa ]
			ccw = !ccw
		}
		this.ang.s = sa
		this.ang.e = ea
		this.ccw = ccw
	} 
	endPts(){
		switch ( this.typ ){
			case 'L':  return [ this.p1, this.p2 ]
			case 'C':  return [ Geom.circlePt(this, 0), Geom.circlePt(this, 360) ]
			case 'A':  return [ Geom.circlePt(this.c, this.ang.s), Geom.circlePt(this.c, this.ang.e) ]
			case 'T':  
			case 'S':  return [ this.ln1.p1, this.ln2.p2 ]
			default:   return []
		}
	}
	stepPts( startpt ){	// => [ startpt, ... endpt ] pts on gval
		let ends = this.endPts(), res = []
		if ( startpt == undefined ){
			startpt = ends[0]
			res.push( ends[0] )
		}
		let swap = !Geom.firstPtCloser( startpt, ends )
		if ( swap )
			ends = [ ends[1], ends[0] ]
		switch ( this.typ ){
			case 'L':  res.push( ends[1] ); return res
			case 'A':
			case 'C':  return res.concat( Geom.arcPts( this, startpt ))

			case 'T':
			case 'S':
				let t = this.typ=='T'? this : this.t
				let	ln1= t.ln1, ln2 = t.ln2
				if (swap) [ ln1, ln2 ] = [ ln2, ln1 ] 
				res = res.concat( ln1.stepPts( startpt ))
				if ( this.typ=='S' )
					res = res.concat( Geom.arcPts( this.a, res[ res.length-1 ] ))
				return res.concat( ln2.stepPts( res[ res.length-1] ))

			default:   return []
		}
	}
	getField( fld ){		// return field of gval 
	  if ( typeof fld != 'string' ) 
		  gErr( `getField: ${fld} not a string` )
	  let flds = gvalFlds[ this.typ ]
	  for ( let f of flds ){
		  if ( f[0]==fld ) return this[ fld ]
	  }
	  gErr( `getField: ${fld} not found` )
	}
	crossLine( ln, val ){   // return perpindicular unit guide line at p1+val*[p2-p1]
		let dx= ln.p2.x-ln.p1.x, dy= ln.p2.y - ln.p1.y;
		let len = Math.sqrt( dx*dx + dy*dy ), f = val.v/len;
		let cpt = { x: ln.p1.x + dx*f, y: ln.p1.y + dy*f };
		let p1 = new gVal( 'P', [ cpt.x, cpt.y ]);
		let p2 = new gVal( 'P', [ cpt.x - dy/len, cpt.y + dx/len ]);
		return new gVal( 'L', [ p1, p2 ] );
	}
	radialLine( pt, val ){	// return radial unit line from pt at angle 'val' degrees
		let rad = val.v * Math.PI/180;
		let p2 = new gVal( 'P', [ pt.x + Math.cos(rad), pt.y + Math.sin(rad) ] );
		return new gVal( 'L', [ pt, p2 ] ); 
	}
	extendLine( ln, ivl ){	// return line (as [0:1]) extended to [s:e] 
		let dx = ln.p2.x - ln.p1.x, dy = ln.p2.y - ln.p1.y;
		let len = Math.sqrt( dx*dx + dy*dy );
		let p1 = new gVal( 'P', [ ln.p1.x + ivl.s * dx/len, ln.p1.y + ivl.s* dy/len ] );
		if ( ivl.e == ivl.s ) return p1
		
		let p2 = new gVal( 'P', [ ln.p1.x + ivl.e * dx/len, ln.p1.y + ivl.e * dy/len ] );
		return new gVal( 'L', [ p1, p2 ] ); 
	}
	hide( nm ){				// mark gVal as Hidden & update gvar if in sidebar
		this.vis = false
		let bang = nm.indexOf('!')
		if ( bang > 0 ){
			let gvr = gVar.getVar( nm.substring(0,bang)), anyVis = false
			for ( let el of gvr.val.arr )
				if ( el.vis ){ anyVis = true; break }
			if ( !anyVis ) // last R element is hidden-- mark array as hidden too
				gvr.val.vis = false
		}
		SBar.updateVar( nm )
	}
	pathNextSteps( stp, nm ){	// return next stps [ {nm: v: s: e: } ] that connect to stp
		let res = []
		if ( !this.vis ) return res
		
		if (this.typ=='R'){
			for ( let i=0; i<this.arr.length; i++ ){
				if ( ! ( this.arr[i] instanceof gVal )) return res      // because paths
				res = res.concat( this.arr[i].pathNextSteps( stp, `${nm}!${i}` ))
			}
		} else if ( PathPrims.includes( this.typ ) && this.vis && nm != stp.nm ){
			let ends = this.endPts()
			if ( ends.length==2 ){
				let dist0 = Geom.distToPoint( stp.e, ends[0].x, ends[0].y )
				let dist1 = Geom.distToPoint( stp.e, ends[1].x, ends[1].y )
				if ( dist0 < PathEpsilon ) 
					res.push( { nm: nm, v: this, s: ends[0], e: ends[1] } )
				else if (dist0 < 2*PathEpsilon) 
					console.log( `pNStep ${nm} dist0=${dist0.toFixed(2)}` ) 
				if ( dist1 < PathEpsilon ) 
					res.push( { nm: nm, v: this, s: ends[1], e: ends[0] } )
				else if (dist1 < 2*PathEpsilon) 
					console.log( `pNStep ${nm} dist1=${dist1.toFixed(2)}` ) 
			}
		}
		return res
	}
	evalOp( op, a2 ){		// return (this op a2), if defined
		if (!(a2 instanceof gVal)) this.gErr( `evalOp ${a2} not gVal` );
		let res;
		if ( this.typ=='R' ){
			if ( a2.typ=='R' )
				res = this.arrOpArr( op, a2 )	// R op R
			else  
				res = this.arrOpVal( op, a2 )	// R op x
		} else if ( a2.typ=='R'){
			res = this.valOpArr( op, a2 )		// x op R
		} else {
			let optype = this.typ + op + a2.typ;
			switch( optype ){
				case 'F!V':	  this.fld += `!${a2.v}`; res = this; break

				case 'V||V':  res = new gVal( 'V', (this.v!=0 || a2.v!=0)? 1:0 ); break
				case 'V&V':   res = new gVal( 'V', this.v & a2.v ); break
				case 'V<<V':  res = new gVal( 'V', this.v << a2.v ); break
				case 'V&&V':  res = new gVal( 'V', (this.v!=0 && a2.v!=0)? 1:0 ); break
				case 'V==V':  res = new gVal( 'V', this.v == a2.v? 1:0 ); break
				case 'V<=V':  res = new gVal( 'V', this.v <= a2.v? 1:0 ); break
				case 'V>=V':  res = new gVal( 'V', this.v >= a2.v? 1:0 ); break
				case 'V<V':  res = new gVal( 'V', this.v < a2.v? 1:0 ); break
				case 'V>V':  res = new gVal( 'V', this.v > a2.v? 1:0 ); break
				case 'V+V':   res = new gVal( 'V', this.v + a2.v ); break
				case 'V-V':   res = new gVal( 'V', this.v - a2.v );  break
				case 'V*V':   res = new gVal( 'V', this.v * a2.v );  break
				case 'V/V':   res = new gVal( 'V', this.v / a2.v );  break
				case 'V:V':   res = new gVal( 'I', [ this.v, a2.v ]); break
				case 'V^V':   res = new gVal( 'V', (this.v & (1<<a2.v)) != 0 ); break
				case 'P+P':   res = new gVal( 'P', [ this.x + a2.x, this.y + a2.y ]); break
				case 'P-P':   res = new gVal( 'P', [ this.x - a2.x, this.y - a2.y ]); break			
				case 'P--P':  res = new gVal( 'L', [ this, a2 ]); 	break
				case 'P^V':   res = new gVal( 'C', [ this, a2 ]); 	break
				case 'P*V':   res = new gVal( 'P', [ this.x * a2.v, this.y * a2.v ]); 	break
				case 'P@V':   res = this.radialLine( this, a2 );	break
				case 'L--P':  res = new gVal( 'T', [ this, a2 ]); 	break
				case 'L|V':   res = this.crossLine( this, a2); 		break 
				case 'L*I':   res = this.extendLine( this, a2 ); 	break
				case 'C*I':   res = new gVal( 'A', [ this, a2, true ]); 	break
				case 'C/I':   res = new gVal( 'A', [ this, a2, false ]); 	break
				case 'T^V':   res = new gVal( 'S', [ this, a2 ]); 	break
				case 'I+V':   res = new gVal( 'I', [ this.s + a2.v, this.e + a2.v ]);  break
				case 'I-V':   res = new gVal( 'I', [ this.s - a2.v, this.e - a2.v ]);  break
				case 'I*V':   res = new gVal( 'I', [ this.s * a2.v, this.e * a2.v ]);  break
				case 'I/V':   res = new gVal( 'I', [ this.s / a2.v, this.e / a2.v ]);  break

				case 'P.F':
				case 'L.F':
				case 'C.F':
				case 'T.F':
				case 'S.F':	  res = this.getField( a2.fld ); break
				
				default: this.gErr( `NYI: ${this.typ} ${op} ${a2.typ} (${this} ${op} ${a2})  ${Expr.currExpr()}` ); 
			}
			Expr.trace( `${optype}: ${this} ${op} ${a2} = ${res}` );
		}
		return res;
	}
	arrOpVal( op, a2 ){		// array op value
		if (op=='!' && a2.typ=='V'){  // array indexing
			return gVal.asGVal( this.arr[ Math.trunc(a2.v) ] )		
		}
		let arr = []
		for ( let el of this.arr ){
			el = gVal.asGVal( el )
			arr.push( el.evalOp( op, a2 ))
		}
		Expr.trace( `R.${gVal.Typ(this.arr[0])}*${this.arr.length} ${op} ${a2.typ} =  R.${gVal.Typ(arr[0])}*${arr.length}` );
		return new gVal( 'R', [ arr ] )
	}
	arrOpArr( op, a2 ){		// array op array
		let arr = []
		if ( this.arr.length != a2.arr.length )
			gErr( `mismatched arrays: ${this} ${op} ${a2}` )
		for ( let i=0; i<this.arr.length; i++ ){
			let opnd1 = gVal.asGVal( this.arr[i] )
			let opnd2 = gVal.asGVal( a2.arr[i] )
			arr.push( opnd1.evalOp( op, opnd2 ) )
		}
		Expr.trace( `R.${gVal.Typ(this.arr[0])}*${this.arr.length} ${op} R.${gVal.Typ(a2.arr[0])} =  R.${gVal.Typ(arr[0])}*${arr.length}` );
		return new gVal( 'R', [ arr ] )
	}
	valOpArr( op, a2 ){		// value op array
		let arr = []
		for ( let el of a2.arr ){
			el = gVal.asGVal( el )
			arr.push( this.evalOp( op, el ))
		}
		Expr.trace( `${this.typ} ${op} R.${gVal.Typ(a2.arr[0])} =  R.${gVal.Typ(arr[0])}*${arr.length}` );
		return new gVal( 'R', [ arr ] )
	}
	draw( ctx, style, extent ){		// draw gVal on 'ctx' in 'style' & update 'extent'
		ctx.strokeStyle = style
		// switch( style ){
			// case 'S': 	ctx.strokeStyle = "rgb(250,60,60)"; break
			// case 'G':   ctx.strokeStyle = "rgb(160,160,250)"; break
			// default:	ctx.strokeStyle = "rgb(0,0,0)"; break
		// }
		ctx.beginPath()
		switch ( this.typ ){
			case 'V':   break
			case 'P':   this.drawPt( ctx, this, extent ) 
						break
			case 'L':   this.mvTo( ctx, this.p1, extent ); this.lnTo( ctx, this.p2, extent ) 
						break
			case 'I':   break
			case 'C':   this.drArc( ctx, this, 0, 360, 0, extent ) 
						break
			case 'A':   this.drArc( ctx, this.c, this.ang.s, this.ang.e, this.ccw, extent)
						break
			case 'T':  	this.mvTo( ctx, this.ln1.p1, extent ) 
						this.lnTo( ctx, this.ln1.p2, extent )
						this.lnTo( ctx, this.ln2.p2, extent )
						break
			case 'S':   this.mvTo( ctx, this.t.ln1.p1, extent )
						this.lnTo( ctx, this.t.ln1.p2, extent )
						let arc = this.arc, cir = arc.c, ang = arc.ang
						this.drArc( ctx, cir, ang.s, ang.e, arc.ccw, extent )
						//this.arcTo( ctx, this.t.ln1.p2.x, this.t.ln1.p2.y, this.t.ln2.p1.x, this.t.ln2.p1.y, this.r, extent )
						this.lnTo( ctx, this.t.ln2.p2, extent  )
						break
		}
		ctx.stroke()
	}
	drawPt( ctx, pt, ext ){	
		let x = pt.x, y = pt.y
		ctx.moveTo( x-3, y-3 ); ctx.lineTo( x+3, y+3 ); 
		ctx.moveTo( x-3, y+3 ); ctx.lineTo( x+3, y-3 ); 
		Geom.addExtent( ext, [x,y] )
	}
	mvTo(ctx, pt, ext){
		Geom.addExtent( ext, [pt.x, pt.y] )
		ctx.moveTo( pt.x, pt.y )
	}
	lnTo(ctx, pt, ext){
		Geom.addExtent( ext, [pt.x, pt.y] )
		ctx.lineTo( pt.x, pt.y )
	}
	drArc( ctx, cir, sa,ea, ccw, ext){
		const dToR = Math.PI/180
		let sr = sa * dToR, er = ea * dToR, pts
		let cpt = cir.c, r = cir.r
		ctx.arc( cpt.x, cpt.y, r, sr,er, ccw==0 )

		if (sa==0 && ea==360){
			pts = [ [cpt.x-r, cpt.y-r], [cpt.x+r,cpt.y+r] ]
		} else {
			pts = [ Geom.circPt(cir, sa), Geom.circPt(cir, ea) ]
			let stp = ccw? (ea-sa)/6 : -(360-(ea-sa))/6, a = sa
			for (let i=1; i<4; i++){
				a += stp
				pts.push( Geom.circPt( cir, a ))
			}
		}
		Geom.addExtent( ext, pts )
	}
	toString(){		// return string of calculated value
		switch (this.typ){
			case 'V':  
				if (this.v==undefined) debugger;
				return `${HUI.S(this.v)}`; 
			case 'P':  
				if (this.x==undefined || this.y==undefined) debugger;			
				return `[${HUI.S(this.x)},${HUI.S(this.y)}]`;	
			case 'L':
				if (this.p1==undefined || this.p2==undefined) debugger;			
				return `${this.p1}--${this.p2}`;	
			case 'I':
				if (this.s==undefined || this.e==undefined) debugger;			
				return `(${HUI.S(this.s)}:${HUI.S(this.e)})`;
			case 'C':
				if (this.c==undefined || this.r==undefined) debugger;			
				return `${this.c}^${HUI.S(this.r)}`;	
			case 'A': 
				if (this.c==undefined || this.ang==undefined) debugger;			
				return `${this.c.c}*${HUI.S(this.c.r)}${this.ccw?'*':'/'}${this.ang}`;	
			case 'T': 
				if (this.ln1==undefined || this.ln2==undefined) debugger;			
				return `${this.ln1.p1}--${this.ln1.p2}:-${this.ln2.p2}`;
			case 'S': 
				if (this.t==undefined || this.r==undefined) debugger;			
				return `${this.t.ln1}; ${this.t.ln2}; ${this.arc}`;
			case 'F':
				return this.fld
			case 'R':
				let els = ''
				for ( let el of this.arr )
					els += ` ${el.toString()}`
				return `[${els} ]`
			case 'E':
				let nms = ''
				for (let n of this.nms )
					nms += ` ${n}`
				return `Path[${nms} ]`
				
			default:	
				this.gErr( `invalid typ '${this.typ}` ); break;
		}
	}
	gErr( s ){
		msg( `gVal: ${s}` );
		debugger;
	}		
}


class gVar {
	static varCnt = 0
	static glStore = {}
	static glStoreNm = 'geom'
	static drawn = []
	static hitpt = []   // [x,y] of last hit test
	static hits = [] 	// array of [ nm, dist ] from last hit test
	static Parms = {	// algorithm parameters that can be overrided by gVars
		// chordLen: 5  length of arc chords in .paths
		// ptFix: 2	    #decimals of .paths pts
	}
	static ifDependencies = []  // list of vars that ifClauses depend on
	static context = null
	static extent
	static context
	static varGroups = {}
	static currGroup = 'Defs'
	static script = []
	static scriptPos 
	
	constructor( nm, def, grp, sty, cmt ){
		gVar.varCnt++
		if (nm==undefined || nm=='') nm = `var${gVar.varCnt}`
		if (grp==undefined) grp = 'Defs'
		if (sty==undefined) sty = 'V'
		if (typeof sty =='string') sty = sty.split(',')
		
		let dup = ''
		while ( gVar.getVar(nm+dup) != undefined ) dup++
		nm = nm + dup
		this.nm = nm
		this.grp = grp
		if ( '0123456789'.indexOf(nm.substring(0,1))>=0) debugger
		this.def = def==undefined? '0' : String(def)
		
		gVar.glStore[nm] = this
		this.styles = sty
		this.cmt = cmt
		this.eval()
		if (this.grp != '') 
			SBar.addVar( this, this.grp )
	}
	update( def, sty ){
		this.def = def
		this.styles = sty.split(',')
		this.eval()
	}
	deleteVar(){
		msg( `deleted ${this.nm}` )
		delete gVar.glStore[ this.nm ]
		SBar.removeVar( this )
	}
	setStyle( sty, enable, idx ){
		if (idx!=undefined) sty += idx
		
		if (enable && !this.styles.includes(sty)) 
			this.toggleStyle( sty );
				   
		if (!enable && this.styles.includes(sty))
			this.toggleStyle( sty );
	}
	toggleStyle( sty ){
		let idx = this.styles.indexOf( sty );
		if ( idx < 0 )
			this.styles.push( sty );
		else
			this.styles.splice( idx, 1 );
	}
	drawStyle( grpnm ){	// => color based on grp.color && style='V','S', 'G'
		let g  = gVar.varGroups[ grpnm ]
		if (!g.show) return 'hide'
		let clr = g==undefined? 'black' : g.color
		if (clr==undefined ) clr = 'black'
		if (this.styles.includes('G')) clr = 'blue'		// guide lines
		
		// for ( let sty of this.styles ){
			// if ( sty.startsWith('S')){
				// if ( sty=='S' ) 
					// clr = 'red'  // selected var 
			//	else 
			//		this.selectedEls.push(
			// }	
		// }
		return clr
	}
	visible(){
		if ( !this.styles.includes( 'V' )) return false;
		if ( this.styles.includes('G') ) return HUI.gEl('showGuide').checked
		return true
	}
	static updateGroups(){  // show color for displayable groups => F, if nothing displayable
		let pathsVisible = false
		for (let grp of gVar.allGroups()){
			let vgrp = gVar.varGroups[grp]
			vgrp.showcolor = false
			if ( gVar.varGroups[grp].show ){	// group is enabled
				for (let vnm of gVar.groupVars( grp )){		// if group has a displayable (non-guide) var
					let gv = gVar.getVar( vnm )
					if ( !gv.styles.includes('G') ){
						if ( gv.val.typ=='E' ) 
							pathsVisible = true
						if ( DrawPrims.includes( gv.val.typ ))
							vgrp.showcolor = true
						if ( gv.val.typ=='R' && DrawPrims.includes( gv.val.arr[0].typ )) 
							vgrp.showcolor = true 
					}
				}
			}
			SBar.showGroupColor( grp, vgrp.showcolor )
		}
		return pathsVisible
	}
	static pathNext( stp ){ // stp={ nm: v:gval s: pt e: pt }  => gvals connecting at e:
		let res = []
		let allV = gVar.allVars()
		for (let nm of allV){
			let gVr = gVar.getVar(nm)
			if ( gVr.grp!='' && gVar.varGroups[ gVr.grp ]==undefined) debugger
			if ( !gVr.styles.includes('G') && gVr.grp!='' && gVar.varGroups[ gVr.grp ].show ){
				let val = gVr.val
				if ( val && val.vis && PathPrims.includes( val.typ ))
					res = res.concat( val.pathNextSteps( stp, nm ) )
			}
		}
		return res
	}
	static subname( nm, ext ){
		return nm.replace('!','_') + ext
	}
	static splitLine( pts, val, nm ){		// split 'val' with 'nm' at [pts]
		if ( !val.vis ) return []
		const Eps = 0.01
		pts = Geom.expandVals( pts, '', 'P' )
		pts = Geom.ptsOnLine( val, pts )	// [ { t:, pt: } ] of only pts on line, by t
		let lns = []
		for ( let i=0; i<=pts.length; i++ ){	// p1--pts[0], pts[0]--pts[1], ... pts[-1]--p2
			let [ p1, t1 ] = i==0? [ val.p1, 0 ] : [ pts[i-1].pt, pts[i-1].t ] 
			let [ p2, t2 ] = i==pts.length? [ val.p2, 1 ] : [ pts[i].pt, pts[i].t ] 
			lns.push( gVar.addVar( 'splLn', nm,`p${i}`, `${p1}--${p2}`, t1, t2 ))
		}
		val.hide( nm )	// original becomes invisible
	    return lns
	}
	static addVar( str, nm,ext, def, p1, p2 ){	// create  gVar(nm+ext) & return gVal('F', nm+ext)
		let gv = new gVar( gVar.subname(nm, ext), def, 'Parts' )
		let desc = ''
		switch ( gv.val.typ ){
			case 'A':	desc = Geom.showArc(gv.nm, gv.val); break
			case 'L':	desc = Geom.showLine(gv.nm, p1, p2, gv.val); break
			default: debugger
		}
		//console.log( `${str} ${nm} ${desc}` )
		return new gVal( 'F', [ gv.nm ] ) 
	}
	static splitArc( pts, val, nm ){
		if ( !val.vis ) return []
		const Eps = 0.01
		let isarc = val.typ=='A'
		let cir = isarc? val.c : val
		let ctr = cir.c, rad = cir.r
		let cdef = Geom.toCirDef( ctr, rad )
		pts = Geom.expandVals( pts, '', 'P' )
		pts = Geom.ptsOnArc( val, pts )
		let arcs = []
		if ( pts.length==0 ) return arcs
		let angs = [], ccw = true, s = 'splCir'
		if ( isarc ){ 
			angs.push( val.ang.s )
			ccw = val.ccw
			s = `splArc ${val.ang.s.toFixed(1)}.${ccw? '>':'<'}.${val.ang.e.toFixed(1)}`
		}
		for ( let p of pts ) angs.push( p.a )
		if ( isarc )
			angs.push( val.ang.e )
		else{
			if ( pts.length==1 ) angs.push( pts[0].a+180 )
			angs.push( pts[0].a+360 )
		}
		let adef = cdef + (ccw?'*':'/')
		for ( let i=0; i < angs.length-1; i++ ){
			arcs.push( gVar.addVar( s, nm, `p${i}`, adef +  Geom.toAngIvlDef(angs[i], angs[i+1] ) ))
		}
		val.hide( nm )	// original becomes invisible
		return arcs
	}
	static splitTurn( pts, val, nm ){
		let lns = [ val.ln1, val.ln2 ]
		pts = Geom.expandVals( pts, '', 'P' )
		for ( let pt of pts ){
			let nlns = []
			for ( let ln of lns ){
				if ( Geom.isOnLine( ln, pt.p ))
					nlns = nlns.concat( gVar.splitLine(pt.p, ln.val, nm ) )
			}
			lns = nlns
		}
		return lns
	}
	static splitSpline( pts, val, nm ){
		let lns = gVar.splitTurn( pts, val.t, nm ) 
		lns = lns.concat( gVar.splitArc( pts, val.arc, nm ))
		return lns
	}
	static splitAt( pts, nm ){
		//this.eval()
		let val = gVar.getVal( nm )
		switch ( val.typ ){
			case 'L': return gVar.splitLine( pts, val, nm );
			case 'C': 
			case 'A': return gVar.splitArc( pts, val, nm );  // both 'C' & 'A'
			case 'T': return gVar.splitTurn( pts, val, nm ); 
			case 'S': return gVar.splitSpline( pts, val, nm ); 
			default:  msg( `can't split typ ${val.typ}` )
		}
	}
	addDependency( nm ){
		if ( !this.dependsOn.includes(nm) )
			this.dependsOn.push( nm )
	}
	static getVal( nm ){
		if ( nm instanceof gVal && nm.typ=='F' ) nm = nm.fld
		let [ gvnm, idx ] = gVar.nmIdx( nm )
		let gvar = gVar.getVar( gvnm )
		if (gvar==undefined) debugger
		if ( idx!=undefined && gvar.val.typ=='R' )
			return gvar.val.arr[idx]
		if (gvar==undefined) return gvar
		return gvar.val
	}
	getVal( nm ){
		let [ gvnm, idx ] = gVar.nmIdx( nm )
		if ( idx!=undefined && this.val.typ=='R' )
			return this.val.arr[idx]
		else
			return this.val
	}
	eval( ){					// => this.val = eval( definition )
		let vis = this.val==undefined? true : this.val.vis		// remember if marked not visible
		gVar.curr = this
		this.dependsOn = []
		this.val = Expr.evalExpr( this.def )

		if (this.nm.endsWith('_If')){	// update group conditional
		  let grpnm = this.nm.substring(0,this.nm.length-3)
		  let g = gVar.varGroups[ grpnm ]
		  if ( g != undefined ){ 
			g.show = (this.val.v == 1)
			gVar.updateGroups()
		  }
		}
		this.evalDependents()
		this.val.vis = vis
		return this.val
	}
	evalDependents(){
		for (let nm of gVar.allVars()){
			let gV = gVar.getVar(nm)
			if ( gV.dependsOn.includes( this.nm ))
				gV.eval()
		}
	}
	toString(){					// => 'nm (~)= definition'
		return `${this.nm} ${this.styles.includes('G')? '~=':'='} ${this.def}`;
	}
	static getVar( nm ){		// => gVar with 'nm'
		let [ gvnm, idx ] = gVar.nmIdx( nm )
		return gVar.glStore[ gvnm ];
	}
	static nmIdx( nm ){
		if ( typeof nm != 'string' ) debugger
		let bang = nm.indexOf('!'), idx = undefined
		if (bang >= 0 ){
			idx = Number( nm.substring( bang+1 ))
			nm = nm.substring( 0, bang )
		}
		return [ nm , idx ]
	}
	static allVars(){			// => [ all gVar_nms ]
		return Object.getOwnPropertyNames( gVar.glStore );
	}
	static groupVars( grpnm ){	// => [ gVar_nms ] in 'grpnm'
		let res = [];
		for ( let v of gVar.allVars()){
			let gV = gVar.getVar( v );
			if ( gV.grp == grpnm )
				res.push( gV.nm );
		}
		return res;
	}
	static allGroups(){			// => [ all grp_nms ] 
		let grps = [];
		for ( let v of gVar.allVars()){
			let gV = gVar.getVar( v );			
			if ( gV.grp!='' && !grps.includes( gV.grp ) ) grps.push( gV.grp );
		}
		return grps;
	}
	static hitTest( x, y ){		// => return [ gvarnm ] within 3px of x,y	
		let res = []
		gVar.hits = []
		gVar.hitpt = [ x, y ]
		let allV = gVar.allVars()
		let mind = 10000
		for (let nm of allV){
			let gVr = gVar.getVar(nm)
			if ( gVr.val.vis && gVr.grp!='' && gVar.varGroups[gVr.grp].show )
				gVar.hitVal( gVr.val, res, nm )
		}
		gVar.hits.sort( (a,b)=> a[1] - b[1] )
		return res;
	}
	static hitVal( val, res, nm ){
		const EPS = 3
		if (val.typ=='R'){
			for ( let i=0; i<val.arr.length; i++ ){
				gVar.hitVal( val.arr[i], res, `${nm}!${i}` )
			}
		} else if ( DrawPrims.includes( val.typ )){
			let d = Geom.distTo( val, gVar.hitpt[0], gVar.hitpt[1], nm )	// pass nm for debugging
			gVar.hits.push( [ nm, d ] )
			
			if ( d < EPS )
				res.push( nm );
		}
	}
	static drawVal( val, sty, nm ){
		if ( !(val instanceof gVal )) return
		if ( !val.vis ) return
		
		if ( val.typ == 'R' && val.vis ){
			for ( let i=0; i<val.arr.length; i++ ) 
				gVar.drawVal( val.arr[i], sty, `${nm}!${i}` )
		} else if ( DrawPrims.includes( val.typ ) && val.vis ){
			if ( SBar.isSelected( nm )) sty = 'red'
			gVar.drawn.push( `${val.typ} ${nm} ${sty}` )
			val.draw( gVar.context, sty, gVar.extent )
		}
	}
	static drawAll( ){			// draw all gVars on 'ctx', update gVar.extent, & show if 'showext		let showgEl('showExt').checked 
		let ctx = gVar.context
		gVar.extent = { minX: 0, maxX: 0, minY: 0, maxY: 0 }
		
		gVar.drawn = []
		for ( let nm of gVar.allVars() ){
			let vr = gVar.getVar( nm )
			if ( vr.val==undefined ) debugger
			let typ = vr.val.typ
			if (vr.visible() && Drawable.includes(typ) ){
				let sty = vr.drawStyle( vr.grp )
				if ( sty != 'hide' ){
					gVar.extent.exclude = vr.styles.includes('G')
					gVar.drawVal( vr.val, sty, nm )
				}
			}
		}
		if ( HUI.gEl('showExt').checked ){
			ctx.fillStyle = 'rgb(0,255,0,.2)'		// translucent green
			let e = gVar.extent, w = e.maxX-e.minX, h = e.maxY-e.minY
			ctx.fillRect( e.minX, e.minY, w, h )
		}
		return gVar.extent
	}
	static grpEnabled( grp ){
		let vg = gVar.varGroups[ grp ]
		if (vg==undefined) return false
		return vg.show
	}
	static saveAllLevs( nm ){		// save nm.paths for all levels
		let gvlev = gVar.getVar('Level')
		if ( !gvlev instanceof gVar ) return
		let olev = gvlev.def
		
		let pathnm = HUI.setExt( HUI.baseNm( nm ), PathsExt )
		let data = jetpack.cwd( './data/' )
		data.file( pathnm, { content: `// ${pathnm} saved by GraphEd ${HUI.getDate()}\n` })
		let pathvars = [], savedpaths = []
		for (let nm of gVar.allVars()){
			let gvr = gVar.getVar(nm)
			if ( gvr.val.typ=='E' && gvr.grp!='' )
					pathvars.push( gvr.nm )
		}
		
		let levels = gVar.getVar('Level').val.v
		for (let lev=0; lev<12; lev++){
			gvlev.def = `${1<<lev}`		// set Level bit for 'lev'
			gvlev.eval()

			let levpaths = []
			for (let nm of pathvars){
				let gvr = gVar.getVar( nm )
				if ( !savedpaths.includes( nm ) && gVar.grpEnabled( gvr.grp )){
					gVar.addPath( pathnm, gvr )
					levpaths.push( nm )
				}
			}
			if (levpaths.length>0) 
				data.append( pathnm, `// Lev${lev} paths: [ ${levpaths} ]\n` )
			savedpaths = savedpaths.concat( levpaths )
		}
		msg( `Saved ${pathnm}` )
		gvlev.def = olev
		gvlev.eval()
	}
	static saveStore( nm ){		// save all gVars in nm_levX.geom & nm_levX.paths
		if (nm==undefined) nm = gVar.glStoreNm
		let lev = 0, vlev = gVar.getVal('Level')
		if (vlev instanceof gVal && vlev.v != undefined ) lev = vlev.v
		let svnm = HUI.baseNm( nm ) + `_lev${lev}`
		let fnm = HUI.setExt( svnm, GeomExt )
		let pathnm = HUI.setExt( svnm, PathsExt )
		let data = jetpack.cwd( './data/' )
		data.file( fnm , { content: `// ${fnm} saved by GraphEd ${HUI.getDate()}\n` })
		data.file( pathnm, { content: `// ${pathnm} saved by GraphEd ${HUI.getDate()}\n` })

		for ( let ln of gVar.script ){
			let lnp = gVar.lineParts( ln )
			
			let grp = lnp.grpnm, varnm = lnp.varnm
			if ( grp != undefined ){
				let color = gVar.varGroups[ grp ].color
				let ifcl = gVar.getVar( `${grp}_If` )
				ifcl = ifcl==undefined? '' : ' if ' + ifcl.def
				data.append( fnm, `${grp}: ${color} ${ifcl} ${lnp.cmt} \n` )
			} else if ( varnm != undefined ){
				let gV = gVar.getVar( varnm )
				data.append( fnm, `${gV} ${lnp.cmt} \n` )
				if ( gV.val.typ=='E' ) gVar.addPath( pathnm, gV )
			} else 
				data.append( fnm, ` ${lnp.cmt}\n` )
		}
		
		msg( ` saved ${fnm} & ${pathnm}` );
	}
	static getParm( nm, def ){
		let gv = gVar.Parms[ nm ]
		if ( gv==undefined || gv.typ!='V' ){
			gv = gVar.getVal( nm )  // get gVar if defined
			if ( gv instanceof gVal && gv.typ=='V' )
				gVar.Parms[nm] = gv
			else
				gv = gVar.Parms[nm] = new gVal( 'V', [ def ] )
		}
		return gv.v
	}
	static pPt( x,y ){
		let nd = gVar.getParm( 'ptFix', 2 )
		return `[${x.toFixed(nd)},${y.toFixed(nd)}]`
	}
	static addPath( pth, gvr ){
		// check if group containing gvr is enabled
		let grpif = gVar.glStore[gvr.grp + '_If']
		if (grpif!=undefined && grpif.val.v==0) return		// only save enabled paths
		
		let data = jetpack.cwd( './data/' )
		let def = `${gvr.nm} = [ \n`
		let lastpt = undefined
		for (let j=0; j< gvr.val.nms.length; j++ ){
			let n = gvr.val.nms[j]
			let val = gVar.getVal( n )
		//console.log( `${n} stepPts` )
			let pts = val.stepPts( lastpt )
			lastpt = pts[ pts.length-1 ]
			let cma = ','
			for (let i=0; i<pts.length; i++){
				if (j==gvr.val.nms.length-1 && i==pts.length-1) cma = ''
				let p = pts[i]
				let [x,y] = p instanceof Array? p : [ p.x, p.y ]
				def += `${gVar.pPt(x,y)}${cma}`
				if ( i%3==2 && i!=pts.length-1 ) def += '\n '
			}
			let ends = val.endPts()
			let x0=ends[0].x,y0=ends[0].y, x1=ends[1].x,y1=ends[1].y
			let dbg = ` ${gVar.pPt(x0,y0)} ${gVar.pPt(x1,y1)}` 
			if (val.typ=='A') dbg += ` ${val.ang.s.toFixed(1)}..${val.ang.e.toFixed(1)} ${val.ccw? 'ccw':'cw'} `
			def += `\n// ${n}  typ=${val.typ} ${dbg} \n`
		}
		def += `]; \n` 
		data.append( pth, def )
	}
	static loadStore( nm, singlestep ){		// load all gVars from 'nm'.geom
		if (nm==undefined || nm=='') nm = 'geom'
		nm = HUI.baseNm( nm );
		gVar.glStoreNm = nm.trim();
		
		gVar.glStore = {}
		SBar.clear();
		let data = jetpack.cwd( './data/' );

		let fnm = HUI.setExt( nm, GeomExt );
		let txt = data.read( fnm );
		if ( txt==undefined ) return;
		
		gVar.script = txt.split( '\n' );
		gVar.scriptPos = 0
		while ( !singlestep ){
			if ( gVar.loadLine() ) break
		}
	}
	static addCmd( ln ){
		gVar.script.push( ln )
		HUI.gEl('btnSave').disabled = false

		gVar.loadLine( ln )
	}
	static lineParts( ln ){	  // => { varnm: def: cmt: grpnm: color: ifcl: }
		const reGrpColor = new RegExp( /^(\w+)\s*\:\s*(\w*)\s*(.*)$/ )
		const reVarExpr = new RegExp( /^(\w+)\s*(~?=)\s*(.*)$/ )
		
		let res = { cmt:'' }
		let slsl = ln.indexOf('//')
		if (slsl >= 0){ 
			res.cmt = ln.substring(slsl-1)
			ln = ln.substring(0, slsl)
		}
		ln = ln.trim()
		if (ln=='') return res
		
		let gc = ln.match( reGrpColor )
		if ( gc != null ){ 	// grp : color  == [ all, grp, ':', color ]
			res.grpnm = gc[1]
			res.color = gc[2]  //  e.g. 'black'
			res.ifcl = gc[3]	// if <expr>
			return res
		}
		
		gc = ln.match( reVarExpr )
		if ( gc != null ){ 	// grp : color  == [ all, grp, ':', color ]
			res.varnm = gc[1]
			res.equal = gc[2]
			res.def = gc[3] 	// def
			return res
		}
		msg( `misformed input line: ${ln}` )
	}
	static loadLine(){
		if ( gVar.scriptPos >= gVar.script.length ) 
			return true
		
		let ln = gVar.script[ gVar.scriptPos++ ]
		msg(ln)
		
		let lnp = gVar.lineParts( ln )
		
		let grp = lnp.grpnm, varnm = lnp.varnm, showGroup = true
		if ( grp != undefined ){
			gVar.currGroup = grp
			let ifclause = lnp.ifcl, color = lnp.color
			if (ifclause.startsWith('if')){
				let gVr = new gVar( gVar.currGroup+'_If', ifclause.substring(2), 'IfGrps', '', lnp.cmt)
				showGroup = (gVr.val.typ=='V' && gVr.val.v==1) 
				for (let nm of gVr.dependsOn )
					if ( !gVar.ifDependencies.includes(nm) )
						gVar.ifDependencies.push( nm )
			}
			SBar.addGrp( gVar.currGroup, color, showGroup )
		} else if ( varnm != undefined ){
			let equal = lnp.equal, def = lnp.def
			let sty = equal=='~='? 'V,G' : 'V'  //, st = eqpos;
			//if ( ln.substring(eqpos-1,eqpos+1)=='~=' ){ sty = 'V,G'; st=eqpos-1; }
			if ( HUI.isName( varnm ) && def!=undefined ){
				let gVr = new gVar( varnm, def, gVar.currGroup, sty, lnp.cmt )
			}
		} else 
			msg( `misformed input line: ${ln}` )
		
		gVar.updateGroups()
		return false
	}
}

module.exports = { gVar, gVal }
// const { gVar, gVal } 						= require( './gvar.js' )
 