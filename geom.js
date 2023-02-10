// geom.js

class Geom{
	static inEps( dx, dy ){
		const eps = 5;
		if ( dx < 0? dx < -eps : dx > eps ) return false;
		if ( dy < 0? dy < -eps : dy > eps ) return false;
		return true;
	}
	static lnHit( p1,p2, x,y ){
		const eps = 3;
		let dx = p2.x - p1.x, dy = p2.y - p1.y;
		if (Math.abs(dx) < 0.0001){
			if ( Math.abs(x-p1.x) > eps ) return false;
			return Geom.isBetween(y, p1.y, p2.y);
		} else if (Geom.isBetween(x, p1.x, p2.x)) {
			let fr = (x-p1.x)/dx;   // frac from p1..p2
			let lny = p1.y + fr * dy;
			return Math.abs( lny-y ) < eps;
		} else
			return false;
	}
	static lineTatY( ln, y ){
		let dy = ln.p2.y - ln.p1.y;
		return ( y - ln.p1.y)/dy;		// 0..1 if within segment	NaN if horizontal
	}
	static lineTatX( ln, x ){
		let dx = ln.p2.x - ln.p1.x;
		return ( x - ln.p1.x)/dx;		// 0..1 if within segment	NaN if vertical
	}
	static lineT( ln, x, y ){
		const EPS = 0.001
		if (x==undefined) return Number.NaN
		if (x instanceof Array){ y = x[1], x = x[0] }
		let t1 = Geom.lineTatX( ln, x )
		let t2 = Geom.lineTatY( ln, y )
		if ( Math.abs(t1-t2) < EPS ) return t1
		if ( isNaN(t1) && x==ln.p1.x ) return t2
		if ( isNaN(t2) && y==ln.p1.y ) return t1
		return Number.NaN
	}
	static linePt( ln, t ){
		let dx = ln.p2.x - ln.p1.x, dy = ln.p2.y - ln.p1.y
		if ( dx==0 && dy==0 ) debugger;
		return [ ln.p1.x + t * dx, ln.p1.y + t * dy ]
	}
    static ptsOnLine( ln, pts ){		// ln, [ {nm: v:} ] => [ { t:, pt: } ] that are on 'ln', ordered by t
		let cand = []
		for ( let p of pts ){
			let t = Geom.lineT( ln, p.v.x, p.v.y )
			if ( !isNaN(t) ) cand.push( { t: t, pt: p.v } )
		}
		cand.sort( ( a, b ) => a.t - b.t )
		return cand
	}
	static ptsOnArc( arc, pts ){		// => arc, [ {nm: v:} ] => [ {a: pt:} ] that are on arc (or circle), ordered by a
		const Eps = 0.01
		let cand = []
		let isarc = arc.typ=='A'
		if (!isarc && arc.typ!='C') debugger
		let cir = isarc? arc.c : arc
		for ( let p of pts ){
			let d = Geom.distTo( cir.c, p.v.x, p.v.y )
			if ( Math.abs(d-cir.r) < Eps ){
				let a = Geom.angTo( cir.c, p.v.x, p.v.y )
				if (!isarc || Geom.angBetween( a, arc.ang.s, arc.ang.e, arc.ccw))
					cand.push( { a: Geom.angTo(cir.c, p.v.x,p.v.y), pt: p.v } )
			}
		}
		function compare( a1, a2, arc ){ 
			// if ccw:  -180 <= arc.ang.s <=  a1,a2 <= arc.ang.e <= 180 
			// if !ccw:  if aX > arc.ang.e: arc.ang.e-360 <= aX-360 <= arc.ang.s 
			if (arc.ccw) return a1 - a2
			
			// clockwise -- shift a1 & a2 if > arg.ang.e
			if ( a1 >= arc.ang.e ) a1 -= 360
			if ( a2 >= arc.ang.e ) a2 -= 360
			return a2 - a1
		}
		if ( !isarc ) 
			cand.sort( (a,b) => a.a - b.a )
		else
			cand.sort( (a,b) => compare( a.a, b.a, arc ) )	
		
		return cand
	}
	static lineLen( ln ){
		let dx = ln.p1.x - ln.p2.x, dy = ln.p1.y - ln.p2.y
		return Math.sqrt( dx*dx + dy*dy )
	}
	static isOnLine( ln, x, y ){
		let t = lineT( ln, x, y )
		if ( isNaN(t) ) return false
		return true
	}
	static circPt( c, ang ){ // ang in degrees => [x,y]
		let rad = ang * Math.PI/180
		return [ c.c.x + Math.cos( rad )* c.r, c.c.y + Math.sin( rad )* c.r ]
	}
	static firstPtCloser( p, pts ){  // => T if p closer to pts[0] than pts[1]
		if (p.x == undefined) p = { x: p[0], y: p[1] }
		let p0 = pts[0], p1 = pts[1]
		if (p0.x == undefined) p0 = { x: p0[0], y: p0[1] }
		if (p1.x == undefined) p1 = { x: p1[0], y: p1[1] }
		let d0 = Geom.distToPoint( p, p0.x, p0.y )
		let d1 = Geom.distToPoint( p, p1.x, p1.y )
		return d0 < d1
	}
	static arcPts( arc, startpt ){
		let chordLen = gVar.getParm( 'chordLen', 5 )
		let [ cir, sa, ea, ccw ] = arc.typ=='C'? [ arc, 0,360, 1 ] : [ arc.c, arc.ang.s, arc.ang.e, arc.ccw ]
		let anglen = ccw? ea-sa : sa-ea+360
		let arclen = cir.r * Math.PI*2 * (anglen)/360
		let steps = Math.trunc(arclen/chordLen)-1
		let astep = anglen / steps
		if ( !arc.ccw ) astep = -astep
	console.log( ` ${arc} ${startpt}  anglen=${anglen.toFixed(0)} arclen=${arclen.toFixed(1)}  astep=${astep.toFixed(1)} ` )
		let sapt = Geom.circlePt( cir, sa )
		let eapt = Geom.circlePt( cir, ea )
		if ( !Geom.firstPtCloser( startpt, [ sapt, eapt ] ))
			[ sa, ea, astep ] = [ ea, sa, -astep ]
		let res = []
		for (let i=1; i<steps; i++ ){
			sa += astep
			res.push( Geom.circPt( cir, sa ))
	if(arc.typ=='A' && arc.ang.s==-175){	
		let lst=res[ res.length-1]; 
		console.log( ` a=${sa.toFixed(1)} [${lst[0].toFixed(0)},${lst[1].toFixed(0)}]` )
	}
		}
		res.push( Geom.circPt( cir, ea ))
		return res
	}
	static distTo( v, x,y, nm ){
		if (nm==undefined) nm = ''
		switch ( v.typ ){
			case 'P':	return Geom.distToPoint( v, x,y, nm )
			case 'L':	return Geom.distToLine( v, x,y, nm )
			case 'C':	return Geom.distToCircle( v, x,y, nm )
			case 'A':   return Geom.distToArc( v, x,y, nm  )
			case 'T':   return Geom.distToTurn( v, x,y, nm  )
			case 'S':   return Geom.distToSpline( v, x,y, nm  )
			default:  return Math.Infinity;
		}
	}
	static closestRng( v, v1,v2 ){
		let minv = v1, maxv = v2;
		if ( v1 > v2 ){ minv = v2; maxv = v1 }
		if ( v < minv ) return minv;
		if ( v > maxv ) return maxv;
		return v;
	}
	static distToRng( v,  v1,v2 ){
		return Math.abs( v - Geom.closestRng(v, v1,v2) )
	}
	static distToPoint( v, x,y, nm ){
		if (v==undefined) debugger
		if ( !(v instanceof Array)){
			if (v.x==undefined || v.y==undefined) debugger
			v = [ v.x, v.y ]
		}
		let dx = v[0] - x, dy = v[1] - y
		return Math.sqrt( dx*dx + dy*dy )
	}
	static distToLine( v, x,y, nm ){
		let dx = v.p2.x - v.p1.x, dy = v.p2.y - v.p1.y
		// p(t) = [ p1.x + dx*t, p1.y + dy*t ]
		// [ x-(p1.x+t1*dx), y-(p1.y + t1*dy)]  -- vector from x,y to p(t1)
		// (x-(p1.x + t1*dx)) * dx + (y-(p1.y+t1*dy)*dy) = 0   -- for perpendicular
		// x*dx -p1.x*dx -t1*dx*dx + y*dy - p1.y*dy - t1*dy*dy = 0
		// -t1(dy*dy+dx*dx) = p1.x*dx + p1.y*dy -x*dx - y*dy
		let t1 = (v.p1.x*dx + v.p1.y*dy - x*dx - y*dy)/(-dy*dy - dx*dx)
		if ( t1<0 ) t1 = 0
		if ( t1>1 ) t1 = 1
		let xp = v.p1.x + t1*dx, yp = v.p1.y + t1*dy
		let d = Geom.distToPoint( [xp,yp], x, y );
		return d;
	}
	static distToCircle( v, x,y, nm ){
		if ( !(v instanceof gVal) || v.typ != 'C' ) debugger
		let dctr = Geom.distToPoint( v.c, x,y )
		return Math.abs( v.r - dctr )
	}
	static circlePt( c, ang ){		// ang in degrees => gVal(P)
		let rad = ang*Math.PI/180
		return new gVal( 'P', [ c.c.x + c.r * Math.cos( rad ), c.c.y + c.r * Math.sin( rad ) ] )
	}
	static distToArc( v, x,y, nm ){
		if ( !(v instanceof gVal) || v.typ != 'A' ) debugger
		let ang = Geom.angTo( v.c.c, x,y ) 
		//let d = Geom.distToCircle( v.c, x,y )
		//if ( Geom.distToRng( ang, v.ang.s, v.ang.e )<2 ) return d;
		let ds = Geom.distToPoint( Geom.circlePt(v.c, v.ang.s), x,y )
		let de = Geom.distToPoint( Geom.circlePt(v.c, v.ang.e), x,y )
		let da = Geom.angBetween(ang, v.ang.s, v.ang.e, v.ccw)? Geom.distToPoint( Geom.circlePt(v.c, ang), x,y ) : 10000
		return Math.min( ds, de, da );
	}
	static distToTurn( v, x,y, nm ){
		return Math.min( Geom.distToLine( v.ln, x,y ), Geom.distToLine( { p1: v.ln.p2, p2: v.p3 }, x,y )); 
	}
	static getAng( p1, p2, p3 ){		// return angle inside p1--p2--p3
		let v21 = [ p1.x - p2.x, p1.y - p2.y ]
		let v23 = [ p3.x - p2.x, p3.y - p2.y ]
		let d21 = Math.sqrt( v21[0]*v21[0] + v21[1]*v21[1] ), d23 = Math.sqrt( v23[0]*v23[0] + v23[1]+v23[1] )
		let cross = v21[0]*v23[1] - v21[1]*v23[0]
		let dot = v21[0]*v23[0] + v21[1]*v23[1]
		let ang = Math.atan2( cross, dot )*180/Math.PI
		return ang
	}
	static bisector( p1, p2, p3, len ){		// => [x,y] at 'len' from p2 on bisector of p1--p2--p3
		let v21 = [ p1.x - p2.x, p1.y - p2.y ]
		let v23 = [ p3.x - p2.x, p3.y - p2.y ]
		let d21 = Math.sqrt( v21[0]*v21[0] + v21[1]*v21[1] ), d23 = Math.sqrt( v23[0]*v23[0] + v23[1]+v23[1] )
		 
		let v2b = [ v21[0]/d21 + v23[0]/d23, v21[1]/d21 + v23[1]/d23 ] 	// vector from p2 bisecting p1 & p3
		let dv2b = Math.sqrt( v2b[0]*v2b[0] + v2b[1]*v2b[1] )
		let pb1 = [ p2.x - v2b[0]/dv2b*len, p2.y - v2b[1]/dv2b*len ]
		let pb2 = [ p2.x + v2b[0]/dv2b*len, p2.y + v2b[1]/dv2b*len ]
		// which of pb1 & pb2 is inside p1--p2--p3 ?
		let a1 = Geom.angTo(p2, p1), a3 = Geom.angTo(p2, p3), ab1 = Geom.angTo(p2, pb1)
		if ( a1 > a3 ) [a1, a3] = [a3,a1]
		let ccw = (a3 - a1) > 180	// direction around outside of p1--p2--p3
		
		return Geom.angBetween( ab1, a1,a3, ccw )? pb2 : pb1
	}
	static defineSpline( v ){	// trim lines & add arc
		// calc ctr of circle of radius v.r tangent inside turn p1--p2--p3
		let ln1 = v.t.ln1, ln2 = v.t.ln2
		let p1 = ln1.p1, p2 = ln1.p2, p3 = ln2.p2
		let a = Geom.getAng( p1, p2, p3 )
		let ctop2 = v.r / Math.sin( a/2 * Math.PI/180 )		// dist from p2 to center of radius (on bisector)
		let ctr = new gVal( 'P', Geom.bisector( p1, p2, p3, ctop2 ))		// ctr of tangent circle of radius v.r
		let cir = new gVal('C', [ ctr, v.r ] )

		let ipts = Geom.intLnCir( ln1, cir )	// tangent pt on p1--p2
		if (ipts.length!=1) debugger
		ln1.p2 = new gVal('P', ipts[0] )  // trim ln1 to p1--tangent pt

		ipts = Geom.intLnCir( ln2, cir )	// tangent pt on p2--p3
		if (ipts.length!=1) debugger
		ln2.p1 = new gVal('P', ipts[0] ) 	// trim ln2 to tangent pt--p3
		let ivl = new gVal('I', [ Geom.angTo( ctr, ln1.p2 ), Geom.angTo( ctr, ln2.p1 ) ] )
		if (ivl.s > ivl.e){	// ensure s < e
			if ( ivl.s > 180 ) 
				ivl.s -= 360
			else
				ivl.e += 360	
		}
		let ccw = !Geom.angBetween( Geom.angTo( ctr, p2 ), ivl.s, ivl.e, false )
		v.arc = new gVal('A', [ cir, ivl, ccw ] )		// arc from tpt1 to tpt2
	}
	static distToSpline( v, x,y, nm ){		
		let d12 = Geom.distToLine( v.t.ln1, x,y )
		let d23 = Geom.distToLine( v.t.ln2, x,y )
		let da =  Geom.distToArc( v.arc, x,y )
	
		return Math.min( d12, d23, da )		// min dist to p1--tpt1, p3--tpt2, and arc from tpt1 to tp2 
	}

	static showArc( nm, arc ){
		let s1 = `${Geom.toArcPt(arc.c, arc.ang.s)}`
		let s2 = `${Geom.toArcPt(arc.c, arc.ang.e)}`
		return `(${nm}) ${s1} ${s2}`
	}
	static showLine( nm, t1,t2, line ){
		let s1 = `${t1.toFixed(1)}:${line.p1}`
		let s2 = `${t2.toFixed(1)}:${line.p2}`
		return `(${nm}) ${s1}--${s2}`
	}
	static toArcPt( cir, ang ){
		if (ang==undefined) return ''
		let pt = Geom.circlePt(cir, ang)
		return `${ang.toFixed(1)}:${Geom.toPtDef( pt )}`
	}
	static toPtDef( pt ){
		if (pt==undefined) return ''
		let x1,y1
		if ( pt instanceof Array ){ x1 = pt[0]; y1 = pt[1] }
		else { x1 = pt.x; y1 = pt.y }
		return `[${x1.toFixed(3)},${y1.toFixed(3)}]`
	}
	static toLnDef( p1, p2 ){
		let x1,y1, x2,y2
		if ( p1 instanceof Array ){ x1 = p1[0]; y1 = p1[1] }
		else { x1 = p1.x; y1 = p1.y }
		if ( p2 instanceof Array ){ x2 = p2[0]; y2 = p2[1] }
		else { x2 = p2.x; y2 = p2.y }
		return `[${x1.toFixed(3)},${y1.toFixed(3)}]--[${x2.toFixed(3)},${y2.toFixed(3)}]`
	}
	static toCirDef( pt, r ){
		let x1,y1
		if ( pt instanceof Array ){ x1 = pt[0]; y1 = pt[1] }
		else { x1 = pt.x; y1 = pt.y }
		return `[${x1.toFixed(3)},${y1.toFixed(3)}]^${r.toFixed(2)}`
	}
	static angNorm( a ){
		return a < -180? a+360 : ( a > 180? a-360 : a )
	}
	static toArcDef( pt, r, s, e, ccw ){
		if (s < -180) [s,e] = [s+360, e+360]
		if (s > 180 ) [s,e] = [s-360, e-360]
		
		return `${Geom.toCirDef(pt,r)}${ccw? '*':'/'}${s.toFixed(2)}:${e.toFixed(2)}`
	}
	static toAngIvlDef( s, e ){
		s = Geom.angNorm( s )
		e = Geom.angNorm( e )
		
		return `${s.toFixed(2)}:${e.toFixed(2)}`
	}
	static expandNms( nms ){	// [ nm ] => expands R.F vars from nm 
		let res = []
		for ( let nm of nms ){
			let val = nm
			if ( typeof nm == 'string' ){
				val = gVar.getVar( nm ).val
			}
			if ( val instanceof gVal ){
				if ( val.typ == 'R' )
					res = res.concat( Geom.expandNms( val.arr ))
				else if ( val.typ == 'E' ) 
					res = res.concat( val.nms )
				else if ( val.typ == 'F' ) 
					res.push( val.fld )
			}
		}
		return res
	}
	static expandVals( gval, nm, incltyps ){	// => [ { nm: v:gval } ] or [ { nm:'nm!0', v:gval}, ... ] if 'R'
		if ( gval instanceof Array ){
			let res = []
			for (let v of gval)
				res = res.concat( Geom.expandVals( v, nm, incltyps ))
			return res
		}
		if ( typeof gval == 'string' || gval.typ == 'F' ){ // expand str as name of gVar
			let gvr = gVar.getVar( typeof gval == 'string'? gval : gval.fld )
			nm = gvr.nm
			gval = gvr.val
			if ( gval==undefined ) return []   // e.g. for not yet defined var
		}
		if ( !(gval instanceof gVal) ) debugger
		if ( incltyps.includes( gval.typ ) ) return [ { nm: nm, v: gval } ]
		if ( gval.typ == 'R' ){
			let res = []
			for ( let i=0; i<gval.arr.length; i++ )
				res = res.concat( Geom.expandVals( gval.arr[i], `${nm}!${i}`, incltyps ))
			return res
		}
		return []
	}
	static addIntersections( arr, intNm, gval1, gval2 ){
		const Min_Dist = 0.001
		let vals1 = Geom.expandVals( gval1, '', 'LCATS' )	// expand to elements if array of intersectables
		let vals2 = Geom.expandVals( gval2, '', 'LCATS' )
		
		for ( let v1 of vals1 ){
			for ( let v2 of vals2 ){
				let pts = Geom.intersections( v1.v, v2.v )	// find pts of intersection

				for ( let p of pts ){		// and add to arr unless duplicate
					for ( let apt of arr )
						if ( Geom.distToPoint( apt, p[0], p[1], intNm ) <= Min_Dist ) 
							p = null	// don't add duplicate point
					
					if ( p!= null )
						arr.push( new gVal( 'P', [ p[0], p[1] ] ))
				}
			}
		}
	}
	static intersections( v1, v2 ){
		if ( !(v1 instanceof gVal) || !(v2 instanceof gVal)) return [];
		const intTyps = 'LCATS';
		let t1 = intTyps.indexOf(v1.typ), t2 = intTyps.indexOf(v2.typ);
		if ( t1<0 || t2<0 ) return [];
		if ( t2 < t1 ){ let tmp = v1; v1 = v2; v2 = tmp; }
		let typs = v1.typ + v2.typ;
		switch ( typs ){
			case 'LL':	return Geom.intLnLn( v1, v2 )
			case 'LC':	return Geom.intLnCir( v1, v2 )
			case 'LA':  return Geom.intLnArc( v1, v2 )
			case 'LT':  return Geom.intLnTurn( v1, v2 )
			case 'LS':  return Geom.intLnSpl( v1, v2 )
			case 'CC':	return Geom.intCirCir( v1, v2 )
			case 'CA':	return Geom.intCirArc( v1, v2 )
			case 'CT':  return Geom.intCirTurn( v1, v2 )
			case 'CS':  return Geom.intCirSpl( v1, v2 )
			case 'AA':  return Geom.intArcArc( v1, v2 )
			case 'AT':  return Geom.intArcTurn( v1, v2 )
			case 'AS':  return Geom.intArcSpl( v1, v2 )
			case 'TT':  return Geom.intTurnTurn( v1, v2 )
			case 'TS':  return Geom.intTurnSpl( v1, v2 )
			case 'SS':  return Geom.intSplSpl( v1, v2 )
			default:  return [];
		}
	}
	static ptAtT( ln, t ){	// return [ ln(t) ] if t in 0..1
		if ( t<0 || t>1 ) return []
		return  [ Geom.linePt( ln, t ) ]
	}

	static intLnLn( v1, v2 ){
		let x1 = v1.p1.x, y1 = v1.p1.y, x2 = v2.p1.x, y2 = v2.p1.y
		let dx1 = v1.p2.x - x1, dy1 = v1.p2.y - y1
		let dx2 = v2.p2.x - x2, dy2 = v2.p2.y - y2
		if (dx1==0 && dx2==0 || dy1==0 && dy2==0 ) return []	// both vertical or horizontal
		if (dx1==0) {
			let s = Geom.TinEps( Geom.lineTatX( v2, x1 ))
			let pt = Geom.ptAtT( v2, s )
			if (pt.length==0) return []
			let t = Geom.TinEps( Geom.lineT( v1, pt[0][0], pt[0][1] ))
			if ( s<0 || s>1 || t<0 || t>1 ) return []
			return pt
		}
		if (dx2==0) {
			let s = Geom.TinEps( Geom.lineTatX( v1, x2 ))
			let pt = Geom.ptAtT( v1, s )
			if (pt.length==0) return []
			let t = Geom.TinEps( Geom.lineT( v2, pt[0][0], pt[0][1] ))
			if ( s<0 || s>1 || t<0 || t>1 ) return []
			return pt
		}
		if (dy1==0) {
			let s = Geom.TinEps( Geom.lineTatY( v2, y1 ))
			let pt = Geom.ptAtT( v2, s )
			if (pt.length==0) return []
			let t = Geom.TinEps( Geom.lineT( v1, pt[0][0], pt[0][1] ))
			if ( s<0 || s>1 || t<0 || t>1 ) return []
			return pt
		}
		if (dy2==0) {
			let s = Geom.TinEps( Geom.lineTatY( v1, y2 ))
			let pt = Geom.ptAtT( v1, s )
			if (pt.length==0) return []
			let t = Geom.TinEps( Geom.lineT( v2, pt[0][0], pt[0][1] ))
			if ( s<0 || s>1 || t<0 || t>1 ) return []
			return pt
		}
		// x1 + dx1 * t = x2 + dx2 * s
		// y1 + dy1 * t = y2 + dy2 * s
		// s = ((x1 + dx1 * t) - x2 )/dx2  = (x1 + dx1)/dx2 * t - x2/dx2
		let a = (x1 + dx1)/dx2, b = -x2/dx2
		// t = ((y2 + dy2 * s) - y1 )/dy1  = (y2 + dy2)/dy1 * s - y1/dy1
		let c = (y2 + dy2)/dy1, d = -y1/dy1
		// s = a*t+b, t = c*s+d,  t = c*(a*t +b) +d = c*a* t + b*c + d  
		//  t * (1 - c*a) = b*c + d   
		let t = (b*c + d)/(1 - c*a)
		let s = a*t + b
		t = Geom.TinEps( t )	// find intersections at -.001 & 1.001
		s = Geom.TinEps( s )
		if ( s >= 0 && s <= 1 && t >= 0 && t <= 1 ){
			let x = x2 + dx2 * s
			let y = y1 + dy1 * t
			return [ [ x, y ] ]
		}
		return []
	}
	static intLnCir( v1, v2 ){
		let x1 = v1.p1.x, y1 = v1.p1.y
		let dx = v1.p2.x - x1, dy = v1.p2.y - y1
		// x = x1 + t * dx   y = y1 + t * dy
		let cx = v2.c.x, cy = v2.c.y, r = v2.r
		// (x-cx)*(x-cx) + (y-cy)*(y-cy) = r*r
		// (x1-cx + t*dx)(x1-cx + t*dx) + (y1-cy + t*dy)(y1-cy + t*dy) = r*r
		// (x1-cx)(x1-cx) + 2*(x1-cx)*dx * t + dx*dx * t*t + (y1-cy)(y1-cy) + 2*(y1-cy)*dy *t + dy*dy * t*t = r*r
		let ax = x1 - cx, by = y1-cy 
		//  (ax*ax+by*by -r*r) + (2*ax*dx + 2*by*dy) * t + (dx*dx +dy*dy) *t*t = 0
		//  A t*t + B * t + C = 0
		let A = dx*dx + dy*dy, B = 2*ax*dx + 2*by*dy, C = ax*ax+by*by-r*r
		let disc = B*B - 4*A*C
		if ( disc < -0.001 ) return []
		let D = disc<0? 0 : Math.sqrt(disc), t1 = (-B + D)/(2*A), t2 = (-B - D)/(2*A)
		let res = []
		t1 = Geom.TinEps( t1 )	// find intersections at -.001 & 1.001
		t2 = Geom.TinEps( t2 )
		if ( t1>=0 && t1 <= 1 ) 
			res.push( [ x1 + t1*dx, y1 + t1*dy ] )
		
		if ( t2!=t1 && t2>=0 && t2<=1 )
			res.push( [ x1 + t2*dx, y1 + t2*dy ] )
		
		return res	
	}
	static intLnArc( v1, v2 ){
		let cir = v2.c, ang = v2.ang
		let pts = Geom.intLnCir( v1, cir ), ints = []
		for ( let pt of pts ){
			let a = Geom.angTo( cir.c, pt )
			if ( Geom.angBetween( a, ang.s, ang.e, v2.ccw )) ints.push( pt )
		}
		return ints
	}
	static intLnTurn( v1, v2 ){
		let ints = Geom.intLnLn( v1, v2.ln1 )
		ints.concat( Geom.intLnLn( v1, v2.ln2 ))
		return ints
	}
	static intLnSpl( v1, v2 ){
		let ints = Geom.intLnTurn( v1, v2.t )
		ints.concat( Geom.intLnArc( v1, v2.arc ))
		return ints
	}
	static intCirCir( v1, v2 ){
		let c1 = v1.c, c2 = v2.c, r1 = v1.r, r2 = v2.r
		let dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.sqrt( dx*dx + dy*dy )
		if ( d > r1 + r2 ) return []
		if ( d == r1 + r2 ) return [ c1.x + r1 * dx/d, c1.y + r1 * dy/d ]
		
		let d1 = (d*d + r1*r1 - r2*r2)/(2*d)
		let pt = [ c1.x + d1 * dx/d, c1.y + d1 * dy/d ]   // pt on radical line & line between centers
		let pt1 = { x: pt[0] - dy, y: pt[1] + dx }
		let pt2 = { x: pt[0] + dy, y: pt[1] - dx }
		
		let ints = Geom.intLnCir( { p1: pt1, p2: pt2 }, v1 )
		return ints
	}
	static intCirArc( v1, v2 ){
		let pts = Geom.intCirCir( v1, v2.c ), ints = []
		for ( let pt of pts )
			if ( Geom.angBetween( Geom.angTo( v2.c.c, pt), v2.ang.s, v2.ang.e, v2.ccw )) 
				ints.push( pt )
		return ints
	}
	static intCirTurn( v1, v2 ){
		let ints = Geom.intLnCir( v2.ln1, v1 )
		ints.concat( Geom.intLnCir( v2.ln2, v1 ))
		return ints
	}
	static intCirSpl( v1, v2 ){
		let ints = Geom.intCirTurn( v1, v2.t )
		ints.concat( Geom.intCirArc( v1, v2.arc ))
		return ints
	}
	static intArcArc( v1, v2 ){
		let pts = Geom.intCirCir( v1.c, v2.c ), ints = []
		for ( let pt of pts ){
			if ( Geom.angBetween( Geom.angTo( v1.c, pt), v1.ang.s, v1.ang.e, v1.ccw ) &&
				 Geom.angBetween( Geom.angTo( v2.c, pt), v2.ang.s, v2.ang.e, v2.ccw ) ) 
				ints.push( pt )
		}
		return ints
	}
	static intArcTurn( v1, v2 ){
		let ints = Geom.intLnArc( v2.ln1, v1 )
		ints.concat( Geom.intLnArc( v2.ln2, v1 ))
		return ints
	}
	static intArcSpl( v1, v2 ){
		let ints = Geom.intLnArc( v2.ln1, v1 )
		ints.concat( Geom.intLnArc( v2.ln2, v1 ))
		ints.concat( Geom.intArcArc( v2.arc, v1 ))
		return ints
	}
	static intTurnTurn( v1, v2 ){
		let ints = Geom.intLnTurn( v1.ln1, v2 )
		ints.concat( Geom.intLnTurn( v1.ln2, v2 ))
		return ints
	}
	static intTurnSpl( v1, v2 ){
		let ints = Geom.intLnSpl( v1.ln1, v2 )
		ints.concat( Geom.intLnSpl( v1.ln2, v2 ))
		return ints
	}
	static intSplSpl( v1, v2 ){
		let ints = Geom.intLnSpl( v1.ln1, v2 )
		ints.concat( Geom.intLnSpl( v1.ln2, v2 ))
		ints.concat( Geom.intArcSpl( v1.arc, v2 ))
		return ints
	}

	static TinEps( t, eps ){			// adj T within Eps of 0..1
	  if ( eps==undefined ) eps = 0.001
	  if ( t<0 && t>-eps ) t = 0
	  if ( t>1 && t<1+eps ) t = 1
	  return t
	}
	static isBetween( v, a, b, eps ){
		if ( eps==undefined ) eps = 3;
		if ( a < b )
			return ( v > a-eps && v < b+eps );
		else
			return ( v > b-eps && v < a+eps );
	}
	static cirHit( pt, r, x,y){
		const Eps = 3;
		if ( !(pt instanceof Array)) pt = [ pt.x, pt.y ]
		let dx = x-pt[0], dy = y-pt[1];

		let d = Math.sqrt( dx*dx + dy*dy );
		return Math.abs( d-r ) < Eps;
	}
	static angEq( a1, a2, eps ){
		if ( eps==undefined ) eps = 0.01
		let d = Math.abs( a2 - a1 )
		if ( d < eps ) return true
		if ( Math.abs(360-d) < eps) return true
		return false
	}
	static asAngBetween( sa, angs, ea, ccw ){	// => [angs] adjusted to be between sa & ea
		if ( sa < -180 || ea < sa || ea > 180 ) debugger
		let resa = []
		const eps = 0.01
		for ( let a of angs ){
			if ( a != undefined ){
				if ( a < -180 ) a += 360
				if ( a > 180 ) a -= 360
				if ( ccw ){
					if ( a > sa+eps && a < ea-eps ) 
						resa.push( a )
				} else {
					if ( a < sa-eps || a > ea+eps )
						resa.push( a )
				}
			}
		}
		if ( resa.length <= 1 ) return resa
		
		if ( ccw && resa[1] < resa[0] ) 
			return [ resa[1], resa[0] ]
		
		if ( !ccw && resa[0] > resa[1] ) 
			return [ resa[1], resa[0] ]
		
		return resa
	}
	static angBetween( a, a1,a2, ccw ){	// T if a in a1..a2, using ccw
		if ( a1 > a2 ) debugger
		a = a < -180? a+360 : (a > 180? a-360 : a)
		if ( ccw ) return (a >= a1 && a <= a2)
		return ( a <= a1 || a >= a2 )
	}
	static angTo( pt, x,y ){			// => -180..180
		if ( !(pt instanceof Array)) pt = [ pt.x, pt.y ]
		if ( x instanceof Array ) [ x, y ] = [ x[0], x[1] ]
		if ( typeof x == 'object' )[ x, y ] = [ x.x, x.y ]
		let dx = x-pt[0], dy = y-pt[1];
		let a = Math.atan2( dy, dx )*180/Math.PI;
		return a
	}
	static addExtent( ext, pts ){
		if (ext.exclude) return
		if ( pts[0] instanceof Array ){
			for (let pt of pts) Geom.addExtent( ext, pt )
		} else {
			let x = pts[0], y = pts[1]
			if ( x < ext.minX ) ext.minX = x
			if ( x > ext.maxX ) ext.maxX = x
			if ( y < ext.minY ) ext.minY = y
			if ( y > ext.maxY ) ext.maxY = y
		}
	}
}
module.exports = { Geom }  //inEps, lnHit, isBetween, cirHit, angTo, inAng }; 
// const { Geom } 				= require( './geom.js' );

