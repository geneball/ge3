// tokens.js 

function pushTok( splst, tk ){  // for splitStr: push next token onto result
   if ( splst.cur != '' ){
	   splst.res.push( splst.cur );		// push prev token, if not already
	   splst.cur = '';
   }
   if ( tk != undefined )
   splst.res.push( tk );
}
function isDigits( splst ){
    const digits = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.' ]
	let ln = splst.cur.length
	if ( ln==0 ) return false;
	for (let ch of splst.cur.split(''))
		if ( !digits.includes( ch ) ) return false
	return true
}
function splitTokens( s ){	// '[0,0]-:[5,5]*4:-[15:5]' => [ '[','0',',','0',']','-:','[', ... '*','4',':-','[','15','5',']' ]
  const op2fch = [ '-', '=', '>', '<', '|', '&' ]
  const op2s = [ '--', '==', '>=', '<=', '||', '&&', '<<' ]
  const delims = [ '[', ']', ',', ':', '(', ')', '+', '-', '*', '/', '@', '|', '&', '^', '%', '$', '#', '!', '<', '>', '?' ]
  const digits = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.' ]
  let splst =  { res: [], cur: '' };
  for (let i=0; i<s.length; i++){
	  let c = s.substr(i,1);
	  if ( op2fch.includes( c )){	// check for 2 char ops
		  let c2 = s.substr(i, 2);
		  if ( op2s.includes( c2 )){
			  pushTok( splst, c2 );
			  i++;
			  continue;
		  }
	  } 
	  if ( delims.includes( c ))	// found delim, push it
		pushTok( splst, c );
	  else if ( c == ' ' )  // space -- save any partial token
		pushTok( splst );
	  else if ( c == '.' && !isDigits( splst )) // . is delim if not part of a Number
	    pushTok( splst, c )
	  else
		splst.cur += c;
  }
  pushTok( splst );	// save last token
  return splst.res;
}

module.exports = { splitTokens }; 
// const { splitTokens } 									= require( './tokens.js' );
 