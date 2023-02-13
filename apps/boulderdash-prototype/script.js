let manPos = [10,20] ;
const letters = ['&nbsp;','O','-','+','%','!'] ;
const shapes = ['&nbsp;','⚪','⬜','+','=','!'] ;
const emojis = ['&nbsp;','&#127766;','&#129003;','🏃','🗄','!'] ;
let chars = shapes ;
let [space,rock,dirt,man,boundary,rock2] = [0,1,2,3,4,5] ;
const KEY_RESET = 'Escape' ;
let field = [] ;1

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
          if (Math.random() <0.20){
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
    let row = field[i].map(x => chars[x]) ;
    output.push(row.join(''))
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
  let delta = {ArrowLeft:[0,-1],ArrowUp:[-1,0],ArrowRight:[0,1],ArrowDown:[1,0]}[lastKey] ;
  if (delta){
    let [i,j] = [manPos[0]+delta[0],manPos[1]+delta[1]] ;
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
  }
  if (lastKey=='Digit1'){
    chars=letters ;
  }
  if (lastKey=='Digit2'){
    chars=shapes ;
  }
  if (lastKey=='Digit3'){
    chars=emojis ;
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
  lastKey = event.code;
};
