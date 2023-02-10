
const { ipcRenderer } = require( 'electron' );

function msg( s, append ){
  let info = document.getElementById( 'status' );
  info.innerHTML = append? info.innerHTML + s : s;
}
function err( s ){
  console.log( s );  
  let opts = {
    title: 'Emuse error:  debug?', 
    detail: s,
    type: 'error',
    buttons: [ 'cancel', 'debug' ],
    defaultId: 0
  };
  if ( ipcRenderer.sendSync('message', opts )) debugger;
}
function question( s, detail ){
  let opts = {
    title: s, 
    type: 'question',
    icon: 'none',
    buttons: [ 'no', 'yes' ], 
    defaultId: 0,
    detail: detail
  };
  let ans = ipcRenderer.sendSync('message', opts );
  return ans==1;
}
function statusMsg( s ){
  let stat = document.getElementById( 'info' );
  stat.innerText = s;
}
function nameChord( s ){
  let stat = document.getElementById( 'chordName' );
  stat.innerText = s;
}

module.exports = { msg, statusMsg, nameChord, err, question }; 
// const { msg, statusMsg, nameChord, err, question } = require("./renderer.js");

