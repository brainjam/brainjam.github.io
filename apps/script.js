let manPos = [10,20] ;
let [space,rock,dirt,man,boundary,rock2] = ['&nbsp;','⚪','⬜','+','=','!'] ;
    //[space,rock,dirt,man,boundary,rock2] = ['&nbsp;','&#127766;','&#129003;','+','=','!'] ;
const [KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT,KEY_RESET] = [38,40,37,39,27] ;
let field = [] ;
//document.getElementById('help').focus() ;

function reset() {
  debugger ;
  field = [] ;
  for (let i=0; i<22; i++){
    let row = Array(40).fill(dirt) ;
    row[0]=boundary ;
    row[39]= boundary  ;
    if (i==0 || i===21){
      row=Array(40).fill(boundary) ;
    } else {
        for(let j=1; j<38; j++){
          if (Math.random() <0.35){
            row[j] = space ;
          } 
          if (Math.random() <0.10){
            row[j] = rock ;
          } 
        }
    }
    field.push(row) ;
  }
  field[manPos[0]][manPos[1]]=man ;  
}

//render() ;

function render() {
  debugger ;
  let output = [] ;
  for (let i=0; i<22; i++){
    output.push(field[i].join(''))
  }
  let fieldEl = document.getElementById('field') ;
  fieldEl.innerHTML = output.join('<br>') ;
}

let count = 0 ;

function processCell (i,j){
  if (field[i][j]==rock){
    if (field[i+1][j]==space){
      field[i][j] = space ;
      field[i+1][j]=rock2 ;
      return ;
    }
    if (field[i+1][j+1]==space && field[i][j+1]==space && field[i+1][j]==rock){
      field[i][j] = space ;
      field[i][j+1]=rock2 ;
      return ;
    }
    if (field[i+1][j-1]==space && field[i][j-1]==space && field[i+1][j]==rock){
      field[i][j] = space ;
      field[i][j-1]=rock2 ;
      return ;
    }
  }  
}

function processMan(){
  //console.log(`lastKey=${lastKey}`) ;
  //lastKey=37 ;
  //return ;
  let delta = [[0,-1],[-1,0],[0,1],[1,0]][lastKey-37] ;
  debugger ;
  if (delta){
    //console.log (`move ${delta}`) ;
    //debugger ;
    let [i,j] = [manPos[0]+delta[0],manPos[1]+delta[1]] ;
    //console.log(`manPos ${manPos}`)
    //console.log(`move to ${[i,j]}`)
    if(field[i][j]==space || field[i][j]==dirt){
      field[i][j] = man ;
      field[manPos[0]][manPos[1]]=space ;
      manPos=[i,j] ; 
    }
  }
  lastKey=0 ;
}

function step1(){
  debugger ;
  if (lastKey==KEY_RESET){
    reset() ;
    lastKey = 0 ;
    return ;
  }
  processMan() ;
  for(let i=1; i<21; i++){
    for(let j=1; j<38; j++){
      processCell(i,j) ;
    }
  }  
}

function step2(){
  for(let i=1; i<21; i++){
    for(let j=1; j<38; j++){
      if (field[i][j]==rock2){
        field[i][j] = rock ;
      }
    }
  }  
}

function step() {
  window.requestAnimationFrame(step);
  count++ ;
  if (count%14 == 0){
    step1() ;
    step2() ;
    render() ;
  }
}

window.requestAnimationFrame(step);


function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

let lastKey=KEY_RESET ;
document.onkeydown = function(event) {
  var key = event.keyCode;
  lastKey = key ;
  //console.log(`key=${key}`)  //ESC is 27
  
};

// prevent window scrolling when arrow keys are pressed
window.addEventListener("keydown", function(e) {
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);