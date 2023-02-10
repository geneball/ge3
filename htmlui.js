
// htmlui.js
var moment = require('moment'); // require

class HUI {
	static gEl( nm ){
		let el = document.getElementById( nm );
		if ( el==undefined ) debugger;
		return el;
	}
	static addListener( elId, evttype, fn ){		// add listener to 'el' for 'evtype', that calls 'fn'
		let el = HUI.gEl( elId );
		el.addEventListener( evttype, fn );
	}
	static toggleAllCarets( ){	// expand/collapse 'grp_All' and all other .caret elements correspondingly
		
		let grps = document.getElementsByClassName("caret");
		let grpAll = HUI.gEl( 'grp_All' );
		grpAll.classList.toggle("caret-down");
		let down = grpAll.classList.contains("caret-down");
		for ( let el of grps ){
			if (el != grpAll){
				let grp = el.parentElement.querySelector('.nested');
				if (down){
					if (!el.classList.contains('caret-down')) el.classList.add('caret-down');
					if (!grp.classList.contains("active")) grp.classList.add("active");
				} else {
					if (el.classList.contains("caret-down")) el.classList.remove("caret-down");
					if (grp.classList.contains("active")) grp.classList.remove("active");
				}
			}
		}
	}
	static toggleList( evt ){		// expand/collapse 'evt.tgt'
		let el = evt.target;
		if ( !el || !el.classList.contains('caret') ) debugger;
		
		el.parentElement.querySelector(".nested").classList.toggle("active");
		el.classList.toggle("caret-down");
	}
	static newEl( tag, id, cls, txt ){
		if ( tag==undefined ) tag = 'div';
		if ( id==undefined ) id = '';
		if ( cls==undefined ) cls = '';
		if ( txt==undefined ) txt = '';
		
		let el = document.createElement( tag );
		if ( id  != '' ) el.id = id;
		if ( cls != '' ) el.className = cls;
		el.innerText = txt;
		return el;
	}
	static newSel( id, nms, selected ){
		let sel = newEl('select', id )
		for ( let opt of nms ){
			let nopt = newOpt( opt )
			if (opt==selected) nopt.selected = true
			sel.appendChild( nopt )
		}
		return sel
	}
	static newOpt( nm ){
		let opt = newEl('option', '', '', nm )
		opt.value = nm
		return opt
	}
	static setClass( el, cls, enable ){		// 'enable'/disable class 'cls' of element 'el'
		if ( el.classList.contains( cls )){
			if (!enable) el.classList.remove( cls );
		} else {
			if (enable) el.classList.add( cls );
		}
	}
	static toggleSel( el ){					// toggle class 'sel' of element 'el'
		el.classList.toggle("sel");
	}
	static loadSelect( sel, nms ){			// load array of 'nms' into html select 'sel'
	  if ( sel==null )  debugger;
	  if ( !nms instanceof Array ) debugger;
	   var i, L = sel.options.length - 1;
	   for(i = L; i >= 0; i--) {
		  sel.remove(i);
	   }
	   for (var nm of nms){
		var opt = document.createElement('option');
		opt.value = opt.innerHTML = nm;
		sel.appendChild(opt);  
	   }
	   sel.selectedIndex = 0;
	}
	static setExt( fnm, ext ){		// => filename with extension
		fnm = HUI.baseNm( fnm );
		return fnm + ext;
	}
	static baseNm( fnm ){				// => filename without extension
		let idx = fnm.indexOf('.');
		if (idx >= 0) fnm = fnm.substring(0,idx);
		return fnm;
	}
	static isName( tk ){				// => T, if identifier
		let res = tk.match(/^\w+[\d\w]*$/i)
		return res != null
	}	
	static isNumber( tk ){				// => T, if number
		let res = tk.match(/^-*\d*\.?\d+$/i) 
		return res != null
	}
	static getDate(){
		return moment().format('D-MMM-YY H:mm')
	}
	static S( v ){ // value as string of up to 4 digits
	  let s = v.toString(), dot = s.indexOf('.')
	  if (dot==1 && s.substring(0,1)=='0') s = s.substring(1)
	  return dot<0? s : s.substring(0,4)
	}
}

module.exports = { HUI }
// const { HUI }													= require( './htmlui.js' );
