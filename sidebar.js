// sidebar.js

const { HUI } = require( './htmlui.js'	)

class SBar {
	static selVars = []		// selected gVars or elements
	static selNms = []		// expanded R.F nms from selVars
	static dragVar = null
	static currGrp = 'Defs'
	static colorGrpNm
	
	static clear(){
		SBar.clearSelVars()

		HUI.gEl('groups').innerHTML = ''
		gVar.varGroups = {}
		//SBar.addGrp( 'Lev' )
		new gVar('Level', '0', '' )
		Lev0.click()
		//SBar.showGroupColor( 'Lev', false )
		//HUI.toggleList( { target: HUI.gEl('grp_Lev') } )
		SBar.addGrp( 'IfGrps', 'black', true )
		SBar.showGroupColor( 'IfGrps', false )
		SBar.addGrp( 'Defs' )
		SBar.showGroupColor( 'Defs', false )
		SBar.currGrp = 'Defs'
		HUI.addListener('colorSel', 'click', (evt) => SBar.checkColor(evt) )
	}
	static selVar( nm, sel ){					// set/reset both class 'sel' of 'gV_NM' & style of gVar 'nm'
		let [ gvnm, idx ] = gVar.nmIdx( nm )
		HUI.setClass( HUI.gEl( 'gV_'+gvnm ), 'sel', sel );
	//	let gVr = gVar.getVar( gvnm );
	//	gVr.setStyle( 'S', sel, idx );
	}
	static isSelected( nm ){
		if ( SBar.selVars.includes( nm )) return true
		let idx = nm.indexOf('!')
		if ( idx >= 0 && SBar.selVars.includes( nm.substring(0,idx) )) return true
		if ( SBar.selNms.includes( nm )) return true
		return false
	}
	static addGrp( nm, gcolor, show ){	// add gVar group named 'grp_NM' to top of grp_All
		if ( show==undefined ) show = true
		if ( gcolor==undefined ) gcolor = 'black'
		const colors = [ 'black', 'green', 'blue', 'orange', 'purple', 'darkgreen' ]
		
		if ( gVar.varGroups[nm]!=undefined ) return   // already defined
		gVar.varGroups[nm] = { color: gcolor, show: show }
		
		let grpid = `grp_${nm}`;
		let clrid = `clr_${nm}`;
		let grplst = `lst_${nm}`;
		let groups = HUI.gEl( 'groups' );
		if ( document.getElementById( grpid ) && document.getElementById( grplst )) return;
		
		SBar.currGrp = nm
		let cls = `c_${gcolor}`
		let caret = HUI.newEl( 'span', grpid, 'caret', nm )
		let currColor = HUI.newEl( 'span', clrid, 'box b_'+gcolor, '&nbsp;' ) 
		let ul = HUI.newEl( 'ul', grplst, 'nested', '' )
		let li = HUI.newEl( 'li', '', cls )
		li.dropzone = 'copy'
		li.appendChild( caret )
		li.appendChild( currColor )
		li.appendChild( ul );	// <li> <span id='${grpid}' class='caret'>${nm}</span><ul id='${grplst}' class='nested'>	</ul></li>`;
		groups.appendChild( li );

		HUI.addListener( clrid, 'click', (evt) => SBar.showColors( evt ))
		HUI.addListener( grpid, 'click', (evt) => HUI.toggleList( evt ))
		//HUI.addListener( grplst, 'click', (evt) => selectGrp( evt ))
		HUI.addListener( grpid, 'drop', (evt) => SBar.dropOn( evt ))
		HUI.addListener( grpid, 'dragenter', (evt) => SBar.dragEnter( evt ))
		HUI.addListener( grpid, 'dragover', (evt) => SBar.dragEnter( evt ))
	}

	static showColors( evt ){
		let id = evt.target.id
		let nm = id.substring(4)		// clr_nm
		let grp = gVar.varGroups[nm]
		if ( grp==undefined ) return
		SBar.colorGrpNm = nm
		SBar.setColorCheck( grp.color )			// check current group color
		
		let x = evt.target.offsetLeft, y = evt.target.offsetTop
		let gClrs = HUI.gEl('colorSel')
		gClrs.style.left = x+'px'
		gClrs.style.top = y+'px'
		gClrs.hidden = false
	}
	static setColorCheck( clr ){
		let clrchks = document.getElementsByClassName('grpColor')
		for ( let chk of clrchks )
			chk.checked = ( chk.id=='c_'+clr )
	}
	static checkColor( evt ){		// click on colorSel
		HUI.gEl('colorSel').hidden = true

		if ( !evt.target.id.startsWith('c_')) return
		let clr = evt.target.id.substring(2)
		SBar.setGroupColor( SBar.colorGrpNm, clr )
	}
	static setGroupColor( grp, clr ){
		let oldclr = gVar.varGroups[grp].color
		gVar.varGroups[grp].color = clr
		let li = HUI.gEl( 'clr_'+grp )
		li.classList.toggle( 'b_'+oldclr )
		li.classList.toggle( 'b_'+clr )
		li.parentElement.classList.toggle( 'c_'+oldclr )
		li.parentElement.classList.toggle( 'c_'+clr )
	}
	static showGroupColor( grp, active ){
		if (grp=='') return
		let li = HUI.gEl( 'clr_'+grp )
		//if ( li.classList.contains('off') == active ) 
		//	console.log( `chg ${grp}.off to ${active}` )
		HUI.setClass( li, 'off', !active )
	}
	static selectGrp( evt ){
		let grp = evt.currentTarget.id;
		if ( grp.startsWith('lst_')){
			grp = grp.substring(4)
			//console.log( `select grp ${grp}` )
		}
	}
	static dragEnter( evt ){			// enable  group as drop target
		evt.preventDefault();
	}
	static dropOn( evt ){				// drop 'dragVar' onto target group
		evt.stopPropagation(); 
		if ( SBar.dragVar != null ){	// move dragVar to this group
			let dstgrp = evt.target.id;
			let varnd = HUI.gEl( SBar.dragVar );
			//let srcgrp = HUI.gEl(dragVar).parent.id;	// e.g. lst_Defs
			//if ( srcgrp.startsWith('lst_')){
			let gv = varnd.parentNode.removeChild( varnd );
			
			let dstlst = 'lst_' + dstgrp.substr(4);
			HUI.gEl(dstlst).appendChild( gv );
			SBar.dragVar = null;
		}
		return false;
	}
	static addVar( gVr ){	// add <li> for gVr in group 'gVr.grp', then return li
		if ( gVr.nm=='Level' ) return
		let grp = gVr.grp
		SBar.addGrp( grp )

		let lst = HUI.gEl( `lst_${grp}` )
		let varid = `gV_${gVr.nm}`
		let li = document.createElement( 'li' )
		li.id = varid
		li.draggable = true
		if ( gVr.styles.includes('G')) HUI.setClass(li, 'guide', true)
		lst.appendChild( li )
		let num = gVr.def.trim()
		if (gVr.val.typ=='V' && HUI.isNumber( num )){
			let id = `gVv_${gVr.nm}`
			li.innerHTML = `${gVr.nm} <input type=number id=${id} value=${num} min='-10000' max='10000' class='val'>`
			HUI.addListener( id, 'change', (evt) => SBar.changeVar(evt) )
		} else
			li.innerText += `${gVr.nm} (${gVr.val.typ}${gVr.val.typ=='R'? gVr.val.arr.length : ''})`
		HUI.addListener( varid, 'click', (evt) => SBar.selectGVar(evt) )
		HUI.addListener( varid, 'dragstart', (evt) => SBar.startDrag(evt) )
		return li
	}
	static changeVar( evt ){
		let tgt = evt.target
		if ( !tgt.id.startsWith('gVv_')) return
		HUI.gEl('btnSave').disabled = false
		let gvr = gVar.getVar( tgt.id.substring(4) )
		gvr.def = tgt.value
		gvr.eval()
	}
	static getLi( gVrOrNm ){	// => [ li, gVr ]
		let gVr = gVrOrNm
		if ( typeof gVrOrNm == 'string' ) 
			gVr = gVar.getVar( gVrOrNm )
		return [ HUI.gEl( `gV_${gVr.nm}`), gVr ]
	}
	static updateVar( gVrOrNm ){
		let [ li, gVr ] = SBar.getLi( gVrOrNm )
		if ( !li ) return
		if ( !gVr.val.vis )
			li.innerText =`${gVr.nm} (x)`
		else
			li.innerText = `${gVr.nm} (${gVr.val.typ}${gVr.val.typ=='R'? gVr.val.arr.length : ''})`
	}
	static removeVar( gVrOrNm ){
		let [ li, gVr ] = SBar.getLi( gVrOrNm )
		SBar.selVar( gVr.nm, false )
		if ( !li ) return
		li.remove( li )
	}
	static startDrag( evt ){			// start drsgging item to new group
		SBar.dragVar = evt.target.id
	}
	static clearSelVars(){		// deselect all
		for ( let nm of SBar.selVars )
			SBar.selVar( nm, false )		// deselect
		SBar.selVars = []
	}
	static getSelVars( asNms ){			// return copy of selVars  as gVal R.F if 'asNms'
		let res = []
		for (let nm of SBar.selVars) 
			res.push( nm )
		if ( asNms ) 
			res = gVal.toNmArray( res )
		return res
	}
	static gvNm( nm ){
		let [ gvnm, idx ] = gVar.nmIdx( nm )
		return gvnm
	}
	static adjustSelVars( nms, ctrl ){
		if ( !ctrl ) SBar.clearSelVars()
			
		for ( let nm of nms ){
			let gvnm = SBar.gvNm( nm )
			let gV = gVar.getVar( gvnm )
			let sb = HUI.gEl( 'gV_'+gvnm )
			//console.log( `adjSel ${ctrl?'Ctrl':''} ${nm}  sV:[${SBar.selVars}]` )
			
			if ( !gV || !sb ) debugger
			let idx = SBar.selVars.indexOf( gvnm )
			if ( idx >= 0 ){
				if (ctrl){ // remove it
					SBar.selVars.splice( idx, 1 )
					SBar.selVar( nm, false )
				}
			} else if ( gV.val.vis ) {  
				SBar.selVar( nm, true )	// select var
				SBar.selVars.push( nm )
				SBar.loadVar( nm )
			}
		}
		msg( ` Selected: ${SBar.selVars}` )
		SBar.selNms = Geom.expandNms( SBar.selVars )		
		
		gVar.drawAll()
		varSplit.disabled = ( SBar.selVars.length < 2 )
		varIntersect.disabled = ( SBar.selVars.length < 2 )
		varDel.disabled = SBar.selVars.length == 0
	}
	static selectGVar( evt ){		// select/unselect sidebar element 'tgt'
		let id = evt.target.id
		if (!id.startsWith('gV_')) return
		let nm = id.substring(3)
		
		SBar.adjustSelVars( [ nm ], evt.ctrlKey )
	}
	static loadVar( nm ){			// open gVar 'nm' for editing
		let gV = gVar.getVar( nm )
		if (gV == undefined) return
		
		SBar.currGrp = gV.grp
		let varNm = HUI.gEl('varNm'), varNmBox = HUI.gEl('varNmBox')
		varNm.innerText = nm
		varNmBox.value = gV.nm
		varNmBox.hidden = true
		varNm.hidden = false
		
		let varDef = HUI.gEl('varDef'), varDefBox = HUI.gEl('varDefBox');
		varDef.innerText = gV.def;
		varDefBox.value = gV.def;
		varDefBox.hidden = true;
		varDef.hidden = false;

		let varVal = HUI.gEl('varVal'), defType = HUI.gEl('defType'), varSv = HUI.gEl('varSv'),  varDel = HUI.gEl('varDel');
		varVal.innerText = gVar.getVal( nm ).toString() + '  ' + gV.cmt

		if ( HUI.gEl('showDep').checked )
			varVal.innerText += ` {${gV.dependsOn}}`
		defType.innerText = gV.styles.includes('G')? '~=' : '=';
		varSv.disabled = true;
		varDel.disabled = true;
	}
}

module.exports = { SBar }
//const { SBar } 													= require( './sidebar.js' )
